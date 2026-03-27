const express = require('express');
const router = express.Router({ mergeParams: true });
const Listing = require('../models/listings');
const Review = require('../models/reviews');
const wrapAsync = require('../utils/WrapAsync');
const ExpressError = require('../utils/ExpressError');
const { reviewSchema } = require('../schema');
const { isLoggedIn, isReviewAuthor } = require('../middleware');

const validateReview = (req, res, next) => {
  const { error } = reviewSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const errorDetails = error.details.map((detail) => detail.message);
    return next(new ExpressError('Validation failed', 400, errorDetails));
  }

  next();
};

router.post(
  '/',
  isLoggedIn,
  validateReview,
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const { comment, rating } = req.body.review;

    const foundListing = await Listing.findById(id);
    if (!foundListing) {
      throw new ExpressError('Listing not found', 404);
    }

    const newReview = new Review({ comment, rating, author: req.user._id });
    await newReview.save();

    foundListing.reviews.push(newReview);
    await foundListing.save();

    req.flash('success', 'Review added successfully.');
    res.redirect(`/listings/${id}`);
  })
);

router.delete(
  '/:reviewId',
  isLoggedIn,
  isReviewAuthor,
  wrapAsync(async (req, res) => {
    const { id, reviewId } = req.params;

    await Listing.findByIdAndUpdate(id, {
      $pull: { reviews: reviewId },
    });
    await Review.findByIdAndDelete(reviewId);

    req.flash('success', 'Review deleted successfully.');
    res.redirect(`/listings/${id}`);
  })
);

module.exports = router;
