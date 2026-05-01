const { Report } = require('../models/Shipment');
const Booking = require('../models/Booking');
const { successResponse, errorResponse, sendNotification } = require('../utils/helpers');

exports.createReport = async (req, res, next) => {
  try {
    const { bookingId, category, description, severity, vehicleNumber } = req.body;

    const booking = await Booking.findById(bookingId).populate('owner', 'fullName');
    if (!booking) return errorResponse(res, 'Booking not found.', 404);
    if (booking.sender.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'You can only report drivers for your own bookings.', 403);
    }
    if (!['accepted', 'confirmed', 'in_transit', 'delivered', 'completed', 'cancelled'].includes(booking.status)) {
      return errorResponse(res, 'Cannot report at this booking stage.');
    }

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
