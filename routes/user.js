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
  .post(saveRedirectUrl, userController.login);

router.get('/logout', userController.logout);

module.exports = router;
