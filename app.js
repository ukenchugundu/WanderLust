require('dotenv').config({ quiet: true });

const express = require('express');
const app = express();
const mongoose = require('mongoose');
const path = require('path');
const methodoverride = require('method-override');
const ejs = require('ejs-mate');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const wrapAsync = require('./utils/WrapAsync');
const ExpressError = require('./utils/ExpressError');
const User = require('./models/user');
const listingRouter = require('./routes/listing');
const reviewRouter = require('./routes/review');
const userRouter = require('./routes/user');

const stripWrappingQuotes = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();
  const hasMatchingDoubleQuotes =
    trimmedValue.startsWith('"') && trimmedValue.endsWith('"');
  const hasMatchingSingleQuotes =
    trimmedValue.startsWith("'") && trimmedValue.endsWith("'");

  if (hasMatchingDoubleQuotes || hasMatchingSingleQuotes) {
    return trimmedValue.slice(1, -1);
  }

  return trimmedValue;
};

const mongoUrl = stripWrappingQuotes(process.env.MONGO_URL || process.env.MONGO_URI);
const port = process.env.PORT || 3000;
const sessionSecret = stripWrappingQuotes(process.env.SESSION_SECRET) || 'devsecret123';

const sanitizeMongoUrl = (url = '') => {
  try {
    return url.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
  } catch {
    return '[invalid MongoDB URL]';
  }
};

const isMongoServerSelectionError = (err) => {
  return (
    err?.name === 'MongooseServerSelectionError' ||
    err?.name === 'MongoServerSelectionError'
  );
};

const ensureDatabaseName = (url) => {
  if (!url) {
    return url;
  }

  try {
    const parsed = new URL(url);
    if (!parsed.pathname || parsed.pathname === '/') {
      parsed.pathname = '/Wanderlust';
    }
    return parsed.toString();
  } catch {
    return url;
  }
};

const resolvedMongoUrl = ensureDatabaseName(mongoUrl);

