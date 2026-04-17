// controllers/availabilityController.js
const Availability = require('../models/Availability');
const Vehicle = require('../models/Vehicle');
const { successResponse, errorResponse } = require('../utils/helpers');

// ─── POST /api/availability ─────────────────────────────────────
exports.postAvailability = async (req, res, next) => {
  try {
    const { vehicleId, currentLocation, preferredRoute, availableDate, ratePerKm, notes } = req.body;

    // Verify vehicle belongs to owner
    const vehicle = await Vehicle.findOne({ _id: vehicleId, owner: req.user._id, isActive: true });
    if (!vehicle) return errorResponse(res, 'Vehicle not found or not yours.', 404);

    const availability = await Availability.create({
      owner: req.user._id,
      vehicle: vehicleId,
      currentLocation,
      preferredRoute: preferredRoute || 'Any',
      availableDate: new Date(availableDate),
      ratePerKm: parseFloat(ratePerKm) || vehicle.ratePerKm,
      notes: notes || '',
    });

    await availability.populate('vehicle');
    return successResponse(res, { availability }, 'Availability posted', 201);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/availability/mine ─────────────────────────────────
exports.getMyAvailabilities = async (req, res, next) => {
  try {
    const avs = await Availability.find({ owner: req.user._id })
      .populate('vehicle')
      .sort({ availableDate: 1 });
    return successResponse(res, { availabilities: avs, count: avs.length });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/availability/:id ──────────────────────────────────
exports.updateAvailability = async (req, res, next) => {
  try {
    const av = await Availability.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!av) return errorResponse(res, 'Availability not found.', 404);
    return successResponse(res, { availability: av }, 'Availability updated');
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/availability/:id ───────────────────────────────
exports.deleteAvailability = async (req, res, next) => {
  try {
    const av = await Availability.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id, status: 'active' },
      { status: 'expired' },
      { new: true }
    );
    if (!av) return errorResponse(res, 'Availability not found.', 404);
    return successResponse(res, null, 'Availability removed');
  } catch (err) {
    next(err);
  }
};
