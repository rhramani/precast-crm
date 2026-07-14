const jwt = require('jsonwebtoken');

/**
 * protect — verifies the Bearer JWT and attaches req.user.
 * JWT payload: { userId, role, branchId } as per design doc §4.2.
 */
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err = new Error('Authentication required. Please log in.');
    err.statusCode = 401;
    return next(err);
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, role, branchId }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      const e = new Error('Token expired');
      e.statusCode = 401;
      return next(e);
    }
    const e = new Error('Invalid token');
    e.statusCode = 401;
    return next(e);
  }
};

module.exports = { protect };
