const mongoose = require('mongoose');
const Equipment = require('./model');
const Site = require('../sites/model');

const buildMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});

// 1. List Equipment
const listEquipment = async (branchFilter, { page = 1, limit = 10, search, status, type, sortBy = 'createdAt', sortOrder = 'desc' }) => {
  const filter = { ...branchFilter };

  if (search) {
    filter.name = { $regex: search, $options: 'i' };
  }
  if (status) {
    filter.status = status;
  }
  if (type) {
    filter.type = type;
  }

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [equipment, total] = await Promise.all([
    Equipment.find(filter).populate('allocatedTo', 'siteName').sort(sort).skip(skip).limit(Number(limit)),
    Equipment.countDocuments(filter),
  ]);

  return { equipment, meta: buildMeta(Number(page), Number(limit), total) };
};

// 2. Create Equipment
const createEquipment = async (branchId, data) => {
  const equipment = await Equipment.create({
    ...data,
    branchId,
  });
  return equipment;
};

// 3. Update Equipment
const updateEquipment = async (id, branchFilter, data) => {
  const equipment = await Equipment.findOneAndUpdate(
    { _id: id, ...branchFilter },
    data,
    { new: true, runValidators: true }
  );

  if (!equipment) {
    const err = new Error('Equipment not found');
    err.statusCode = 404;
    throw err;
  }

  return equipment;
};

// 4. Allocate Equipment to Site
const allocateEquipment = async (id, branchFilter, siteId) => {
  const site = await Site.findById(siteId);
  if (!site) {
    const err = new Error('Destination site not found');
    err.statusCode = 404;
    throw err;
  }

  const equipment = await Equipment.findOneAndUpdate(
    { _id: id, ...branchFilter },
    { status: 'allocated', allocatedTo: siteId },
    { new: true }
  );

  if (!equipment) {
    const err = new Error('Equipment not found');
    err.statusCode = 404;
    throw err;
  }

  return equipment;
};

// 5. Release Equipment
const releaseEquipment = async (id, branchFilter) => {
  const equipment = await Equipment.findOneAndUpdate(
    { _id: id, ...branchFilter },
    { status: 'available', allocatedTo: null },
    { new: true }
  );

  if (!equipment) {
    const err = new Error('Equipment not found');
    err.statusCode = 404;
    throw err;
  }

  return equipment;
};

// 6. Delete Equipment
const deleteEquipment = async (id, branchFilter) => {
  const equipment = await Equipment.findOneAndDelete({ _id: id, ...branchFilter });
  if (!equipment) {
    const err = new Error('Equipment not found');
    err.statusCode = 404;
    throw err;
  }
  return equipment;
};

module.exports = {
  listEquipment,
  createEquipment,
  updateEquipment,
  allocateEquipment,
  releaseEquipment,
  deleteEquipment,
};
