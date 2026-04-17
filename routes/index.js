// routes/loads.js
const router = require('express').Router();
const ctrl = require('../controllers/loadController');
const { protect, restrictTo } = require('../middleware/auth');
const { validate, loadRules } = require('../middleware/validate');

router.use(protect);
router.route('/')
  .get(restrictTo('sender'), ctrl.getMyLoads)
  .post(restrictTo('sender'), validate(loadRules), ctrl.createLoad);
router.get('/:id', ctrl.getLoad);
router.put('/:id', restrictTo('sender'), ctrl.updateLoad);
router.delete('/:id', restrictTo('sender'), ctrl.deleteLoad);
router.get('/:id/matches', restrictTo('sender'), ctrl.getMatches);

module.exports = router;

// ────────────────────────────────────────────────────────────────
// routes/availability.js
const avRouter = require('express').Router();
const avCtrl = require('../controllers/availabilityController');
const { protect: p2, restrictTo: r2 } = require('../middleware/auth');

avRouter.use(p2);
avRouter.post('/',        r2('owner'), avCtrl.postAvailability);
avRouter.get('/mine',     r2('owner'), avCtrl.getMyAvailabilities);
avRouter.put('/:id',      r2('owner'), avCtrl.updateAvailability);
avRouter.delete('/:id',   r2('owner'), avCtrl.deleteAvailability);

module.exports.availabilityRouter = avRouter;

// ────────────────────────────────────────────────────────────────
// routes/bookings.js
const bookRouter = require('express').Router();
const bookCtrl = require('../controllers/bookingController');
const { protect: p3 } = require('../middleware/auth');
const { validate: v3, bookingRules, cancellationRules } = require('../middleware/validate');

bookRouter.use(p3);
bookRouter.get('/',    bookCtrl.getMyBookings);
bookRouter.post('/',   v3(bookingRules), bookCtrl.createBooking);
bookRouter.get('/:id', bookCtrl.getBooking);
bookRouter.put('/:id/accept',  bookCtrl.acceptBooking);
bookRouter.put('/:id/reject',  bookCtrl.rejectBooking);
bookRouter.put('/:id/cancel',  v3(cancellationRules), bookCtrl.cancelBooking);

module.exports.bookingRouter = bookRouter;

// ────────────────────────────────────────────────────────────────
// routes/payments.js
const payRouter = require('express').Router();
const payCtrl = require('../controllers/paymentController');
const { protect: p4, restrictTo: r4 } = require('../middleware/auth');
const { validate: v4, paymentRules } = require('../middleware/validate');

payRouter.use(p4);
payRouter.get('/',                         payCtrl.getMyPayments);
payRouter.post('/initiate',  r4('sender'), v4(paymentRules), payCtrl.initiatePayment);
payRouter.post('/:paymentId/confirm', r4('sender'), payCtrl.confirmPayment);
payRouter.get('/booking/:bookingId',       payCtrl.getBookingPayments);

module.exports.paymentRouter = payRouter;

// ────────────────────────────────────────────────────────────────
// routes/shipments.js
const shipRouter = require('express').Router();
const shipCtrl = require('../controllers/shipmentController');
const { protect: p5, restrictTo: r5 } = require('../middleware/auth');

shipRouter.use(p5);
shipRouter.get('/',                            shipCtrl.getMyShipments);
shipRouter.get('/:bookingId',                  shipCtrl.getShipment);
shipRouter.put('/:bookingId/status',  r5('owner'), shipCtrl.updateShipmentStatus);
shipRouter.put('/:bookingId/location', r5('owner'), shipCtrl.updateLocation);

module.exports.shipmentRouter = shipRouter;

// ────────────────────────────────────────────────────────────────
// routes/reports.js
const rptRouter = require('express').Router();
const { reportController, notificationController } = require('../controllers/reportController');
const { protect: p6, restrictTo: r6 } = require('../middleware/auth');
const { validate: v6, reportRules } = require('../middleware/validate');

rptRouter.use(p6);
rptRouter.get('/mine',  r6('sender'), reportController.getMyReports);
rptRouter.get('/:id',   r6('sender'), reportController.getReport);
rptRouter.post('/',     r6('sender'), v6(reportRules), reportController.createReport);

module.exports.reportRouter = rptRouter;

// ────────────────────────────────────────────────────────────────
// routes/notifications.js
const notifRouter = require('express').Router();
const { protect: p7 } = require('../middleware/auth');

notifRouter.use(p7);
notifRouter.get('/',        notificationController.getNotifications);
notifRouter.put('/mark-read', notificationController.markRead);

module.exports.notifRouter = notifRouter;
