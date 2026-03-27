const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Listing = require('../models/listings');
const wrapAsync = require('../utils/WrapAsync');
const ExpressError = require('../utils/ExpressError');
const { listingSchema } = require('../schema');
const { isLoggedIn, isListingOwner } = require('../middleware');

const defaultImageUrl = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRI69IS84PGeSJDInvyhd8IPU8_1v3iQU0DeA&s';

const validateListing = (req, res, next) => {
  const { error } = listingSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const errorDetails = error.details.map((detail) => detail.message);
    return next(new ExpressError('Validation failed', 400, errorDetails));
  }

  next();
};

router.get(
  '/',
  wrapAsync(async (req, res) => {
    const alllistings = await Listing.find({});
    res.render('./listings/index.ejs', { alllistings });
  })
);

router.get('/new', isLoggedIn, (req, res) => {
  res.render('./listings/new.ejs');
});

router.get(
  '/:id',
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      throw new ExpressError('Listing not found', 404);
    }

    const foundListing = await Listing.findById(id)
      .populate('owner')
      .populate({
        path: 'reviews',
        populate: {
          path: 'author',
        },
      });
    if (!foundListing) {
      throw new ExpressError('Listing not found', 404);
    }

    res.render('./listings/show.ejs', { listing: foundListing });
  })
);

router.post(
  '/',
  isLoggedIn,
  validateListing,
  wrapAsync(async (req, res) => {
    const { title, description, price, location, country, image } = req.body;
    const newListing = new Listing({
      title,
      description,
      price,
      location,
      country,
      owner: req.user._id,
      image: {
        url: image && image.trim() ? image.trim() : defaultImageUrl,
      },
    });

    await newListing.save();
    req.flash('success', 'Listing created successfully.');
    res.redirect('/listings');
  })
);

router.get(
  '/:id/edit',
  isLoggedIn,
  isListingOwner,
  wrapAsync(async (req, res) => {
    const foundListing = res.locals.listing;
    res.render('./listings/edit.ejs', { listing: foundListing });
  })
);

router.put(
  '/:id',
  isLoggedIn,
  isListingOwner,
  validateListing,
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const { title, description, price, location, country, image } = req.body;
    const updatedListing = {
      title,
      description,
      price,
      location,
      country,
      image: {
        url: image && image.trim() ? image.trim() : defaultImageUrl,
      },
    };

    const updated = await Listing.findByIdAndUpdate(id, updatedListing, {
      runValidators: true,
      returnDocument: 'after',
    });
    if (!updated) {
      throw new ExpressError('Listing not found', 404);
    }

    req.flash('success', 'Listing updated successfully.');
    res.redirect(`/listings/${id}`);
  })
);

router.delete(
  '/:id',
  isLoggedIn,
  isListingOwner,
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const deletedListing = await Listing.findByIdAndDelete(id);
    if (!deletedListing) {
      throw new ExpressError('Listing not found', 404);
    }

    req.flash('success', 'Listing deleted successfully.');
    res.redirect('/listings');
  })
);

module.exports = router;

  
