// controllers/loadController.js
const Load = require('../models/Load');
const Vehicle = require('../models/Vehicle');
const Availability = require('../models/Availability');
const User = require('../models/User');
const {
  successResponse, errorResponse,
  getDistanceKm, calculateFare,
  computeMatchScore, permitAllowsRoute,
} = require('../utils/helpers');

// ─── POST /api/loads ────────────────────────────────────────────
exports.createLoad = async (req, res, next) => {
  try {
    const { pickup, drop, weight, preferredDate, vehicleType, budget, notes } = req.body;

    const load = await Load.create({
      sender: req.user._id,
      pickup, drop,
      weight: parseFloat(weight),
      preferredDate: new Date(preferredDate),
      vehicleType,
      budget: budget ? parseFloat(budget) : null,
      notes: notes || '',
    });

    return successResponse(res, { load }, 'Load posted successfully', 201);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/loads ─── (sender: own loads) ─────────────────────
exports.getMyLoads = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { sender: req.user._id };
    if (status) filter.status = status;

    const loads = await Load.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Load.countDocuments(filter);
    return successResponse(res, { loads, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/loads/:id ─────────────────────────────────────────
exports.getLoad = async (req, res, next) => {
  try {
    const load = await Load.findById(req.params.id).populate('sender', 'fullName email phone');
    if (!load) return errorResponse(res, 'Load not found.', 404);

    // Owners can view loads; senders only their own
    if (req.user.role === 'sender' && load.sender._id.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Access denied.', 403);
    }
    return successResponse(res, { load });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/loads/:id ─────────────────────────────────────────
exports.updateLoad = async (req, res, next) => {
  try {
    const load = await Load.findOneAndUpdate(
      { _id: req.params.id, sender: req.user._id, status: 'open' },
      req.body,
      { new: true, runValidators: true }
    );
    if (!load) return errorResponse(res, 'Load not found or cannot be edited.', 404);
    return successResponse(res, { load }, 'Load updated');
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/loads/:id ──────────────────────────────────────
exports.deleteLoad = async (req, res, next) => {
  try {
    const load = await Load.findOneAndUpdate(
      { _id: req.params.id, sender: req.user._id, status: 'open' },
      { status: 'cancelled' },
      { new: true }
    );
    if (!load) return errorResponse(res, 'Load not found or already booked.', 404);
    return successResponse(res, null, 'Load cancelled');
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/loads/:id/matches ─────────────────────────────────
// Core matching algorithm
exports.getMatches = async (req, res, next) => {
  try {
    const load = await Load.findOne({ _id: req.params.id, sender: req.user._id });
    if (!load) return errorResponse(res, 'Load not found.', 404);

    const { sort = 'match', permitFilter, page = 1, limit = 20 } = req.query;
    const dist = getDistanceKm(load.pickup, load.drop);

    // Fetch active availabilities with matching vehicle type
    const availabilities = await Availability.find({ status: 'active' })
      .populate({
        path: 'vehicle',
        match: { vehicleType: load.vehicleType, capacity: { $gte: load.weight }, isActive: true },
      })
      .populate('owner', 'fullName phone rating totalTrips profilePicture');

    const eligible = [];
    const excluded = [];

    for (const av of availabilities) {
      if (!av.vehicle) {
        // Populated vehicle was null (type/capacity mismatch)
        continue;
      }

      const vehicle = av.vehicle;

      // Permit route check
      if (!permitAllowsRoute(vehicle, load.pickup, load.drop)) {
        excluded.push({
          availabilityId: av._id,
          vehicleId: vehicle._id,
          vehicleNumber: vehicle.vehicleNumber,
          vehicleType: vehicle.vehicleType,
          permitType: vehicle.permitType,
          excludeReason: vehicle.permitType === 'local'
            ? 'Local permit — route out of area'
            : 'Preferred routes — route not covered',
          owner: av.owner?.fullName,
        });
        continue;
      }

      // Date compatibility (availability must be on or before load date)
      const loadDate = new Date(load.preferredDate);
      const avDate = new Date(av.availableDate);
      if (avDate > loadDate) {
        excluded.push({
          availabilityId: av._id,
          vehicleNumber: vehicle.vehicleNumber,
          excludeReason: 'Not available on requested date',
        });
        continue;
      }

      const matchScore = computeMatchScore(load, av, vehicle);
      const fare = calculateFare(dist, av.ratePerKm);

      eligible.push({
        availabilityId: av._id,
        vehicleId: vehicle._id,
        vehicleNumber: vehicle.vehicleNumber,
        vehicleType: vehicle.vehicleType,
        capacity: vehicle.capacity,
        permitType: vehicle.permitType,
        preferredRoutes: vehicle.preferredRoutes,
        ratePerKm: av.ratePerKm,
        currentLocation: av.currentLocation,
        availableDate: av.availableDate,
        preferredRoute: av.preferredRoute,
        notes: av.notes,
        matchScore,
        estimatedDistance: dist,
        fare,
        owner: {
          id: av.owner?._id,
          name: av.owner?.fullName,
          rating: av.owner?.rating || 4.8,
          totalTrips: av.owner?.totalTrips || 0,
          initials: (av.owner?.fullName || 'XX').split(' ').map(n => n[0]).join('').slice(0, 2),
        },
      });
    }

    // Apply permit filter
    let results = permitFilter
      ? eligible.filter(e => e.permitType === permitFilter)
      : eligible;

    // Sort
    switch (sort) {
      case 'price':   results.sort((a, b) => a.ratePerKm - b.ratePerKm); break;
      case 'rating':  results.sort((a, b) => b.owner.rating - a.owner.rating); break;
      case 'date':    results.sort((a, b) => new Date(a.availableDate) - new Date(b.availableDate)); break;
      default:        results.sort((a, b) => b.matchScore - a.matchScore);
    }

    // Update load with estimated distance
    await Load.findByIdAndUpdate(load._id, { estimatedDistance: dist });

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginated = results.slice(skip, skip + parseInt(limit));

    return successResponse(res, {
      load: { id: load._id, pickup: load.pickup, drop: load.drop, weight: load.weight, vehicleType: load.vehicleType },
      estimatedDistance: dist,
      matches: paginated,
      excluded,
      total: results.length,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    next(err);
  }
};
