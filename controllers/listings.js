const mongoose = require('mongoose');
const Listing = require('../models/listings');
const ExpressError = require('../utils/ExpressError');
const { cloudinary } = require('../cloudConfig');

const defaultImageUrl =
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRI69IS84PGeSJDInvyhd8IPU8_1v3iQU0DeA&s';

module.exports.index = async (req, res) => {
  const alllistings = await Listing.find({});
  res.render('./listings/index.ejs', { alllistings });
};

module.exports.renderNewForm = (req, res) => {
  res.render('./listings/new.ejs');
};

module.exports.showListing = async (req, res) => {
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
};

module.exports.createListing = async (req, res) => {
  const { title, description, price, location, country, latitude, longitude, mapDisplayName } = req.body;
  const uploadedImage = req.file
    ? {
        url: req.file.path,
        filename: req.file.filename,
      }
    : {
        url: defaultImageUrl,
      };

  const newListing = new Listing({
    title,
    description,
    price,
    location,
    country,
    owner: req.user._id,
    image: uploadedImage,
  });

  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);

  if (Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude)) {
    newListing.geometry = {
      type: 'Point',
      coordinates: [parsedLongitude, parsedLatitude],
    };
  }

  if (typeof mapDisplayName === 'string' && mapDisplayName.trim()) {
    newListing.mapDisplayName = mapDisplayName.trim();
  }

  await newListing.save();
  req.flash('success', 'Listing created successfully.');
  res.redirect('/listings');
};

module.exports.renderEditForm = async (req, res) => {
  const foundListing = res.locals.listing;
  res.render('./listings/edit.ejs', { listing: foundListing });
};

module.exports.updateListing = async (req, res) => {
  const { id } = req.params;
  const { title, description, price, location, country, latitude, longitude, mapDisplayName } = req.body;
  const updatedListing = {
    title,
    description,
    price,
    location,
    country,
  };

  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);

  if (Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude)) {
    updatedListing.geometry = {
      type: 'Point',
      coordinates: [parsedLongitude, parsedLatitude],
    };
  } else {
    updatedListing.geometry = undefined;
  }

  updatedListing.mapDisplayName =
    typeof mapDisplayName === 'string' && mapDisplayName.trim()
      ? mapDisplayName.trim()
      : undefined;

  const updated = await Listing.findByIdAndUpdate(id, updatedListing, {
    runValidators: true,
    returnDocument: 'after',
  });

  if (!updated) {
    throw new ExpressError('Listing not found', 404);
  }

  if (req.file) {
    if (
      updated.image &&
      updated.image.filename &&
      updated.image.filename !== 'listingimage'
    ) {
      await cloudinary.uploader.destroy(updated.image.filename);
    }

    updated.image = {
      url: req.file.path,
      filename: req.file.filename,
    };
    await updated.save();
  }

  req.flash('success', 'Listing updated successfully.');
  res.redirect(`/listings/${id}`);
};

module.exports.deleteListing = async (req, res) => {
  const { id } = req.params;
  const deletedListing = await Listing.findByIdAndDelete(id);

  if (!deletedListing) {
    throw new ExpressError('Listing not found', 404);
  }

  req.flash('success', 'Listing deleted successfully.');
  res.redirect('/listings');
};
