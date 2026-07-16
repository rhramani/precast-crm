const Labour = require('./model');
const LabourAttendance = require('./attendanceModel');

const buildMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});

// 1. List Labourers
const listLabour = async (branchFilter, { page = 1, limit = 10, search, projectId, siteId }) => {
  const filter = { ...branchFilter };
  if (search) {
    filter.labourName = { $regex: search, $options: 'i' };
  }
  if (projectId) filter.projectId = projectId;
  if (siteId) filter.siteId = siteId;

  const skip = (page - 1) * limit;

  const [labourers, total] = await Promise.all([
    Labour.find(filter)
      .populate('projectId', 'projectName')
      .populate('siteId', 'siteName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Labour.countDocuments(filter),
  ]);

  return { labourers, meta: buildMeta(Number(page), Number(limit), total) };
};

// 2. Create Labourer
const createLabour = async (branchId, data) => {
  if (data.projectId === '') data.projectId = null;
  if (data.siteId === '') data.siteId = null;
  const labour = await Labour.create({ ...data, branchId });
  return labour;
};

// 3. Update details
const updateLabour = async (id, branchFilter, data) => {
  if (data.projectId === '') data.projectId = null;
  if (data.siteId === '') data.siteId = null;
  const labour = await Labour.findOneAndUpdate({ _id: id, ...branchFilter }, data, { new: true, runValidators: true });
  if (!labour) {
    const err = new Error('Labour record not found');
    err.statusCode = 404;
    throw err;
  }
  return labour;
};

// 4. Batch Attendance logging (Upsert logic)
const logAttendance = async (branchId, { date, projectId, siteId, records }) => {
  const savedRecords = [];
  const attendanceDate = new Date(date);
  attendanceDate.setUTCHours(0, 0, 0, 0); // normalize time

  for (const record of records) {
    // Check if labourer belongs to this branch
    const labourer = await Labour.findOne({ _id: record.labourId, branchId });
    if (!labourer) continue;

    if (record.status === 'unmarked') {
      await LabourAttendance.deleteOne({ labourId: record.labourId, date: attendanceDate });
      continue;
    }

    const resolvedProjectId = projectId || labourer.projectId || null;
    const resolvedSiteId = siteId || labourer.siteId || null;

    const entry = await LabourAttendance.findOneAndUpdate(
      { labourId: record.labourId, date: attendanceDate },
      {
        branchId,
        status: record.status,
        projectId: resolvedProjectId,
        siteId: resolvedSiteId,
        remarks: record.remarks || '',
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    savedRecords.push(entry);
  }

  return savedRecords;
};

// 5. Fetch Attendance Logs
const listAttendance = async (branchFilter, { date, startDate, endDate }) => {
  const query = { ...branchFilter };
  if (startDate && endDate) {
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);
    query.date = { $gte: start, $lte: end };
  } else if (date) {
    const queryDate = new Date(date);
    queryDate.setUTCHours(0, 0, 0, 0);
    query.date = queryDate;
  }

  const logs = await LabourAttendance.find(query)
    .populate('labourId', 'labourName labourType dailyWages')
    .sort({ createdAt: -1 });

  return logs;
};

// 6. Delete Labourer profile and clean up associated attendance logs
const deleteLabour = async (id, branchFilter) => {
  const labour = await Labour.findOneAndDelete({ _id: id, ...branchFilter });
  if (!labour) {
    const err = new Error('Labour record not found');
    err.statusCode = 404;
    throw err;
  }
  // Also clean up their attendance logs
  await LabourAttendance.deleteMany({ labourId: id });
  return labour;
};

module.exports = {
  listLabour,
  createLabour,
  updateLabour,
  logAttendance,
  listAttendance,
  deleteLabour,
};

