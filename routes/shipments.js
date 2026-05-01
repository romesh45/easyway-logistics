const router = require('express').Router();
const ctrl = require('../controllers/shipmentController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);
router.get('/',                           ctrl.getMyShipments);
router.get('/:bookingId',                 ctrl.getShipment);
router.put('/:bookingId/status',   restrictTo('owner'), ctrl.updateShipmentStatus);
router.put('/:bookingId/location', restrictTo('owner'), ctrl.updateLocation);

module.exports = router;
