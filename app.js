const express = require('express');
const app = express();
const mongoose = require('mongoose');
const listing = require('./models/listings');
const path = require('path');
const methodoverride = require('method-override');
const ejs = require('ejs-mate');
const Review = require('./models/reviews');
const wrapAsync = require('./utils/WrapAsync');
const ExpressError = require('./utils/ExpressError');
const { listingSchema , reviewSchema } = require('./schema');

const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/Wanderlust';
const port = process.env.PORT || 3000;
const defaultImageUrl = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRI69IS84PGeSJDInvyhd8IPU8_1v3iQU0DeA&s';

const validateListing = (req, res, next) => {
  const { error } = listingSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const errorDetails = error.details.map((detail) => detail.message);
    return next(new ExpressError('Validation failed', 400, errorDetails));
  }

  next();
};

const validateReview = (req, res, next) => {
  const { error } = reviewSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const errorDetails = error.details.map((detail) => detail.message);
    return next(new ExpressError('Validation failed', 400, errorDetails));
  }

  next();
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
app.get('/', (req,res) => {
  res.send("Hello World");
});


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({extended : true}));
app.use(methodoverride('_method'));
app.engine('ejs', ejs);

// Index Route
app.get('/listings', wrapAsync(async (req,res) => {
  const alllistings = await listing.find({})
  res.render("./listings/index.ejs", {alllistings});
}));

// New Listing Route
app.get('/listings/new', (req,res) => {
  res.render("./listings/new.ejs");
})

// Show Route 
app.get('/listings/:id', wrapAsync(async (req,res) =>{
   let {id} = req.params;
    if (!mongoose.isValidObjectId(id)) {
      throw new ExpressError('Listing not found', 404);
    }
    const foundListing = await listing.findById(id).populate('reviews');
    if (!foundListing) {
      throw new ExpressError('Listing not found', 404);
    }
    res.render("./listings/show.ejs", {listing: foundListing});
}));

// Create route
app.get('/listing/:id', (req,res) => {
  let {id} = req.params;
  res.redirect(`/listings/${id}`);
})

// Create Listing Route
app.post('/listings', validateListing,
   wrapAsync(async (req,res) => {
   let {title, description, price, location, country, image} = req.body;
  let newListingData = {
    title,
    description,
    price,
    location,
    country,
    image: {
      url: image && image.trim() ? image.trim() : defaultImageUrl,
    },
  };

  let newListing = new listing(newListingData);
  // console.log(newListing);
  await newListing.save();
  res.redirect('/listings');
}));

// Edit Route
app.get('/listings/:id/edit', wrapAsync(async (req, res) => {
  let { id } = req.params;
  const foundListing = await listing.findById(id);
  if (!foundListing) {
    throw new ExpressError('Listing not found', 404);
  }
  res.render('./listings/edit.ejs', { listing: foundListing });
}));
// Update Route
app.put('/listings/:id', validateListing, wrapAsync(async (req, res) => {
  let { id } = req.params;
  let { title, description, price, location, country, image } = req.body;
  let updatedListing = {
    title,
    description,
    price,
    location,
    country,
    image: {
      url: image && image.trim() ? image.trim() : defaultImageUrl,
    },
  };

  let updated = await listing.findByIdAndUpdate(id, updatedListing, {
    runValidators: true,
    new: true,
  });
  if (!updated) {
    throw new ExpressError('Listing not found', 404);
  }
  res.redirect(`/listings/${id}`);
}));

//Delete Route
app.delete('/listings/:id', wrapAsync(async (req, res) => {
  let { id } = req.params;
  let deletedListing = await listing.findByIdAndDelete(id);
  if (!deletedListing) {
    throw new ExpressError('Listing not found', 404);
  }
  console.log(`Deleted listing ${deletedListing}`);
  res.redirect('/listings');
}));


// Reviews Route
app.post('/listings/:id/reviews',validateReview, wrapAsync(async (req, res) => {
  let { id } = req.params;
  let { comment, rating } = req.body.review;
  let newReview = new Review({ comment, rating });
  await newReview.save();
  let foundListing = await listing.findById(id);
  if (!foundListing) {
    throw new ExpressError('Listing not found', 404);
  }
  foundListing.reviews.push(newReview);
  await foundListing.save();
  res.redirect(`/listings/${id}`);
}));

app.delete('/listings/:id/reviews/:reviewId', wrapAsync(async (req, res) => {
  let { id, reviewId } = req.params;

  await listing.findByIdAndUpdate(id, {
    $pull: { reviews: reviewId },
  });
  await Review.findByIdAndDelete(reviewId);

  res.redirect(`/listings/${id}`);
}));


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
