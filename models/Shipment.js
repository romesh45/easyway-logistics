// models/Shipment.js
const mongoose = require('mongoose');

const locationUpdateSchema = new mongoose.Schema(
  {
    location: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    note: { type: String, default: '' },
  },
  { _id: false }
);

const shipmentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true,
      index: true,
    },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },

    status: {
      type: String,
      enum: ['accepted', 'in_transit', 'delivered', 'completed'],
      default: 'accepted',
      index: true,
    },

    currentLocation: { type: String, default: '' },
    locationHistory: [locationUpdateSchema],

    // ETA
    estimatedDelivery: { type: Date },
    actualDelivery: { type: Date },

    // Progress (0–100)
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },

    // Delivery confirmation
    deliveryProofUrl: { type: String, default: '' },
    receiverName: { type: String, default: '' },
    receiverSignature: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

const Shipment = mongoose.model('Shipment', shipmentSchema);

// ===================================================================
// Report Model
// ===================================================================
const reportSchema = new mongoose.Schema(
  {
    reportRef: {
      type: String,
      unique: true,
      default: () => 'RPT' + Date.now().toString().slice(-8),
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reportedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    vehicleNumber: { type: String, trim: true },
    category: {
      type: String,
      required: [true, 'Report category is required'],
      enum: [
        'late_arrival',
        'unauthorized_charge',
        'no_show',
        'unprofessional',
        'wrong_vehicle',
        'damage',
        'route_deviation',
        'other',
      ],
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      minlength: [20, 'Please provide at least 20 characters of description'],
      maxlength: [2000, 'Description too long'],
    },
    status: {
      type: String,
      enum: ['pending', 'review', 'resolved', 'dismissed'],
      default: 'pending',
      index: true,
    },
    adminNote: { type: String, default: '' },
    resolvedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

reportSchema.index({ reporter: 1, status: 1 });
reportSchema.index({ reportedDriver: 1 });

const Report = mongoose.model('Report', reportSchema);

module.exports = { Shipment, Report };
