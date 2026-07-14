const notificationService = require('./service');

const list = async (req, res) => {
  const data = await notificationService.listNotifications(req.branchFilter);
  res.json({ success: true, data: { notifications: data } });
};

const create = async (req, res) => {
  const branchId = req.user.role === 'super_admin'
    ? (req.body.branchId || req.user.branchId)
    : req.user.branchId;

  if (!branchId) {
    const err = new Error('Branch assignment is required to trigger a notification');
    err.statusCode = 400;
    throw err;
  }

  const notify = await notificationService.triggerNotification({
    branchId,
    title: req.body.title,
    message: req.body.message,
    type: req.body.type,
    userId: req.body.userId || null,
  });

  res.status(201).json({ success: true, message: 'Notification triggered', data: { notification: notify } });
};

const read = async (req, res) => {
  const notify = await notificationService.markAsRead(req.params.id, req.branchFilter);
  res.json({ success: true, message: 'Alert marked as read', data: { notification: notify } });
};

const readAll = async (req, res) => {
  const result = await notificationService.markAllAsRead(req.branchFilter);
  res.json({ success: true, message: result.message });
};

module.exports = {
  list,
  create,
  read,
  readAll,
};
