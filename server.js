// server.js – EasyWay Logistics Backend Entry Point
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// ── Route Imports ────────────────────────────────────────────────
const authRoutes          = require('./routes/auth');
const vehicleRoutes       = require('./routes/vehicles');
const loadRoutes          = require('./routes/loads');
const availabilityRoutes  = require('./routes/availability');
const bookingRoutes       = require('./routes/bookings');
const paymentRoutes       = require('./routes/payments');
const shipmentRoutes      = require('./routes/shipments');
const reportRoutes        = require('./routes/reports');
const notificationRoutes  = require('./routes/notifications');

// ── Connect DB ───────────────────────────────────────────────────
connectDB();

const app = express();

// ── Security Middleware ──────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS – lock to CLIENT_ORIGIN when set, otherwise allow all (safe default for Render)
app.use(cors({
  origin: process.env.CLIENT_ORIGIN ? [process.env.CLIENT_ORIGIN] : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter rate limit for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts. Try again in 15 minutes.' },
});

// ── Body Parsing & Sanitization ──────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(mongoSanitize()); // prevent NoSQL injection

// ── Static Frontend ──────────────────────────────────────────────
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

// ── Logging (dev only) ───────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── Health Check ─────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'EasyWay API is running',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ── API Routes ───────────────────────────────────────────────────
app.use('/api/auth',          authLimiter, authRoutes);
app.use('/api/vehicles',      vehicleRoutes);
app.use('/api/loads',         loadRoutes);
app.use('/api/availability',  availabilityRoutes);
app.use('/api/bookings',      bookingRoutes);
app.use('/api/payments',      paymentRoutes);
app.use('/api/shipments',     shipmentRoutes);
app.use('/api/reports',       reportRoutes);
app.use('/api/notifications', notificationRoutes);

// ── 404 & Error Handlers ─────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  console.log(`\n🚀 EasyWay API Server running on http://localhost:${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV}`);
  console.log(`   MongoDB     : ${process.env.MONGO_URI}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});

// ── Graceful Shutdown ─────────────────────────────────────────────
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err.message);
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => process.exit(0));
});

module.exports = app;
