// controllers/reportController.js
const { Report } = require('../models/Shipment');
const Booking = require('../models/Booking');
const { successResponse, errorResponse, sendNotification } = require('../utils/helpers');

// ─── POST /api/reports ──────────────────────────────────────────
exports.createReport = async (req, res, next) => {
  try {
    const { bookingId, category, description, severity, vehicleNumber } = req.body;

    // Verify booking belongs to sender
    const booking = await Booking.findById(bookingId)
      .populate('owner', 'fullName');
    if (!booking) return errorResponse(res, 'Booking not found.', 404);
    if (booking.sender.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'You can only report drivers for your own bookings.', 403);
    }
    if (!['accepted', 'confirmed', 'in_transit', 'delivered', 'completed', 'cancelled'].includes(booking.status)) {
      return errorResponse(res, 'Cannot report at this booking stage.');
    }

    // Check duplicate active report
    const existing = await Report.findOne({ reporter: req.user._id, booking: bookingId, status: { $in: ['pending', 'review'] } });
    if (existing) return errorResponse(res, 'You already have an active report for this booking.', 409);

    const report = await Report.create({
      reporter: req.user._id,
      reportedDriver: booking.owner._id,
      booking: bookingId,
      vehicleNumber: vehicleNumber || '',
      category,
      severity: severity || 'medium',
      description,
    });

    // Notify admin (simulated — notify the owner with a warning)
    await sendNotification(booking.owner._id, {
      type: 'warning',
      title: 'Complaint Filed Against You',
      message: `A complaint has been filed regarding booking #${booking.bookingRef}. Our team will review and contact you.`,
      icon: 'fas fa-flag',
      bookingId: booking._id,
    });

    return successResponse(res, { report }, 'Report submitted. Our team will review within 48 hours.', 201);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/reports/mine ──────────────────────────────────────
exports.getMyReports = async (req, res, next) => {
  try {
    const reports = await Report.find({ reporter: req.user._id })
      .populate('reportedDriver', 'fullName')
      .populate('booking', 'bookingRef pickup drop')
      .sort({ createdAt: -1 });
    return successResponse(res, { reports, count: reports.length });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/reports/:id ───────────────────────────────────────
exports.getReport = async (req, res, next) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, reporter: req.user._id })
      .populate('reportedDriver', 'fullName')
      .populate('booking', 'bookingRef pickup drop status');
    if (!report) return errorResponse(res, 'Report not found.', 404);
    return successResponse(res, { report });
  } catch (err) {
    next(err);
  }
};

// ─── controllers/notificationController.js ──────────────────────
const Notification = require('../models/Notification');

exports.getNotifications = async (req, res, next) => {
  try {
    const { unreadOnly, page = 1, limit = 30 } = req.query;
    const filter = { recipient: req.user._id };
    if (unreadOnly === 'true') filter.isRead = false;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    return successResponse(res, { notifications, unreadCount, total: notifications.length });
  } catch (err) {
    next(err);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    const { ids } = req.body; // array of notification IDs, or 'all'
    const filter = { recipient: req.user._id };
    if (ids && ids !== 'all') filter._id = { $in: ids };

    await Notification.updateMany(filter, { isRead: true });
    return successResponse(res, null, 'Notifications marked as read');
  } catch (err) {
    next(err);
  }
};

module.exports.reportController = { createReport: exports.createReport, getMyReports: exports.getMyReports, getReport: exports.getReport };
module.exports.notificationController = { getNotifications: exports.getNotifications, markRead: exports.markRead };
