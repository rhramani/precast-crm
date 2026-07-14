/**
 * notFound middleware — catches any request that reaches here without a matching route.
 */
const notFound = (req, res, next) => {
  const err = new Error(`Not Found — ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
};

module.exports = notFound;
