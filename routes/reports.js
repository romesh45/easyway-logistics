const router = require('express').Router();
const ctrl = require('../controllers/reportController');
const { protect, restrictTo } = require('../middleware/auth');
const { validate, reportRules } = require('../middleware/validate');

router.use(protect);
router.get('/mine', restrictTo('sender'), ctrl.getMyReports);
router.get('/:id',  restrictTo('sender'), ctrl.getReport);
router.post('/',    restrictTo('sender'), validate(reportRules), ctrl.createReport);

module.exports = router;
