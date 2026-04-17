// controllers/bookingController.js
const Booking = require('../models/Booking');
const Load = require('../models/Load');
const Availability = require('../models/Availability');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const { Shipment } = require('../models/Shipment');
const {
  successResponse, errorResponse, getDistanceKm,
  calculateFare, calculatePenalty, sendNotification,
} = require('../utils/helpers');

// ─── POST /api/bookings ─── (sender creates booking) ───────────
exports.createBooking = async (req, res, next) => {
  try {
    const { loadId, availabilityId } = req.body;

    const load = await Load.findOne({ _id: loadId, sender: req.user._id, status: { $in: ['open', 'matched'] } });
    if (!load) return errorResponse(res, 'Load not found or not available for booking.', 404);

    const av = await Availability.findOne({ _id: availabilityId, status: 'active' }).populate('vehicle');
    if (!av) return errorResponse(res, 'Lorry availability not found.', 404);

    const vehicle = av.vehicle;
    const dist = getDistanceKm(load.pickup, load.drop);
    const fare = calculateFare(dist, av.ratePerKm);

    const booking = await Booking.create({
      sender: req.user._id,
      owner: av.owner,
      vehicle: vehicle._id,
      load: load._id,
      availability: av._id,
      pickup: load.pickup,
      drop: load.drop,
      estimatedDistance: dist,
      ratePerKm: av.ratePerKm,
      fareBreakdown: fare,
    });

    // Mark load as booked, availability as booked
    await Load.findByIdAndUpdate(loadId, { status: 'booked' });
    await Availability.findByIdAndUpdate(availabilityId, { status: 'booked' });

    // Notify owner of new request
    await sendNotification(av.owner, {
      type: 'info',
      title: 'New Load Request',
      message: `${req.user.fullName} has sent a booking request for ${load.pickup} → ${load.drop}.`,
      icon: 'fas fa-inbox',
      bookingId: booking._id,
    });

    await booking.populate([
      { path: 'sender', select: 'fullName phone email' },
      { path: 'owner', select: 'fullName phone' },
      { path: 'vehicle' },
      { path: 'load' },
    ]);

    return successResponse(res, { booking }, 'Booking request sent', 201);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/bookings ──────────────────────────────────────────
exports.getMyBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = req.user.role === 'sender'
      ? { sender: req.user._id }
      : { owner: req.user._id };
    if (status) filter.status = status;

    const bookings = await Booking.find(filter)
      .populate('sender', 'fullName phone email')
      .populate('owner', 'fullName phone')
      .populate('vehicle')
      .populate('load')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(filter);
    return successResponse(res, { bookings, total, page: parseInt(page) });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/bookings/:id ──────────────────────────────────────
exports.getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('sender', 'fullName phone email company')
      .populate('owner', 'fullName phone email rating totalTrips')
      .populate('vehicle')
      .populate('load');

    if (!booking) return errorResponse(res, 'Booking not found.', 404);

    // Authorization check
    const isSender = booking.sender._id.toString() === req.user._id.toString();
    const isOwner = booking.owner._id.toString() === req.user._id.toString();
    if (!isSender && !isOwner) return errorResponse(res, 'Access denied.', 403);

    // Build response — conditionally include contact numbers
    const response = booking.toJSON();

    // Sender phone revealed to owner only after acceptance
    if (isOwner && booking.senderContactRevealed) {
      response.senderContact = booking.sender.phone;
    } else {
      delete response.sender.phone;
    }

    // Owner phone always visible to sender (once accepted)
    if (isSender && ['accepted', 'confirmed', 'in_transit', 'delivered', 'completed'].includes(booking.status)) {
      response.ownerContact = booking.owner.phone;
    }

    return successResponse(res, { booking: response });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/bookings/:id/accept ── (owner accepts) ───────────
exports.acceptBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, owner: req.user._id, status: 'pending' })
      .populate('sender', 'fullName phone email')
      .populate('owner', 'fullName phone');

    if (!booking) return errorResponse(res, 'Booking not found or already processed.', 404);

    booking.status = 'accepted';
    booking.acceptedAt = new Date();
    booking.senderContactRevealed = true;   // Unlock sender contact for owner
    booking.ownerContactRevealed = true;    // Unlock owner contact for sender
    await booking.save();

    // Notify sender
    await sendNotification(booking.sender._id, {
      type: 'success',
      title: 'Booking Accepted!',
      message: `${req.user.fullName} accepted your request for ${booking.pickup} → ${booking.drop}. Proceed to payment.`,
      icon: 'fas fa-handshake',
      bookingId: booking._id,
    });

    return successResponse(res, {
      booking,
      senderContact: booking.sender.phone,  // Revealed to owner in this response
    }, 'Booking accepted. Sender contact revealed.');
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/bookings/:id/reject ── (owner rejects) ───────────
exports.rejectBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id, status: 'pending' },
      { status: 'rejected' },
      { new: true }
    ).populate('sender', 'fullName');

    if (!booking) return errorResponse(res, 'Booking not found.', 404);

    // Re-open the load and availability
    await Load.findByIdAndUpdate(booking.load, { status: 'open' });
    await Availability.findByIdAndUpdate(booking.availability, { status: 'active' });

    await sendNotification(booking.sender._id, {
      type: 'warning',
      title: 'Booking Rejected',
      message: `Your booking request for ${booking.pickup} → ${booking.drop} was not accepted. Try another lorry.`,
      icon: 'fas fa-times-circle',
      bookingId: booking._id,
    });

    return successResponse(res, { booking }, 'Booking rejected');
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/bookings/:id/cancel ──────────────────────────────
exports.cancelBooking = async (req, res, next) => {
  try {
    const { reason, reasonCode, penaltyAcknowledged } = req.body;
    if (!reason || !reasonCode) return errorResponse(res, 'Reason and reason code are required.');

    const booking = await Booking.findById(req.params.id)
      .populate('sender', 'fullName')
      .populate('owner', 'fullName');
    if (!booking) return errorResponse(res, 'Booking not found.', 404);

    const isSender = booking.sender._id.toString() === req.user._id.toString();
    const isOwner = booking.owner._id.toString() === req.user._id.toString();
    if (!isSender && !isOwner) return errorResponse(res, 'Access denied.', 403);

    if (['cancelled', 'completed', 'rejected'].includes(booking.status)) {
      return errorResponse(res, 'Booking cannot be cancelled in its current status.');
    }

    const cancellerRole = isSender ? 'sender' : 'owner';
    const hasPaid = booking.status === 'confirmed' || booking.status === 'in_transit';

    // Penalty logic
    let penaltyAmount = 0;
    let penaltyWaived = false;

    if (hasPaid) {
      if (!penaltyAcknowledged) {
        return errorResponse(res, 'You must acknowledge the cancellation penalty to proceed.');
      }
      const penalty = calculatePenalty(reasonCode, booking.fareBreakdown.totalEstimated);
      penaltyAmount = penalty.penaltyAmount;
      penaltyWaived = penalty.penaltyWaived;
    }

    booking.status = 'cancelled';
    booking.cancellation = {
      cancelledBy: cancellerRole,
      reason,
      reasonCode,
      penaltyApplied: hasPaid && !penaltyWaived,
      penaltyAmount: hasPaid && !penaltyWaived ? penaltyAmount : 0,
      penaltyWaived,
      cancelledAt: new Date(),
    };
    await booking.save();

    // Re-open load & availability
    await Load.findByIdAndUpdate(booking.load, { status: 'open' });
    await Availability.findByIdAndUpdate(booking.availability, { status: 'active' });

    // Notify the other party
    const notifyId = isSender ? booking.owner._id : booking.sender._id;
    const notifyName = isSender ? booking.owner.fullName : booking.sender.fullName;
    await sendNotification(notifyId, {
      type: 'warning',
      title: 'Booking Cancelled',
      message: `${req.user.fullName} cancelled the booking for ${booking.pickup} → ${booking.drop}. Reason: ${reason}`,
      icon: 'fas fa-ban',
      bookingId: booking._id,
    });

    return successResponse(res, {
      booking,
      penalty: {
        applied: booking.cancellation.penaltyApplied,
        waived: penaltyWaived,
        amount: booking.cancellation.penaltyAmount,
        message: penaltyWaived
          ? 'Penalty waived — valid reason provided.'
          : hasPaid
            ? `₹${penaltyAmount} penalty applied.`
            : 'No penalty — cancelled before payment.',
      },
    }, 'Booking cancelled');
  } catch (err) {
    next(err);
  }
};
