const express = require('express');

const router = express.Router();

router.get('/services', (req, res) => {
  res.render('services.ejs');
});

router.get('/contact', (req, res) => {
  res.render('contact.ejs', { sent: req.query.sent === '1' });
});

router.post('/contact', (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.redirect('/contact');
  }
  res.redirect('/contact?sent=1');
});

module.exports = router;
