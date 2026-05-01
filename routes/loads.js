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
