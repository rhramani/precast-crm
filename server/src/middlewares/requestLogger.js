const morgan = require('morgan');

/**
 * Request logger middleware.
 * Uses 'dev' format in development, 'combined' in production.
 */
const requestLogger = morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev');

module.exports = requestLogger;
