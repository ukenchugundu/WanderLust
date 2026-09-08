const mongoose = require('mongoose');
const Listing = require('./models/listings');
const Booking = require('./models/booking');
const Message = require('./models/message');

const userRoom = (userId) => `user:${userId}`;
const listingRoom = (listingId) => `listing:${listingId}`;

module.exports = function configureRealtime(io, sessionMiddleware, passport) {
  io.engine.use(sessionMiddleware);
  io.engine.use(passport.initialize());
  io.engine.use(passport.session());

  io.use((socket, next) => {
    if (!socket.request.user) {
      return next(new Error('Authentication required'));
    }
    next();
  });

  io.on('connection', (socket) => {
    const userId = socket.request.user._id.toString();
    socket.join(userRoom(userId));

    socket.on('availability:join', async (listingId) => {
      if (!mongoose.isValidObjectId(listingId)) return;
      socket.join(listingRoom(listingId));
      const bookings = await Booking.find({
        listing: listingId,
        status: { $in: ['pending', 'approved'] },
        checkOut: { $gt: new Date() },
      }).select('checkIn checkOut status');
      socket.emit('availability:update', bookings);
    });

    socket.on('chat:join', async (listingId) => {
      if (!mongoose.isValidObjectId(listingId)) return;
      socket.join(listingRoom(listingId));
      const messages = await Message.find({ listing: listingId })
        .populate('sender', 'username')
        .sort({ createdAt: -1 })
        .limit(50);
      socket.emit('chat:history', messages.reverse());
    });

    socket.on('chat:send', async ({ listingId, body } = {}) => {
      if (!mongoose.isValidObjectId(listingId) || typeof body !== 'string' || !body.trim()) return;
      const listing = await Listing.findById(listingId).select('_id');
      if (!listing) return;
      const message = await Message.create({ listing: listingId, sender: userId, body: body.trim().slice(0, 500) });
      const populated = await message.populate('sender', 'username');
      io.to(listingRoom(listingId)).emit('chat:message', populated);
    });
  });

  return { userRoom, listingRoom };
};