const parseCookies = (cookieHeader = '') => {
  return cookieHeader
    .split(';')
    .filter(Boolean)
    .reduce((cookies, pair) => {
      const separatorIndex = pair.indexOf('=');
      if (separatorIndex === -1) {
        return cookies;
      }

      const key = pair.slice(0, separatorIndex).trim();
      const value = pair.slice(separatorIndex + 1).trim();
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
};

const normalizeFlashMessages = (flashMessages) => {
  if (!flashMessages || typeof flashMessages !== 'object' || Array.isArray(flashMessages)) {
    return {};
  }

  return Object.entries(flashMessages).reduce((sanitizedFlash, [type, messages]) => {
    if (Array.isArray(messages)) {
      const validMessages = messages.filter((message) => message != null);
      if (validMessages.length > 0) {
        sanitizedFlash[type] = validMessages;
      }
      return sanitizedFlash;
    }

    if (messages != null) {
      sanitizedFlash[type] = [messages];
    }

    return sanitizedFlash;
  }, {});
};

async function main() {
  const isAtlas = resolvedMongoUrl.startsWith('mongodb+srv://');
  const options = isAtlas ? {
    tls: true,
    tlsAllowInvalidCertificates: false,
    tlsAllowInvalidHostnames: false,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    bufferCommands: false,
  } : {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    bufferCommands: false,
  };
  await mongoose.connect(resolvedMongoUrl, options);
  console.log('Connected to MongoDB');

  app.listen(port,() => {
    console.log(`Server is running on port ${port}`);
  });
}

if (!mongoUrl) {
  console.error('Missing MongoDB connection string.');
  console.error('Set the MONGO_URL or MONGO_URI environment variable to your MongoDB Atlas connection string.');
  process.exit(1);
}

main().catch((err) => {
  console.error(`Error connecting to MongoDB at ${sanitizeMongoUrl(resolvedMongoUrl)}`);

  if (isMongoServerSelectionError(err)) {
    console.error('Could not reach your MongoDB Atlas cluster.');
    console.error('If you are using Atlas, add your current IP address to Network Access and confirm the database user/password are correct.');
  } else {
    console.error('Check that MONGO_URL or MONGO_URI contains a valid MongoDB connection string.');
  }

  console.error(err.message);
  process.exit(1);
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({extended : true}));
app.use(methodoverride('_method'));
app.engine('ejs', ejs);
const sessionStore = MongoStore.create({
  mongoUrl: resolvedMongoUrl,
  collectionName: 'sessions_v2',
  touchAfter: 24 * 3600,
  stringify: false,
});

sessionStore.on('error', (err) => {
  console.error('Session store error:', err?.stack || err?.message || err);
});

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));

app.use((req, res, next) => {
  if (!req.session) {
    next();
    return;
  }

  if (req.session.flashMessages !== undefined) {
    req.session.flashMessages = normalizeFlashMessages(req.session.flashMessages);
  }

  next();
});
app.use((req, res, next) => {
  req.flash = (type, message) => {
    if (!req.session) {
      return typeof type === 'undefined' ? {} : [];
    }

    const currentFlash = normalizeFlashMessages(req.session.flashMessages);

    if (typeof type === 'undefined') {
      req.session.flashMessages = {};
      return currentFlash;
    }

    if (typeof message !== 'undefined') {
      const nextMessages = Array.isArray(message) ? message : [message];
      const bucket = Array.isArray(currentFlash[type]) ? currentFlash[type] : [];
      currentFlash[type] = bucket.concat(nextMessages.filter((entry) => entry != null));
      req.session.flashMessages = currentFlash;
      return currentFlash[type].length;
    }

    const messages = Array.isArray(currentFlash[type]) ? currentFlash[type] : [];
    delete currentFlash[type];
    req.session.flashMessages = currentFlash;
    return messages;
  };

  next();
});
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use((req, res, next) => {
  req.cookies = parseCookies(req.headers.cookie);
  next();
});
app.use((req, res, next) => {
  const successMessages = req.flash('success');
  const errorMessages = req.flash('error');

  res.locals.success = Array.isArray(successMessages)
    ? successMessages
    : successMessages
      ? [successMessages]
      : [];
  res.locals.error = Array.isArray(errorMessages)
    ? errorMessages
    : errorMessages
      ? [errorMessages]
      : [];
  res.locals.currUser = req.user;
  next();
});

app.use('/listings', listingRouter);
app.use('/listings/:id/reviews', reviewRouter);
app.use('/', userRouter);

app.get('/', (req,res) => {
  res.render('home.ejs');
});
app.get('/listing/:id', (req,res) => {
  let {id} = req.params;
  res.redirect(`/listings/${id}`);
});

app.get('/set-cookie', (req, res) => {
  res.cookie('username', 'uday', {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
  });
  res.redirect('/get-cookies');
});

app.get('/get-cookies', (req, res) => {
  console.log('Cookies:', req.cookies);
  res.render('cookies.ejs', { cookies: req.cookies });
});

app.get('/set-session', (req, res) => {
  req.session.username = 'uday';
  req.session.pageViews = (req.session.pageViews || 0) + 1;
  res.redirect('/get-session');
});

app.get('/get-session', (req, res) => {
  console.log('Session:', req.session);
  res.render('session.ejs', { sessionData: req.session });
});

app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});


app.all('/{*splat}', (req, res, next) => {
  next(new ExpressError('Page not found', 404));
});



// Custom middleware for handling errors must come after routes.
app.use((err, req, res, next) => {
  // Prevent multiple error responses
  if (res.headersSent) {
    console.error(
      `Headers already sent for ${req.method} ${req.originalUrl}, cannot send error response:`,
      err?.stack || err?.message || err
    );
    return;
  }

  console.error(
    `Unhandled error during ${req.method} ${req.originalUrl}:`,
    err?.stack || err?.message || err
  );

  let { statusCode = 500, message = "Something went wrong!" } = err || {};
  let { errorDetails = [] } = err;

  // Ensure errorDetails is always an array
  if (!Array.isArray(errorDetails)) {
    errorDetails = errorDetails ? [errorDetails] : [];
  }

  if (err.name === 'MulterError') {
    statusCode = 400;
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Image must be 5MB or smaller.'
        : err.message;
  }

  if (err.name === 'ValidationError' && errorDetails.length === 0) {
    statusCode = 400;
    message = "Validation failed";
    errorDetails = Object.values(err.errors).map((validationError) => {
      if (validationError.name === 'CastError' && validationError.path === 'price') {
        return "Price must be a valid number";
      }
      return validationError.message;
    });
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = err.path === 'price' ? "Price must be a valid number" : `Invalid value for ${err.path}`;
  }

  if (
    !message &&
    typeof err.message === 'string' &&
    err.message.includes('cloud_name')
  ) {
    message = 'Cloudinary cloud name is invalid. Update your .env with the real Cloudinary cloud name.';
  }

  console.error('Error:', err.message);
  res.status(statusCode).render('error.ejs', { message, errorDetails });
});
