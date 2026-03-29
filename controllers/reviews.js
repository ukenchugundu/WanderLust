const Listing = require('../models/listings');
const Review = require('../models/reviews');
const ExpressError = require('../utils/ExpressError');

module.exports.createReview = async (req, res) => {
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
};

module.exports.deleteReview = async (req, res) => {
  const { id, reviewId } = req.params;

  await Listing.findByIdAndUpdate(id, {
    $pull: { reviews: reviewId },
  });
  await Review.findByIdAndDelete(reviewId);

  req.flash('success', 'Review deleted successfully.');
  res.redirect(`/listings/${id}`);
};
