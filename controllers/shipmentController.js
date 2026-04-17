// controllers/shipmentController.js
const { Shipment } = require('../models/Shipment');
const Booking = require('../models/Booking');
const { successResponse, errorResponse, sendNotification } = require('../utils/helpers');

// ─── GET /api/shipments ─────────────────────────────────────────
exports.getMyShipments = async (req, res, next) => {
  try {
    const filter = req.user.role === 'sender'
      ? { sender: req.user._id }
      : { owner: req.user._id };

    const shipments = await Shipment.find(filter)
      .populate('booking', 'bookingRef pickup drop fareBreakdown status')
      .populate('vehicle')
      .sort({ createdAt: -1 });

    return successResponse(res, { shipments, count: shipments.length });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/shipments/:bookingId ──────────────────────────────
exports.getShipment = async (req, res, next) => {
  try {
    const shipment = await Shipment.findOne({ booking: req.params.bookingId })
      .populate({ path: 'booking', populate: [
        { path: 'sender', select: 'fullName phone' },
        { path: 'owner', select: 'fullName phone rating' },
        { path: 'vehicle' },
      ]});

    if (!shipment) return errorResponse(res, 'Shipment not found.', 404);

    const isSender = shipment.sender.toString() === req.user._id.toString();
    const isOwner = shipment.owner.toString() === req.user._id.toString();
    if (!isSender && !isOwner) return errorResponse(res, 'Access denied.', 403);

    return successResponse(res, { shipment });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/shipments/:bookingId/status ── (owner updates) ────
exports.updateShipmentStatus = async (req, res, next) => {
  try {
    const { status, currentLocation, note, progressPercent } = req.body;
    const VALID_TRANSITIONS = {
      accepted: ['in_transit'],
      in_transit: ['delivered'],
      delivered: ['completed'],
    };

    const shipment = await Shipment.findOne({ booking: req.params.bookingId, owner: req.user._id });
    if (!shipment) return errorResponse(res, 'Shipment not found.', 404);

    const allowed = VALID_TRANSITIONS[shipment.status] || [];
    if (!allowed.includes(status)) {
      return errorResponse(res, `Invalid transition: ${shipment.status} → ${status}. Allowed: ${allowed.join(', ')}`);
    }

    // Push location update
    if (currentLocation) {
      shipment.locationHistory.push({ location: currentLocation, note: note || '' });
      shipment.currentLocation = currentLocation;
    }
    if (progressPercent !== undefined) shipment.progressPercent = progressPercent;
    if (status === 'delivered') shipment.actualDelivery = new Date();
    if (status === 'in_transit') shipment.progressPercent = shipment.progressPercent || 10;

    shipment.status = status;
    await shipment.save();

    // Mirror status onto booking
    const bookingStatusMap = {
      in_transit: 'in_transit',
      delivered: 'delivered',
      completed: 'completed',
    };
    if (bookingStatusMap[status]) {
      await Booking.findByIdAndUpdate(req.params.bookingId, { status: bookingStatusMap[status] });
    }

    // Notify sender
    const statusMessages = {
      in_transit: `Your shipment has been picked up from ${shipment.booking?.pickup || 'pickup'} and is now in transit.`,
      delivered: `Your shipment has been delivered to ${shipment.booking?.drop || 'destination'}! Please confirm receipt.`,
      completed: 'Shipment completed. Thank you for using EasyWay!',
    };
    await sendNotification(shipment.sender, {
      type: status === 'delivered' ? 'success' : 'info',
      title: `Shipment ${status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
      message: statusMessages[status] || `Status updated to ${status}`,
      icon: 'fas fa-truck-moving',
      bookingId: req.params.bookingId,
    });

    return successResponse(res, { shipment }, `Status updated to ${status}`);
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/shipments/:bookingId/location ── (owner updates location) ──
exports.updateLocation = async (req, res, next) => {
  try {
    const { currentLocation, note, progressPercent } = req.body;
    if (!currentLocation) return errorResponse(res, 'Current location is required.');

    const shipment = await Shipment.findOneAndUpdate(
      { booking: req.params.bookingId, owner: req.user._id, status: 'in_transit' },
      {
        currentLocation,
        progressPercent: progressPercent || undefined,
        $push: { locationHistory: { location: currentLocation, note: note || '' } },
      },
      { new: true }
    );

    if (!shipment) return errorResponse(res, 'Active shipment not found.', 404);
    return successResponse(res, { shipment }, 'Location updated');
  } catch (err) {
    next(err);
  }
};
