const customerService = require('./service');

const list = async (req, res) => {
  const { page, limit, search, status } = req.query;
  const result = await customerService.listCustomers({ page, limit, search, status });
  res.json({ success: true, data: { customers: result.customers }, meta: result.meta });
};

const create = async (req, res) => {
  const customer = await customerService.createCustomer(req.body);
  res.status(201).json({ success: true, message: 'Customer created successfully', data: { customer } });
};

const update = async (req, res) => {
  const customer = await customerService.updateCustomer(req.params.id, req.body);
  res.json({ success: true, message: 'Customer details updated', data: { customer } });
};

const getOne = async (req, res) => {
  const customer = await customerService.getCustomer(req.params.id);
  res.json({ success: true, data: { customer } });
};

const ledger = async (req, res) => {
  const result = await customerService.getCustomerLedger(req.params.id);
  res.json({ success: true, data: result });
};

const outstanding = async (req, res) => {
  const result = await customerService.getCustomerOutstanding(req.params.id);
  res.json({ success: true, data: result });
};

const remove = async (req, res) => {
  await customerService.deleteCustomer(req.params.id);
  res.json({ success: true, message: 'Customer deleted successfully' });
};

const getDistance = async (req, res) => {
  const { origin, destination } = req.query;
  const distanceKm = await customerService.getDistanceBetweenAddresses(origin, destination);
  res.json({ success: true, data: { distanceKm } });
};

module.exports = {
  list,
  create,
  update,
  getOne,
  ledger,
  outstanding,
  remove,
  getDistance,
};
