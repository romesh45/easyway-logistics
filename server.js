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
const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const {
  availabilityRouter,
  bookingRouter,
  paymentRouter,
  shipmentRouter,
  reportRouter,
  notifRouter,
} = require('./routes/index');
// Load routes export default (loads.js re-exported from index.js too)
const loadRoutes = require('./routes/index'); // loads router is default export of routes/index.js

// ── Connect DB ───────────────────────────────────────────────────
connectDB();

const app = express();

// ── Security Middleware ──────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS – allow frontend origin
app.use(cors({
  origin: [
    process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5500',
    'http://localhost:5500',
    'http://localhost:3000',
    'null', // file:// origin for local HTML files
  ],
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
app.use('/api/availability',  availabilityRouter);
app.use('/api/bookings',      bookingRouter);
app.use('/api/payments',      paymentRouter);
app.use('/api/shipments',     shipmentRouter);
app.use('/api/reports',       reportRouter);
app.use('/api/notifications', notifRouter);

// Load routes need special handling since they're re-exported
const loadRouteFile = require('./controllers/loadController');
const loadRouter = require('express').Router();
const { protect, restrictTo } = require('./middleware/auth');
const { validate, loadRules } = require('./middleware/validate');
loadRouter.use(protect);
loadRouter.route('/')
  .get(restrictTo('sender'), loadRouteFile.getMyLoads)
  .post(restrictTo('sender'), validate(loadRules), loadRouteFile.createLoad);
loadRouter.get('/:id', loadRouteFile.getLoad);
loadRouter.put('/:id', restrictTo('sender'), loadRouteFile.updateLoad);
loadRouter.delete('/:id', restrictTo('sender'), loadRouteFile.deleteLoad);
loadRouter.get('/:id/matches', restrictTo('sender'), loadRouteFile.getMatches);
app.use('/api/loads', loadRouter);

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
