const AuditLog = require('../modules/auditLogs/model');

/**
 * Log activity helper to write operational audit records on successful write transactions.
 */
const logActivity = async (userId, action, moduleName, referenceId = null, ipAddress = '') => {
  try {
    await AuditLog.create({
      userId,
      action,
      module: moduleName,
      referenceId: referenceId || undefined,
      ipAddress,
    });
  } catch (err) {
    console.error('⚠️ Failed to write audit log:', err.message);
  }
};

module.exports = { logActivity };
