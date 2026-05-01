const Notification = require('../models/Notification');
const { successResponse } = require('../utils/helpers');

exports.getNotifications = async (req, res, next) => {
  try {
    const { unreadOnly, page = 1, limit = 30 } = req.query;
    const filter = { recipient: req.user._id };
    if (unreadOnly === 'true') filter.isRead = false;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    return successResponse(res, { notifications, unreadCount, total: notifications.length });
  } catch (err) {
    next(err);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    const { ids } = req.body; // array of notification IDs, or 'all'
    const filter = { recipient: req.user._id };
    if (ids && ids !== 'all') filter._id = { $in: ids };

    await Notification.updateMany(filter, { isRead: true });
    return successResponse(res, null, 'Notifications marked as read');
  } catch (err) {
    next(err);
  }
};
