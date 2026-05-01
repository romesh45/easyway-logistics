// controllers/paymentController.js
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const { Shipment } = require('../models/Shipment');
const { successResponse, errorResponse, sendNotification } = require('../utils/helpers');
const { v4: uuidv4 } = require('uuid');

// ─── POST /api/payments/initiate ────────────────────────────────
// Sender initiates advance payment
exports.initiatePayment = async (req, res, next) => {
  try {
    const { bookingId, upiId, method } = req.body;

    const booking = await Booking.findOne({ _id: bookingId, sender: req.user._id })
      .populate('owner', 'fullName');
    if (!booking) return errorResponse(res, 'Booking not found.', 404);
    if (booking.status !== 'accepted') {
      return errorResponse(res, `Cannot initiate payment. Booking status is "${booking.status}".`);
    }

    // Check no existing successful advance payment
    const existing = await Payment.findOne({ booking: bookingId, type: 'advance', status: 'success' });
    if (existing) return errorResponse(res, 'Advance payment already completed.', 409);

    // Create payment record in "processing" state
    const gatewayOrderId = `EW_${uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase()}`;

    const payment = await Payment.create({
      booking: bookingId,
      payer: req.user._id,
      payee: booking.owner,
      amount: booking.fareBreakdown.advanceAmount,
      type: 'advance',
      method,
      upiId,
      gatewayOrderId,
      status: 'processing',
      description: `Advance payment — ${booking.pickup} → ${booking.drop}`,
    });

    // Simulate UPI deep-link / payment request
    const upiDeepLink = buildUPIDeepLink(method, upiId, booking.fareBreakdown.advanceAmount, gatewayOrderId);

    return successResponse(res, {
      paymentId: payment._id,
      transactionRef: payment.transactionRef,
      gatewayOrderId,
      amount: booking.fareBreakdown.advanceAmount,
      upiDeepLink,
      instructions: `Open ${methodLabel(method)} and approve the payment of ₹${booking.fareBreakdown.advanceAmount.toLocaleString('en-IN')}`,
    }, 'Payment initiated. Awaiting UPI confirmation.');
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/payments/:paymentId/confirm ───────────────────────
// Simulate UPI callback / manual confirm (in production: webhook from gateway)
exports.confirmPayment = async (req, res, next) => {
  try {
    const { gatewayPaymentId, simulateSuccess = true } = req.body;
    const payment = await Payment.findOne({ _id: req.params.paymentId, payer: req.user._id, status: 'processing' })
      .populate('booking');

    if (!payment) return errorResponse(res, 'Payment record not found or already processed.', 404);

    if (!simulateSuccess) {
      payment.status = 'failed';
      payment.failureReason = 'Payment declined by UPI gateway';
      await payment.save();
      return errorResponse(res, 'Payment failed. Please try again.', 402);
    }

    // Mark payment success
    payment.status = 'success';
    payment.gatewayPaymentId = gatewayPaymentId || `GW_${Date.now()}`;
    payment.processedAt = new Date();
    await payment.save();

    // Update booking to confirmed
    const booking = await Booking.findByIdAndUpdate(
      payment.booking._id,
      { status: 'confirmed', confirmedAt: new Date() },
      { new: true }
    ).populate('sender', 'fullName').populate('owner', 'fullName');

    // Create shipment tracking record
    await Shipment.create({
      booking: booking._id,
      sender: booking.sender._id,
      owner: booking.owner._id,
      vehicle: booking.vehicle,
      status: 'accepted',
      currentLocation: booking.pickup,
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
    });

    // Notify both parties
    await sendNotification(booking.sender._id, {
      type: 'success',
      title: 'Payment Confirmed! 🎉',
      message: `₹${payment.amount.toLocaleString('en-IN')} advance paid. Booking #${booking.bookingRef} is now confirmed.`,
      icon: 'fas fa-check-circle',
      bookingId: booking._id,
    });
    await sendNotification(booking.owner._id, {
      type: 'success',
      title: 'Advance Payment Received',
      message: `${booking.sender.fullName} has paid the advance for ${booking.pickup} → ${booking.drop}. Proceed for pickup.`,
      icon: 'fas fa-rupee-sign',
      bookingId: booking._id,
    });

    return successResponse(res, {
      payment,
      booking: { id: booking._id, bookingRef: booking.bookingRef, status: booking.status },
      message: 'Advance payment successful. Booking confirmed!',
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/payments ───────────────────────────────────────────
exports.getMyPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const filter = { payer: req.user._id };

    const payments = await Payment.find(filter)
      .populate('booking', 'bookingRef pickup drop status')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(filter);

    // Summary stats
    const successPayments = await Payment.find({ payer: req.user._id, status: 'success' });
    const totalPaid = successPayments.reduce((sum, p) => sum + p.amount, 0);

    return successResponse(res, { payments, total, totalPaid, page: parseInt(page) });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/payments/booking/:bookingId ────────────────────────
exports.getBookingPayments = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return errorResponse(res, 'Booking not found.', 404);

    const isSender = booking.sender.toString() === req.user._id.toString();
    const isOwner = booking.owner.toString() === req.user._id.toString();
    if (!isSender && !isOwner) return errorResponse(res, 'Access denied.', 403);

    const payments = await Payment.find({ booking: req.params.bookingId }).sort({ createdAt: 1 });
    return successResponse(res, { payments });
  } catch (err) {
    next(err);
  }
};

// ─── Helper: Build UPI deep link ────────────────────────────────
function buildUPIDeepLink(method, vpa, amount, orderId) {
  const payeeVPA = {
    paytm: 'easyway@paytm',
    phonepe: 'easyway@ybl',
    gpay: 'easyway@okaxis',
    bhim: 'easyway@upi',
    amazonpay: 'easyway@apl',
    other_upi: 'easyway@upi',
  };
  const payee = payeeVPA[method] || 'easyway@upi';
  return `upi://pay?pa=${payee}&pn=EasyWay+Logistics&am=${amount}&cu=INR&tn=Booking+${orderId}&mc=4722`;
}

function methodLabel(method) {
  const labels = {
    paytm: 'Paytm', phonepe: 'PhonePe', gpay: 'Google Pay',
    bhim: 'BHIM UPI', amazonpay: 'Amazon Pay', other_upi: 'UPI App',
  };
  return labels[method] || 'UPI App';
}
