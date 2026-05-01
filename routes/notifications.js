const router = require('express').Router();
const ctrl = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/',          ctrl.getNotifications);
router.put('/mark-read', ctrl.markRead);

module.exports = router;
