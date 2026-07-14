/**
 * roleCheck — restricts a route to the given roles.
 * Must be used AFTER protect middleware (requires req.user).
 *
 * Usage: router.get('/branches', protect, roleCheck('super_admin'), controller.list)
 */
const roleCheck = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      const err = new Error('Authentication required');
      err.statusCode = 401;
      return next(err);
    }
    if (!roles.includes(req.user.role)) {
      const err = new Error(`Access denied. Required role(s): ${roles.join(', ')}`);
      err.statusCode = 403;
      return next(err);
    }
    next();
  };
};

module.exports = { roleCheck };
