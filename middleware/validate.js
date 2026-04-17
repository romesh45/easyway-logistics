// middleware/validate.js – express-validator integration
const { validationResult, body, param } = require('express-validator');

// Run validations and short-circuit on first error batch
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((v) => v.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }
    next();
  };
};

// ── Auth Validators ──────────────────────────────────────────────
const registerRules = [
  body('fullName').trim().notEmpty().withMessage('Full name is required').isLength({ max: 100 }),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['sender', 'owner']).withMessage('Role must be sender or owner'),
];

const loginRules = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

// ── Vehicle Validators ───────────────────────────────────────────
const vehicleRules = [
  body('vehicleNumber').trim().notEmpty().withMessage('Vehicle number is required'),
  body('vehicleType').notEmpty().withMessage('Vehicle type is required'),
  body('capacity').isFloat({ min: 0.1 }).withMessage('Capacity must be a positive number'),
  body('ratePerKm').isFloat({ min: 1 }).withMessage('Rate per km must be positive'),
  body('permitType').isIn(['all_india', 'state', 'local', 'preferred']).withMessage('Invalid permit type'),
];

// ── Load Validators ──────────────────────────────────────────────
const loadRules = [
  body('pickup').trim().notEmpty().withMessage('Pickup location is required'),
  body('drop').trim().notEmpty().withMessage('Drop location is required'),
  body('weight').isFloat({ min: 0.1 }).withMessage('Weight must be a positive number'),
  body('preferredDate').isISO8601().withMessage('Valid date required'),
  body('vehicleType').notEmpty().withMessage('Vehicle type is required'),
];

// ── Booking Validators ───────────────────────────────────────────
const bookingRules = [
  body('loadId').isMongoId().withMessage('Invalid load ID'),
  body('availabilityId').isMongoId().withMessage('Invalid availability ID'),
];

// ── Payment Validators ───────────────────────────────────────────
const paymentRules = [
  body('bookingId').isMongoId().withMessage('Invalid booking ID'),
  body('upiId').trim().notEmpty().withMessage('UPI ID is required').contains('@').withMessage('Invalid UPI ID format'),
  body('method').isIn(['paytm', 'phonepe', 'gpay', 'bhim', 'amazonpay', 'other_upi']).withMessage('Invalid payment method'),
];

// ── Cancellation Validators ──────────────────────────────────────
const cancellationRules = [
  body('reason').trim().notEmpty().withMessage('Cancellation reason text is required'),
  body('reasonCode').notEmpty().withMessage('Reason code is required'),
  body('penaltyAcknowledged').if(body('penaltyApplies').equals('true'))
    .isBoolean().withMessage('Must acknowledge penalty terms'),
];

// ── Report Validators ────────────────────────────────────────────
const reportRules = [
  body('bookingId').isMongoId().withMessage('Invalid booking ID'),
  body('category').isIn([
    'late_arrival', 'unauthorized_charge', 'no_show', 'unprofessional',
    'wrong_vehicle', 'damage', 'route_deviation', 'other',
  ]).withMessage('Invalid report category'),
  body('description').trim().isLength({ min: 20, max: 2000 })
    .withMessage('Description must be 20–2000 characters'),
  body('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
];

module.exports = {
  validate,
  registerRules,
  loginRules,
  vehicleRules,
  loadRules,
  bookingRules,
  paymentRules,
  cancellationRules,
  reportRules,
};
