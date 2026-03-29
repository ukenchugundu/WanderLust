const express = require('express');
const router = express.Router({ mergeParams: true });
const wrapAsync = require('../utils/WrapAsync');
const ExpressError = require('../utils/ExpressError');
const { reviewSchema } = require('../schema');
const { isLoggedIn, isReviewAuthor } = require('../middleware');
const reviewController = require('../controllers/reviews');

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
  wrapAsync(reviewController.createReview)
);

router.delete(
  '/:reviewId',
  isLoggedIn,
  isReviewAuthor,
  wrapAsync(reviewController.deleteReview)
);

module.exports = router;
