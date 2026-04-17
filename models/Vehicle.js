// models/Vehicle.js
const mongoose = require('mongoose');

const VEHICLE_TYPES = [
  'mini_truck', 'pickup', 'tempo', 'tata_ace', 'bolero_pickup',
  'lcv', 'hcv', 'open_truck', 'closed_container',
  'container_20ft', 'container_40ft', 'trailer', 'flatbed',
  'liquid_tanker', 'gas_tanker', 'refrigerated', 'car_carrier',
  'tip_truck', 'dumper', 'crane_truck', 'half_body', 'full_body', 'multi_axle',
];

const PERMIT_TYPES = ['all_india', 'state', 'local', 'preferred'];

const vehicleSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    vehicleNumber: {
      type: String,
      required: [true, 'Vehicle number is required'],
      trim: true,
      uppercase: true,
      match: [/^[A-Z]{2}\s?\d{2}\s?[A-Z]{1,2}\s?\d{4}$/, 'Invalid vehicle number format (e.g. TN 38 CD 5678)'],
    },
    vehicleType: {
      type: String,
      required: [true, 'Vehicle type is required'],
      enum: { values: VEHICLE_TYPES, message: 'Invalid vehicle type' },
    },
    capacity: {
      type: Number,
      required: [true, 'Load capacity is required'],
      min: [0.1, 'Capacity must be at least 0.1 ton'],
      max: [100, 'Capacity cannot exceed 100 tons'],
    },
    ratePerKm: {
      type: Number,
      required: [true, 'Rate per km is required'],
      min: [1, 'Rate must be at least ₹1/km'],
    },
    permitType: {
      type: String,
      required: [true, 'Permit type is required'],
      enum: { values: PERMIT_TYPES, message: 'Invalid permit type' },
    },
    preferredRoutes: {
      type: String,
      default: '',
      trim: true,
    },
    // Parsed preferred areas for matching
    preferredAreas: [{ type: String, lowercase: true, trim: true }],
    notes: { type: String, default: '', trim: true },
    isPrimary: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Pre-save: parse preferredRoutes into preferredAreas array for matching
vehicleSchema.pre('save', function (next) {
  if (this.preferredRoutes) {
    this.preferredAreas = this.preferredRoutes
      .split(',')
      .map((r) => r.trim().toLowerCase())
      .filter(Boolean);
  }
  next();
});

vehicleSchema.index({ owner: 1, isActive: 1 });
vehicleSchema.index({ vehicleType: 1, permitType: 1, isActive: 1 });

module.exports = mongoose.model('Vehicle', vehicleSchema);
module.exports.VEHICLE_TYPES = VEHICLE_TYPES;
module.exports.PERMIT_TYPES = PERMIT_TYPES;
