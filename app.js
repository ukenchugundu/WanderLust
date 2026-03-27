const express = require('express');
const app = express();
const mongoose = require('mongoose');
const listing = require('./models/listings');
const path = require('path');
const methodoverride = require('method-override');
const ejs = require('ejs-mate');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const wrapAsync = require('./utils/WrapAsync');
const ExpressError = require('./utils/ExpressError');
const User = require('./models/user');
const listingRouter = require('./routes/listing');
const reviewRouter = require('./routes/review');
const userRouter = require('./routes/user');

const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/Wanderlust';
const port = process.env.PORT || 3000;
const sessionSecret = process.env.SESSION_SECRET || 'devsecret123';

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

async function main() {
  await mongoose.connect(mongoUrl);
  console.log('Connected to MongoDB');

  app.listen(port,() => {
    console.log(`Server is running on port ${port}`);
  });
}

main().catch((err) => {
  console.error(`Error connecting to MongoDB at ${mongoUrl}`);
  console.error('Start MongoDB locally or set the MONGO_URL environment variable.');
  console.error(err.message);
  process.exit(1);
});

app.get('/testlistenings', wrapAsync(async(req,res) => {
  const samplelisting = new listing ({
    title : "Beautiful Beach House",
    description : "A stunning beach house with breathtaking ocean views, perfect for a relaxing getaway.",
    // image : "https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-4.0.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&q=80",
    price : 500,
    Location : "Malibu",
    Country : "USA",
  });
  await samplelisting.save();
  console.log("Sample listing saved to database");
  res.send("Sample listing saved to database");
}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({extended : true}));
app.use(methodoverride('_method'));
app.engine('ejs', ejs);
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));
app.use(flash());
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
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
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
  let { statusCode = 500, message = "Something went wrong!" } = err;
  let { errorDetails = [] } = err;

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

  res.status(statusCode).render('error.ejs', { message, errorDetails });
});
