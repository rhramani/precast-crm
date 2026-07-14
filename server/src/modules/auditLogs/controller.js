const AuditLog = require('./model');

const list = async (req, res) => {
  // Access control guard
  if (req.user.role !== 'super_admin') {
    const err = new Error('Access denied to system logs');
    err.statusCode = 403;
    throw err;
  }

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.module) {
    filter.module = req.query.module;
  }
  if (req.query.action) {
    filter.action = req.query.action;
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { logs },
    meta: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

module.exports = { list };
