// models/Payment.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    transactionRef: {
      type: String,
      unique: true,
      default: () => 'TXN' + Date.now().toString().slice(-10),
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    payer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    payee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be positive'],
    },
    type: {
      type: String,
      enum: ['advance', 'final', 'penalty', 'refund'],
      required: true,
    },
    method: {
      type: String,
      enum: ['paytm', 'phonepe', 'gpay', 'bhim', 'amazonpay', 'other_upi'],
      required: true,
    },
    upiId: {
      type: String,
      trim: true,
    },
    // Gateway simulation fields
    gatewayOrderId: { type: String },
    gatewayPaymentId: { type: String },
    status: {
      type: String,
      enum: ['pending', 'processing', 'success', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    failureReason: { type: String, default: '' },
    description: { type: String, default: '' },
    processedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

paymentSchema.index({ booking: 1, type: 1 });
paymentSchema.index({ payer: 1, status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
