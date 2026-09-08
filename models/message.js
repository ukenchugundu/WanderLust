const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'listing', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true, trim: true, maxlength: 500 },
}, { timestamps: true });

messageSchema.index({ listing: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
