// routes/auth.js
const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate, registerRules, loginRules } = require('../middleware/validate');

router.post('/register', validate(registerRules), ctrl.register);
router.post('/login',    validate(loginRules), ctrl.login);
router.get('/me',        protect, ctrl.getMe);
router.put('/profile',   protect, ctrl.updateProfile);
router.put('/change-password', protect, ctrl.changePassword);
router.delete('/account', protect, ctrl.deleteAccount);

module.exports = router;
