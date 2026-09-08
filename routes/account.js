const express = require('express');
const wrapAsync = require('../utils/WrapAsync');
const { isLoggedIn } = require('../middleware');
const accountController = require('../controllers/account');

const router = express.Router();
router.get('/dashboard', isLoggedIn, wrapAsync(accountController.dashboard));
router.get('/favorites', isLoggedIn, wrapAsync(accountController.favorites));
router.post('/favorites/:id/toggle', isLoggedIn, wrapAsync(accountController.toggleFavorite));
router.get('/listings/:id/availability', isLoggedIn, wrapAsync(accountController.availability));
router.post('/listings/:id/bookings', isLoggedIn, wrapAsync(accountController.createBooking));
router.patch('/bookings/:bookingId', isLoggedIn, wrapAsync(accountController.updateBooking));

module.exports = router;
