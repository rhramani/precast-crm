const mongoose = require('mongoose');
const Branch = require('../modules/branches/model');

/**
 * branchScope — auto-injects a branchId filter based on the authenticated user's role.
 * Restricts query boundaries to only match active existing branches in the database.
 */
const branchScope = async (req, res, next) => {
  if (!req.user) {
    const err = new Error('Authentication required');
    err.statusCode = 401;
    return next(err);
  }

  try {
    if (req.user.role === 'branch') {
      req.branchFilter = { branchId: req.user.branchId };
    } else {
      // super_admin: optional ?branchId= query param
      if (req.query.branchId) {
        const exists = await Branch.exists({ _id: req.query.branchId });
        if (exists) {
          req.branchFilter = { branchId: req.query.branchId };
        } else {
          // branch was deleted or does not exist — force query to return empty
          req.branchFilter = { branchId: new mongoose.Types.ObjectId() };
        }
      } else {
        // Fetch all active branch IDs to exclude data of deleted branches
        const activeBranches = await Branch.find({}, '_id');
        const activeBranchIds = activeBranches.map(b => b._id);
        req.branchFilter = { branchId: { $in: activeBranchIds } };
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { branchScope };
