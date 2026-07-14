const dispatchService = require('./service');

const list = async (req, res) => {
  const { page, limit, search, status } = req.query;
  const result = await dispatchService.listDispatches(req.branchFilter, { page, limit, search, status });
  res.json({ success: true, data: { dispatches: result.dispatches }, meta: result.meta });
};

const create = async (req, res) => {
  const branchId = req.user.role === 'super_admin'
    ? (req.body.branchId || req.user.branchId)
    : req.user.branchId;

  if (!branchId) {
    const err = new Error('Branch assignment is required to create a dispatch');
    err.statusCode = 400;
    throw err;
  }

  const dispatch = await dispatchService.createDispatch(branchId, req.user.userId, req.body);
  res.status(201).json({ success: true, message: 'Dispatch record created', data: { dispatch } });
};

const getOne = async (req, res) => {
  const dispatch = await dispatchService.getDispatch(req.params.id, req.branchFilter);
  res.json({ success: true, data: { dispatch } });
};

const update = async (req, res) => {
  const dispatch = await dispatchService.updateDispatch(req.params.id, req.branchFilter, req.body);
  res.json({ success: true, message: 'Dispatch updated successfully', data: { dispatch } });
};

const markDispatched = async (req, res) => {
  const dispatch = await dispatchService.confirmDispatch(req.params.id, req.branchFilter, req.user.userId);
  res.json({ success: true, message: 'Dispatch confirmed. Inventory decremented.', data: { dispatch } });
};

const markDelivered = async (req, res) => {
  const dispatch = await dispatchService.confirmDelivery(req.params.id, req.branchFilter);
  res.json({ success: true, message: 'Delivery confirmed successfully', data: { dispatch } });
};

module.exports = {
  list,
  create,
  getOne,
  update,
  markDispatched,
  markDelivered,
};
