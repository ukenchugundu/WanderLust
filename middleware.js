const Listing = require('./models/listings');
const Review = require('./models/reviews');
const ExpressError = require('./utils/ExpressError');

module.exports.saveRedirectUrl = (req, res, next) => {
  if (req.session.redirectUrl) {
    res.locals.redirectUrl = req.session.redirectUrl;
  }
  next();
};

module.exports.isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.redirectUrl = req.originalUrl;
    req.flash('error', 'You must be logged in to do that.');
    return res.redirect('/login');
  }
  next();
};

module.exports.isListingOwner = async (req, res, next) => {
  const { id } = req.params;
  const foundListing = await Listing.findById(id);

  if (!foundListing) {
    throw new ExpressError('Listing not found', 404);
  }

  if (!foundListing.owner || !foundListing.owner.equals(req.user._id)) {
    req.flash('error', 'You do not have permission to do that.');
    return res.redirect(`/listings/${id}`);
  }

  res.locals.listing = foundListing;
  next();
};

module.exports.isReviewAuthor = async (req, res, next) => {
  const { id, reviewId } = req.params;
  const foundReview = await Review.findById(reviewId);

  if (!foundReview) {
    throw new ExpressError('Review not found', 404);
  }

  if (!foundReview.author || !foundReview.author.equals(req.user._id)) {
    req.flash('error', 'You do not have permission to do that.');
    return res.redirect(`/listings/${id}`);
  }

  res.locals.review = foundReview;
  next();
};
