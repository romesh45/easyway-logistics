// controllers/authController.js
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const { generateToken, sendNotification, successResponse, errorResponse } = require('../utils/helpers');

// ─── POST /api/auth/register ────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { fullName, email, phone, password, role, company, address } = req.body;

    // Check duplicate email
    const existing = await User.findOne({ email });
    if (existing) {
      return errorResponse(res, 'An account with this email already exists.', 409);
    }

    // Create user
    const user = await User.create({ fullName, email, phone, password, role, company: company || '', address: address || '' });

    // For owner registration: optionally attach a first vehicle
    if (role === 'owner' && req.body.vehicleNumber) {
      const { vehicleNumber, vehicleType, capacity, ratePerKm, permitType, preferredRoutes } = req.body;
      await Vehicle.create({
        owner: user._id,
        vehicleNumber,
        vehicleType,
        capacity: parseFloat(capacity),
        ratePerKm: parseFloat(ratePerKm),
        permitType,
        preferredRoutes: preferredRoutes || '',
        isPrimary: true,
      });
    }

    const token = generateToken(user._id);

    await sendNotification(user._id, {
      type: 'success',
      title: 'Welcome to EasyWay!',
      message: `Hi ${user.fullName}, your account has been created successfully.`,
      icon: 'fas fa-hand-wave',
    });

    return successResponse(res, { token, user: user.toSafeObject() }, 'Registration successful', 201);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/login ───────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Fetch with password field
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return errorResponse(res, 'Invalid email or password.', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, 'Your account has been deactivated. Contact support.', 403);
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);
    return successResponse(res, { token, user: user.toSafeObject() }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/auth/me ───────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return errorResponse(res, 'User not found.', 404);
    return successResponse(res, { user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/auth/profile ──────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const { fullName, phone, company, address, settings } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { fullName, phone, company, address, ...(settings && { settings }) },
      { new: true, runValidators: true }
    );

    return successResponse(res, { user: user.toSafeObject() }, 'Profile updated successfully');
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/auth/change-password ─────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return errorResponse(res, 'Current and new passwords are required.');
    }
    if (newPassword.length < 8) {
      return errorResponse(res, 'New password must be at least 8 characters.');
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
      return errorResponse(res, 'Current password is incorrect.', 401);
    }

    user.password = newPassword;
    await user.save();

    return successResponse(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/auth/account ───────────────────────────────────
exports.deleteAccount = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { isActive: false });
    return successResponse(res, null, 'Account deactivated successfully');
  } catch (err) {
    next(err);
  }
};
