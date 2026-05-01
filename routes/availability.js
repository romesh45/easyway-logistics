const router = require('express').Router();
const ctrl = require('../controllers/availabilityController');
const { protect, restrictTo } = require('../middleware/auth');
const { validate, availabilityRules } = require('../middleware/validate');

router.use(protect);
router.post('/',      restrictTo('owner'), validate(availabilityRules), ctrl.postAvailability);
router.get('/mine',   restrictTo('owner'), ctrl.getMyAvailabilities);
router.put('/:id',    restrictTo('owner'), ctrl.updateAvailability);
router.delete('/:id', restrictTo('owner'), ctrl.deleteAvailability);

module.exports = router;
