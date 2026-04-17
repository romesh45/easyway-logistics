// models/Load.js
const mongoose = require('mongoose');

const loadSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    pickup: {
      type: String,
      required: [true, 'Pickup location is required'],
      trim: true,
    },
    drop: {
      type: String,
      required: [true, 'Drop location is required'],
      trim: true,
    },
    weight: {
      type: Number,
      required: [true, 'Load weight is required'],
      min: [0.1, 'Weight must be at least 0.1 ton'],
      max: [500, 'Weight cannot exceed 500 tons'],
    },
    preferredDate: {
      type: Date,
      required: [true, 'Preferred date is required'],
    },
    vehicleType: {
      type: String,
      required: [true, 'Vehicle type is required'],
      enum: require('./Vehicle').VEHICLE_TYPES,
    },
    budget: {
      type: Number,
      default: null,
      min: [0, 'Budget cannot be negative'],
    },
    notes: { type: String, default: '', trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ['open', 'matched', 'booked', 'cancelled'],
      default: 'open',
    },
    // Distance cache after matching
    estimatedDistance: { type: Number, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

loadSchema.index({ sender: 1, status: 1 });
loadSchema.index({ vehicleType: 1, status: 1 });
loadSchema.index({ preferredDate: 1 });

module.exports = mongoose.model('Load', loadSchema);
