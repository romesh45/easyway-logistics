// utils/helpers.js – Pricing, distance, JWT, notification helpers
const jwt = require('jsonwebtoken');
const Notification = require('../models/Notification');

// ── JWT ─────────────────────────────────────────────────────────
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// ── City Distance Table (km) ────────────────────────────────────
const CITY_DISTANCES = {
  'chennai-bangalore': 347, 'chennai-hyderabad': 626, 'chennai-mumbai': 1335,
  'chennai-delhi': 2196, 'chennai-pune': 1158, 'chennai-coimbatore': 498,
  'chennai-erode': 400, 'chennai-madurai': 462, 'chennai-trichy': 330,
  'chennai-tirupur': 453, 'chennai-vellore': 137, 'chennai-salem': 335,
  'bangalore-hyderabad': 574, 'bangalore-mumbai': 985, 'bangalore-delhi': 2174,
  'bangalore-pune': 837, 'bangalore-coimbatore': 364, 'bangalore-erode': 300,
  'bangalore-madurai': 460, 'bangalore-mysore': 145,
  'hyderabad-mumbai': 712, 'hyderabad-delhi': 1573, 'hyderabad-pune': 563,
  'hyderabad-nagpur': 502, 'hyderabad-vijayawada': 275,
  'mumbai-delhi': 1415, 'mumbai-pune': 152, 'mumbai-nagpur': 836,
  'mumbai-ahmedabad': 524, 'mumbai-surat': 280,
  'delhi-jaipur': 280, 'delhi-agra': 233, 'delhi-lucknow': 555,
  'delhi-chandigarh': 260, 'delhi-amritsar': 450,
  'coimbatore-madurai': 212, 'coimbatore-trichy': 226, 'coimbatore-erode': 79,
  'erode-trichy': 230, 'madurai-trichy': 136, 'madurai-tirunelveli': 157,
  'kolkata-patna': 592, 'kolkata-bhubaneswar': 442, 'kolkata-guwahati': 1028,
};

const getDistanceKm = (from, to) => {
  const normalize = (s) => s.toLowerCase().trim()
    .replace(/\s+/g, '')
    .replace(/[^a-z]/g, '');
  const a = normalize(from);
  const b = normalize(to);
  const key1 = `${a}-${b}`;
  const key2 = `${b}-${a}`;
  if (CITY_DISTANCES[key1]) return CITY_DISTANCES[key1];
  if (CITY_DISTANCES[key2]) return CITY_DISTANCES[key2];
  // Fallback: hash-based estimation (250–1050 km)
  let hash = 0;
  for (const c of a + b) hash = (hash * 31 + c.charCodeAt(0)) & 0xfffffff;
  return 250 + (hash % 800);
};

// ── Fare Calculation ────────────────────────────────────────────
const calculateFare = (distanceKm, ratePerKm) => {
  const GST_DRIVER = parseFloat(process.env.GST_DRIVER_RATE) || 0.05;
  const PLATFORM_FEE = parseFloat(process.env.PLATFORM_FEE_RATE) || 0.03;
  const GST_PLATFORM = parseFloat(process.env.GST_PLATFORM_RATE) || 0.18;
  const ADVANCE_PCT = parseFloat(process.env.ADVANCE_PAYMENT_PCT) || 0.30;

  const baseFare = Math.round(distanceKm * ratePerKm);
  const driverGST = Math.round(baseFare * GST_DRIVER);
  const platformFee = Math.round(baseFare * PLATFORM_FEE);
  const platformGST = Math.round(platformFee * GST_PLATFORM);
  const totalEstimated = baseFare + driverGST + platformFee + platformGST;
  const advanceAmount = Math.round(totalEstimated * ADVANCE_PCT);
  const remainingAmount = totalEstimated - advanceAmount;

  return { baseFare, driverGST, platformFee, platformGST, totalEstimated, advanceAmount, remainingAmount };
};

// ── Cancellation Penalty ────────────────────────────────────────
const WAIVABLE_REASONS = ['breakdown', 'emergency', 'weather', 'route_issue'];
const PENALTY_MIN = parseInt(process.env.CANCELLATION_PENALTY_MIN) || 500;
const PENALTY_MAX = parseInt(process.env.CANCELLATION_PENALTY_MAX) || 1500;

const calculatePenalty = (reasonCode, bookingTotal) => {
  if (WAIVABLE_REASONS.includes(reasonCode)) {
    return { penaltyAmount: 0, penaltyWaived: true };
  }
  // 5–15% of total or fixed floor/ceiling
  const pct = Math.round(bookingTotal * 0.10);
  const penaltyAmount = Math.max(PENALTY_MIN, Math.min(PENALTY_MAX, pct));
  return { penaltyAmount, penaltyWaived: false };
};

// ── Matching Score ───────────────────────────────────────────────
/**
 * Compute a 0–100 match score between a load and an availability record.
 * Considers: route similarity, capacity, rate vs budget, permit compatibility.
 */
const computeMatchScore = (load, availability, vehicle) => {
  let score = 60; // base

  // Capacity buffer: extra capacity = lower score penalty
  const capacityRatio = vehicle.capacity / load.weight;
  if (capacityRatio >= 1 && capacityRatio <= 2) score += 15;
  else if (capacityRatio > 2) score += 8;

  // Rate vs budget
  const dist = getDistanceKm(load.pickup, load.drop);
  const estTotal = dist * availability.ratePerKm;
  if (load.budget && estTotal <= load.budget) score += 15;

  // Date proximity
  const loadDate = new Date(load.preferredDate);
  const avDate = new Date(availability.availableDate);
  const dayDiff = Math.abs((loadDate - avDate) / (1000 * 60 * 60 * 24));
  if (dayDiff === 0) score += 10;
  else if (dayDiff <= 1) score += 6;

  return Math.min(100, score);
};

// ── Permit Route Check ───────────────────────────────────────────
const permitAllowsRoute = (vehicle, pickupCity, dropCity) => {
  const { permitType, preferredAreas } = vehicle;
  if (permitType === 'all_india' || permitType === 'state') return true;

  const pickupLower = pickupCity.toLowerCase().trim();
  const dropLower = dropCity.toLowerCase().trim();

  if (permitType === 'local') {
    return preferredAreas.some(
      (area) => pickupLower.includes(area) || area.includes(pickupLower) ||
                dropLower.includes(area) || area.includes(dropLower)
    );
  }

  if (permitType === 'preferred') {
    return preferredAreas.some(
      (area) =>
        pickupLower.includes(area) || area.includes(pickupLower) ||
        dropLower.includes(area) || area.includes(dropLower)
    );
  }

  return false;
};

// ── Send Notification ────────────────────────────────────────────
const sendNotification = async (recipientId, { type, title, message, icon, bookingId }) => {
  try {
    await Notification.create({
      recipient: recipientId,
      type: type || 'info',
      title,
      message,
      icon: icon || 'fas fa-bell',
      relatedBooking: bookingId || null,
    });
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

// ── API Response Helpers ─────────────────────────────────────────
const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({ success: true, message, data });
};

const errorResponse = (res, message, statusCode = 400) => {
  return res.status(statusCode).json({ success: false, message });
};

module.exports = {
  generateToken,
  getDistanceKm,
  calculateFare,
  calculatePenalty,
  computeMatchScore,
  permitAllowsRoute,
  sendNotification,
  successResponse,
  errorResponse,
  WAIVABLE_REASONS,
};
