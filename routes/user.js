const express = require('express');
const passport = require('passport');
const User = require('../models/user');
const { saveRedirectUrl } = require('../middleware');

const router = express.Router();

router
  .route('/signup')
  .get((req, res) => {
    res.render('users/signup.ejs');
  })
  .post(async (req, res, next) => {
    try {
      const { username, email, password } = req.body;
      const registeredUser = await User.register(new User({ username, email }), password);

      req.login(registeredUser, (err) => {
        if (err) {
          return next(err);
        }
        req.flash('success', `Welcome to WanderLust ${registeredUser.username}!`);
        res.redirect('/listings');
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/signup');
    }
  });

router
  .route('/login')
  .get((req, res) => {
    res.render('users/login.ejs');
  })
  .post(
    saveRedirectUrl,
    passport.authenticate('local', {
      failureRedirect: '/login',
      failureFlash: true,
    }),
    (req, res) => {
      req.flash('success', `Welcome to WanderLust ${req.user.username}!`);
      const redirectUrl = res.locals.redirectUrl || '/listings';
      delete req.session.redirectUrl;
      res.redirect(redirectUrl);
    }
  );

router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.flash('success', 'You logged out successfully.');
    res.redirect('/listings');
  });
});

module.exports = router;
