const Notification = require('./model');

const listNotifications = async (branchFilter) => {
  const logs = await Notification.find(branchFilter)
    .sort({ isRead: 1, createdAt: -1 })
    .limit(50);
  return logs;
};

const triggerNotification = async ({ branchId, title, message, type, userId = null }) => {
  try {
    const notify = await Notification.create({
      branchId,
      userId,
      title,
      message,
      type: type || 'alert',
      isRead: false,
    });

    try {
      const { emitToBranch } = require('../../config/socket');
      emitToBranch(branchId, 'new_notification', notify);
    } catch (socketErr) {
      console.error('Failed to emit notification via websocket:', socketErr);
    }

    return notify;
  } catch (e) {
    // Suppress error so trigger failure does not crash core transaction
    console.error('Failed to trigger background notification:', e);
    return null;
  }
};

const markAsRead = async (id, branchFilter) => {
  const notify = await Notification.findOneAndUpdate(
    { _id: id, ...branchFilter },
    { isRead: true },
    { new: true }
  );
  if (!notify) {
    const err = new Error('Notification alert not found');
    err.statusCode = 404;
    throw err;
  }
  return notify;
};

const markAllAsRead = async (branchFilter) => {
  await Notification.updateMany({ ...branchFilter, isRead: false }, { isRead: true });
  return { success: true, message: 'All alert feeds marked as read' };
};

module.exports = {
  listNotifications,
  triggerNotification,
  markAsRead,
  markAllAsRead,
};
