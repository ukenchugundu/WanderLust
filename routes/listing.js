const express = require('express');
const router = express.Router();
const multer = require('multer');
const wrapAsync = require('../utils/WrapAsync');
const ExpressError = require('../utils/ExpressError');
const { listingSchema } = require('../schema');
const { isLoggedIn, isListingOwner } = require('../middleware');
const listingController = require('../controllers/listings');
const { storage } = require('../cloudConfig');

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Please upload a valid image file.'), false);
    }
    cb(null, true);
  },
});

const validateListing = (req, res, next) => {
  const { error } = listingSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const errorDetails = error.details.map((detail) => detail.message);
    return next(new ExpressError('Validation failed', 400, errorDetails));
  }

  next();
};

router.get('/', wrapAsync(listingController.index));

router.get('/new', isLoggedIn, listingController.renderNewForm);

router.get('/:id', wrapAsync(listingController.showListing));

router.post(
  '/',
  isLoggedIn,
  upload.single('image'),
  validateListing,
  wrapAsync(listingController.createListing)
);

router.get(
  '/:id/edit',
  isLoggedIn,
  isListingOwner,
  wrapAsync(listingController.renderEditForm)
);

router.put(
  '/:id',
  isLoggedIn,
  isListingOwner,
  upload.single('image'),
  validateListing,
  wrapAsync(listingController.updateListing)
);

router.delete(
  '/:id',
  isLoggedIn,
  isListingOwner,
  wrapAsync(listingController.deleteListing)
);

module.exports = router;

  
