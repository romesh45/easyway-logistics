const router = require('express').Router();
const ctrl = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');
const { validate, bookingRules, cancellationRules } = require('../middleware/validate');

router.use(protect);
router.get('/',    ctrl.getMyBookings);
router.post('/',   validate(bookingRules), ctrl.createBooking);
router.get('/:id', ctrl.getBooking);
router.put('/:id/accept',  ctrl.acceptBooking);
router.put('/:id/reject',  ctrl.rejectBooking);
router.put('/:id/cancel',  validate(cancellationRules), ctrl.cancelBooking);

module.exports = router;
