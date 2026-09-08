const mongoose = require('mongoose');
const Listing = require('../models/listings');
const ExpressError = require('../utils/ExpressError');
const { cloudinary } = require('../cloudConfig');

const defaultImageUrl =
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRI69IS84PGeSJDInvyhd8IPU8_1v3iQU0DeA&s';

module.exports.index = async (req, res) => {
  const searchTerm = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const pageSize = 9;
  const minPrice = Number(req.query.minPrice);
  const maxPrice = Number(req.query.maxPrice);
  const filters = {};

  if (searchTerm) {
    filters.$or = [
      { title: { $regex: searchTerm, $options: 'i' } },
      { location: { $regex: searchTerm, $options: 'i' } },
      { country: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { mapDisplayName: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  if (Number.isFinite(minPrice) && minPrice >= 0) {
    filters.price = { ...(filters.price || {}), $gte: minPrice };
  }
  if (Number.isFinite(maxPrice) && maxPrice >= 0) {
    filters.price = { ...(filters.price || {}), $lte: maxPrice };
  }

  const [alllistings, totalListings] = await Promise.all([
    Listing.find(filters).sort({ _id: -1 }).skip((page - 1) * pageSize).limit(pageSize),
    Listing.countDocuments(filters),
  ]);
  const totalPages = Math.max(Math.ceil(totalListings / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  res.render('./listings/index.ejs', {
    alllistings,
    searchTerm,
    minPrice: req.query.minPrice || '',
    maxPrice: req.query.maxPrice || '',
    page: currentPage,
    totalPages,
    totalListings,
  });
};

module.exports.renderNewForm = (req, res) => {
  res.render('./listings/new.ejs');
};

module.exports.showListing = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    throw new ExpressError('Listing not found', 404);
  }

  const foundListing = await Listing.findOne({
    _id: id,
  })
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
  const { title, description, price, location, country, latitude, longitude, mapDisplayName, imageUrl } = req.body;
  const uploadedImage = req.file
    ? {
        url: req.file.path,
        filename: req.file.filename,
      }
    : {
        url: typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : defaultImageUrl,
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
  if (!res.headersSent) {
    res.redirect('/listings');
  }
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
  if (!res.headersSent) {
    res.redirect(`/listings/${id}`);
  }
};

module.exports.deleteListing = async (req, res) => {
  const { id } = req.params;
  const deletedListing = await Listing.findByIdAndDelete(id);

  if (!deletedListing) {
    throw new ExpressError('Listing not found', 404);
  }

  req.flash('success', 'Listing deleted successfully.');
  if (!res.headersSent) {
    res.redirect('/listings');
  }
};
