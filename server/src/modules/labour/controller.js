const labourService = require('./service');

const list = async (req, res) => {
  const { page, limit, search } = req.query;
  const result = await labourService.listLabour(req.branchFilter, { page, limit, search });
  res.json({ success: true, data: { labourers: result.labourers }, meta: result.meta });
};

const create = async (req, res) => {
  const branchId = req.user.role === 'super_admin'
    ? (req.body.branchId || req.user.branchId)
    : req.user.branchId;

  if (!branchId) {
    const err = new Error('Branch assignment is required to register labour');
    err.statusCode = 400;
    throw err;
  }

  const labour = await labourService.createLabour(branchId, req.body);
  res.status(201).json({ success: true, message: 'Labour profiles added', data: { labour } });
};

const update = async (req, res) => {
  const labour = await labourService.updateLabour(req.params.id, req.branchFilter, req.body);
  res.json({ success: true, message: 'Labour profile updated', data: { labour } });
};

const saveAttendance = async (req, res) => {
  const branchId = req.user.role === 'super_admin'
    ? (req.body.branchId || req.user.branchId)
    : req.user.branchId;

  if (!branchId) {
    const err = new Error('Branch assignment is required to record attendance');
    err.statusCode = 400;
    throw err;
  }

  const saved = await labourService.logAttendance(branchId, req.body);
  res.json({ success: true, message: 'Attendance records registered successfully', data: { records: saved } });
};

const getAttendance = async (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ success: false, message: 'Date parameter is required to query attendance log' });
  }
  const result = await labourService.listAttendance(req.branchFilter, { date });
  res.json({ success: true, data: { attendance: result } });
};

const remove = async (req, res) => {
  await labourService.deleteLabour(req.params.id, req.branchFilter);
  res.json({ success: true, message: 'Labour profile deleted successfully' });
};

module.exports = {
  list,
  create,
  update,
  saveAttendance,
  getAttendance,
  remove,
};

