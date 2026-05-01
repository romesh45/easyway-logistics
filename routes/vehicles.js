// routes/vehicles.js
const router = require('express').Router();
const ctrl = require('../controllers/vehicleController');
const { protect, restrictTo } = require('../middleware/auth');
const { validate, vehicleRules } = require('../middleware/validate');

router.use(protect, restrictTo('owner'));

router.route('/')
  .get(ctrl.getMyVehicles)
  .post(validate(vehicleRules), ctrl.addVehicle);

router.route('/:id')
  .get(ctrl.getVehicle)
  .put(ctrl.updateVehicle)
  .delete(ctrl.deleteVehicle);

module.exports = router;
