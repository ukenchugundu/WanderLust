(() => {
  const today = new Date().toISOString().slice(0, 10);
  document.querySelectorAll('[data-booking-date]').forEach((input) => {
    input.min = today;
  });

  const bookingForm = document.querySelector('[data-booking-form]');
  const bookingSummary = document.querySelector('[data-booking-summary]');
  const updateBookingSummary = () => {
    if (!bookingForm || !bookingSummary) return;
    const [checkIn, checkOut] = bookingForm.querySelectorAll('[data-booking-date]');
    const guests = Number(bookingForm.querySelector('[data-booking-guests]')?.value || 1);
    const start = new Date(`${checkIn.value}T00:00:00`);
    const end = new Date(`${checkOut.value}T00:00:00`);
    const nights = Number.isFinite(start.getTime()) && Number.isFinite(end.getTime())
      ? Math.round((end - start) / 86400000)
      : 0;
    if (nights < 1) {
      bookingSummary.textContent = 'Select valid dates to see your estimated total.';
      return;
    }
    const total = nights * Number(bookingForm.dataset.nightlyPrice || 0);
    bookingSummary.innerHTML = `<strong>${nights} night${nights === 1 ? '' : 's'}</strong> for ${guests} guest${guests === 1 ? '' : 's'} <span>Estimated total: <strong>₹ ${total.toLocaleString('en-IN')}</strong></span>`;
  };
  bookingForm?.addEventListener('input', updateBookingSummary);
  updateBookingSummary();

  const attractionData = {
    India: [['Local food walk', 'Taste the neighborhood with a local guide.', 'fa-utensils'], ['Cultural landmarks', 'Plan an easy morning around heritage and history.', 'fa-landmark'], ['Sunset viewpoint', 'Find the best golden-hour spot nearby.', 'fa-sun']],
    Italy: [['Old-town wandering', 'Slow walks through streets full of character.', 'fa-camera-retro'], ['Regional cooking', 'Book a table for the flavors locals love.', 'fa-bowl-food'], ['Art and history', 'Make room for galleries, churches, and stories.', 'fa-palette']],
    default: [['Neighborhood favorite', 'Discover the places regulars return to.', 'fa-heart'], ['Outdoor escape', 'Add fresh air and a little adventure.', 'fa-person-hiking'], ['Local flavors', 'Try something memorable close to home base.', 'fa-utensils']],
  };
  const attractions = document.querySelector('[data-attractions]');
  const attractionGrid = document.querySelector('[data-attractions-grid]');
  if (attractions && attractionGrid) {
    const options = attractionData[attractions.dataset.country] || attractionData.default;
    attractionGrid.innerHTML = options.map(([title, copy, icon]) => `<article class="attraction-card"><i class="fa-solid ${icon}"></i><div><h5>${title}</h5><p>${copy}</p></div><i class="fa-solid fa-arrow-up-right-from-square attraction-arrow"></i></article>`).join('');
  }

  if (!window.wanderlustUserId || typeof io !== 'function') return;

  const socket = io();
  const listingElement = document.querySelector('[data-realtime-listing]');
  const notificationElement = document.querySelector('[data-notification-count]');
  const availabilityElement = document.querySelector('[data-availability-status]');
  const chatMessages = document.querySelector('[data-chat-messages]');
  const chatForm = document.querySelector('[data-chat-form]');
  const chatInput = document.querySelector('[data-chat-input]');

  const addNotification = (message) => {
    if (!notificationElement) return;
    notificationElement.textContent = message;
    notificationElement.classList.remove('d-none');
  };

  socket.on('connect_error', () => {
    if (availabilityElement) availabilityElement.textContent = 'Live updates unavailable. Refresh to check availability.';
  });

  socket.on('booking:new', () => addNotification('New booking request'));
  socket.on('booking:status', ({ status }) => addNotification(`Booking ${status}`));

  if (listingElement) {
    const listingId = listingElement.dataset.realtimeListing;
    socket.emit('availability:join', listingId);
    socket.emit('chat:join', listingId);
    socket.on('availability:update', (bookings) => {
      if (!availabilityElement) return;
      availabilityElement.textContent = bookings.length
        ? `${bookings.length} date range${bookings.length === 1 ? '' : 's'} currently requested or booked.`
        : 'Dates are currently open.';
      bookings.forEach(({ checkIn, checkOut }) => {
        document.querySelectorAll('input[type="date"]').forEach((input) => {
          input.addEventListener('change', () => {
            const selected = new Date(`${input.value}T00:00:00`);
            const start = new Date(checkIn);
            const end = new Date(checkOut);
            if (selected >= start && selected < end) input.setCustomValidity('This date is unavailable.');
            else input.setCustomValidity('');
          });
        });
      });
    });
  }

  const renderMessage = (message) => {
    if (!chatMessages) return;
    const item = document.createElement('li');
    item.textContent = `${message.sender?.username || 'Guest'}: ${message.body}`;
    chatMessages.appendChild(item);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  socket.on('chat:history', (messages) => messages.forEach(renderMessage));
  socket.on('chat:message', renderMessage);

  if (chatForm && listingElement && chatInput) {
    chatForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const body = chatInput.value.trim();
      if (!body) return;
      socket.emit('chat:send', { listingId: listingElement.dataset.realtimeListing, body });
      chatInput.value = '';
    });
  }
})();
