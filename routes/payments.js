const router = require('express').Router();
const ctrl = require('../controllers/paymentController');
const { protect, restrictTo } = require('../middleware/auth');
const { validate, paymentRules } = require('../middleware/validate');

router.use(protect);
router.get('/',                        ctrl.getMyPayments);
router.post('/initiate',  restrictTo('sender'), validate(paymentRules), ctrl.initiatePayment);
router.post('/:paymentId/confirm', restrictTo('sender'), ctrl.confirmPayment);
router.get('/booking/:bookingId',      ctrl.getBookingPayments);

module.exports = router;
