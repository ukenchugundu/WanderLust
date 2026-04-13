const passport = require('passport');
const User = require('../models/user');

module.exports.renderSignupForm = (req, res) => {
  res.render('users/signup.ejs');
};

module.exports.signup = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const registeredUser = await User.register(
      new User({ username, email }),
      password
    );

    req.login(registeredUser, (err) => {
      if (err) {
        return next(err);
      }
      if (res.headersSent) return;
      req.flash('success', `Welcome to WanderLust ${registeredUser.username}!`);
      res.redirect('/listings');
    });
  } catch (err) {
    if (res.headersSent) return;
    req.flash('error', err.message);
    res.redirect('/signup');
  }
};

module.exports.renderLoginForm = (req, res) => {
  res.render('users/login.ejs');
};

module.exports.login = (req, res, next) => {
  passport.authenticate('local', (authErr, user, info = {}) => {
    if (authErr) {
      return next(authErr);
    }

    if (!user) {
      req.flash('error', info.message || 'Invalid username or password.');
      return res.redirect('/login');
    }

    req.logIn(user, (loginErr) => {
      if (loginErr) {
        return next(loginErr);
      }

      const username =
        typeof user.username === 'string' && user.username.trim()
          ? user.username.trim()
          : 'traveler';
      const redirectUrl = res.locals.redirectUrl || '/listings';

      req.flash('success', `Welcome to WanderLust ${username}!`);

      if (req.session) {
        delete req.session.redirectUrl;
      }

      return res.redirect(redirectUrl);
    });
  })(req, res, next);
};

module.exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    if (res.headersSent) return;
    req.flash('success', 'You logged out successfully.');
    res.redirect('/listings');
  });
};

module.exports.authenticateUser = passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: true,
});
