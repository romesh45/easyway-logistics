// models/Availability.js
const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema(
  {
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
    currentLocation: {
      type: String,
      required: [true, 'Current location is required'],
      trim: true,
    },
    preferredRoute: {
      type: String,
      trim: true,
      default: 'Any',
    },
    availableDate: {
      type: Date,
      required: [true, 'Available date is required'],
    },
    ratePerKm: {
      type: Number,
      required: [true, 'Rate per km is required'],
      min: 1,
    },
    notes: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['active', 'booked', 'expired'],
      default: 'active',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

availabilitySchema.index({ status: 1, availableDate: 1 });
availabilitySchema.index({ owner: 1, status: 1 });

module.exports = mongoose.model('Availability', availabilitySchema);
