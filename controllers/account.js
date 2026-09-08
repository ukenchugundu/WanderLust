const mongoose = require('mongoose');
const Listing = require('../models/listings');
const User = require('../models/user');
const Booking = require('../models/booking');
const ExpressError = require('../utils/ExpressError');

module.exports.dashboard = async (req, res) => {
  const [listings, incomingBookings, outgoingBookings] = await Promise.all([
    Listing.find({ owner: req.user._id }).sort({ _id: -1 }),
    Booking.find({ host: req.user._id }).populate('listing guest').sort({ createdAt: -1 }),
    Booking.find({ guest: req.user._id }).populate('listing host').sort({ createdAt: -1 }),
  ]);
  res.render('account/dashboard.ejs', { listings, incomingBookings, outgoingBookings });
};

module.exports.favorites = async (req, res) => {
  const user = await User.findById(req.user._id).populate('favorites');
  res.render('account/favorites.ejs', { favorites: user.favorites || [] });
};

module.exports.toggleFavorite = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ExpressError('Listing not found', 404);
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new ExpressError('Listing not found', 404);
  const user = await User.findById(req.user._id);
  const favoriteIndex = user.favorites.findIndex((id) => id.equals(listing._id));
  if (favoriteIndex >= 0) {
    user.favorites.splice(favoriteIndex, 1);
    req.flash('success', 'Removed from favorites.');
  } else {
    user.favorites.push(listing._id);
    req.flash('success', 'Saved to favorites.');
  }
  await user.save();
  res.redirect(`/listings/${listing._id}`);
};

module.exports.createBooking = async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new ExpressError('Listing not found', 404);
  const checkIn = new Date(req.body.checkIn);
  const checkOut = new Date(req.body.checkOut);
  const guests = Number(req.body.guests);
  if (!Number.isFinite(checkIn.getTime()) || !Number.isFinite(checkOut.getTime()) || checkOut <= checkIn || !Number.isInteger(guests) || guests < 1) {
    throw new ExpressError('Enter valid dates and guest count.', 400);
  }
  const conflictingBooking = await Booking.exists({
    listing: listing._id,
    status: { $in: ['pending', 'approved'] },
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
  });
  if (conflictingBooking) {
    throw new ExpressError('Those dates are no longer available.', 409);
  }
  await Booking.create({
    listing: listing._id,
    guest: req.user._id,
    host: listing.owner,
    checkIn,
    checkOut,
    guests,
    message: req.body.message,
  });
  const io = req.app.get('io');
  if (io && listing.owner) {
    io.to(`user:${listing.owner}`).emit('booking:new', { listingId: listing._id.toString() });
  }
  req.flash('success', 'Booking request sent.');
  res.redirect(`/listings/${listing._id}`);
};

module.exports.updateBooking = async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.bookingId, host: req.user._id });
  if (!booking) throw new ExpressError('Booking request not found', 404);
  if (!['approved', 'declined'].includes(req.body.status)) throw new ExpressError('Invalid booking status', 400);
  booking.status = req.body.status;
  await booking.save();
  const io = req.app.get('io');
  if (io) {
    io.to(`user:${booking.guest}`).emit('booking:status', {
      bookingId: booking._id.toString(),
      status: booking.status,
    });
  }
  req.flash('success', `Booking request ${req.body.status}.`);
  res.redirect('/dashboard');
};

module.exports.availability = async (req, res) => {
  const bookings = await Booking.find({
    listing: req.params.id,
    status: { $in: ['pending', 'approved'] },
    checkOut: { $gt: new Date() },
  }).select('checkIn checkOut status');
  res.json(bookings);
};
