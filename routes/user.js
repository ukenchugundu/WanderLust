const express = require('express');
const passport = require('passport');
const { saveRedirectUrl } = require('../middleware');
const userController = require('../controllers/users');

const router = express.Router();

router
  .route('/signup')
  .get(userController.renderSignupForm)
  .post(userController.signup);

router
  .route('/login')
  .get(userController.renderLoginForm)
  .post(
    saveRedirectUrl,
    passport.authenticate('local', {
      failureRedirect: '/login',
      failureFlash: 'Invalid username or password.',
      failWithError: true,
    }),
    userController.login
  );

router.use((err, req, res, next) => {
  if (!err) {
    return next();
  }

  if (req.path === '/login') {
    if (!res.headersSent) {
      req.flash('error', err.message || 'Login failed. Please try again.');
      return res.redirect('/login');
    }
    return;
  }

  next(err);
});

router.get('/logout', userController.logout);

module.exports = router;
