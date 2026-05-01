// models/Booking.js
const mongoose = require('mongoose');

const fareBreakdownSchema = new mongoose.Schema(
  {
    baseFare: { type: Number, required: true },
    driverGST: { type: Number, required: true },
    platformFee: { type: Number, required: true },
    platformGST: { type: Number, required: true },
    totalEstimated: { type: Number, required: true },
    advanceAmount: { type: Number, required: true },
    remainingAmount: { type: Number, required: true },
  },
  { _id: false }
);

const cancellationSchema = new mongoose.Schema(
  {
    cancelledBy: { type: String, enum: ['sender', 'owner'] },
    reason: { type: String },
    reasonCode: { type: String },
    penaltyApplied: { type: Boolean, default: false },
    penaltyAmount: { type: Number, default: 0 },
    penaltyWaived: { type: Boolean, default: false },
    cancelledAt: { type: Date },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    bookingRef: {
      type: String,
      unique: true,
      default: () => 'BK' + Date.now().toString().slice(-8),
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    load: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Load',
      required: true,
    },
    availability: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Availability',
    },

    // Route snapshot
    pickup: { type: String, required: true },
    drop: { type: String, required: true },
    estimatedDistance: { type: Number, required: true },
    ratePerKm: { type: Number, required: true },

    // Fare
    fareBreakdown: { type: fareBreakdownSchema, required: true },

    // Lifecycle status
    status: {
      type: String,
      enum: [
        'pending',      // Booking created, waiting owner response
        'accepted',     // Owner accepted, contact revealed
        'confirmed',    // Advance payment received
        'in_transit',   // Driver en route / picked up
        'delivered',    // Delivered, awaiting final payment
        'completed',    // Final payment done
        'cancelled',    // Cancelled by either party
        'rejected',     // Owner rejected
      ],
      default: 'pending',
      index: true,
    },

    // Contact reveal (only after acceptance)
    senderContactRevealed: { type: Boolean, default: false },
    ownerContactRevealed: { type: Boolean, default: false },

    // Cancellation
    cancellation: { type: cancellationSchema, default: null },

    // Timestamps
    acceptedAt: { type: Date },
    confirmedAt: { type: Date },
    pickedUpAt: { type: Date },
    deliveredAt: { type: Date },
    completedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

bookingSchema.index({ sender: 1, status: 1 });
bookingSchema.index({ owner: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
