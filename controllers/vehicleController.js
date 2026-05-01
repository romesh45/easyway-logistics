// controllers/vehicleController.js
const Vehicle = require('../models/Vehicle');
const { successResponse, errorResponse } = require('../utils/helpers');

// ─── GET /api/vehicles ─── (owner: get own vehicles) ───────────
exports.getMyVehicles = async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({ owner: req.user._id, isActive: true }).sort({ isPrimary: -1, createdAt: 1 });
    return successResponse(res, { vehicles, count: vehicles.length });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/vehicles/:id ──────────────────────────────────────
exports.getVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, owner: req.user._id, isActive: true });
    if (!vehicle) return errorResponse(res, 'Vehicle not found.', 404);
    return successResponse(res, { vehicle });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/vehicles ─────────────────────────────────────────
exports.addVehicle = async (req, res, next) => {
  try {
    const { vehicleNumber, vehicleType, capacity, ratePerKm, permitType, preferredRoutes, notes } = req.body;

    // Check duplicate vehicle number for this owner
    const existing = await Vehicle.findOne({ vehicleNumber: vehicleNumber.toUpperCase().replace(/\s/g, ' '), isActive: true });
    if (existing) return errorResponse(res, 'A vehicle with this number is already registered.', 409);

    const isPrimary = (await Vehicle.countDocuments({ owner: req.user._id, isActive: true })) === 0;

    const vehicle = await Vehicle.create({
      owner: req.user._id,
      vehicleNumber,
      vehicleType,
      capacity: parseFloat(capacity),
      ratePerKm: parseFloat(ratePerKm),
      permitType,
      preferredRoutes: preferredRoutes || '',
      notes: notes || '',
      isPrimary,
    });

    return successResponse(res, { vehicle }, 'Vehicle registered successfully', 201);
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/vehicles/:id ──────────────────────────────────────
exports.updateVehicle = async (req, res, next) => {
  try {
    const { vehicleType, capacity, ratePerKm, permitType, preferredRoutes, notes } = req.body;

    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id, isActive: true },
      { vehicleType, capacity, ratePerKm, permitType, preferredRoutes, notes },
      { new: true, runValidators: true }
    );

    if (!vehicle) return errorResponse(res, 'Vehicle not found.', 404);
    return successResponse(res, { vehicle }, 'Vehicle updated successfully');
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/vehicles/:id ───────────────────────────────────
exports.deleteVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { isActive: false },
      { new: true }
    );
    if (!vehicle) return errorResponse(res, 'Vehicle not found.', 404);
    return successResponse(res, null, 'Vehicle removed successfully');
  } catch (err) {
    next(err);
  }
};
