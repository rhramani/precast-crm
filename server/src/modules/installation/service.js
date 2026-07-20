const Installation = require('./model');
const Project = require('../projects/model');
const Site = require('../sites/model');

const buildMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});

// 1. List Installations
const listInstallations = async (branchFilter, { page = 1, limit = 10, search, status, startDate, endDate }) => {
  const filter = { ...branchFilter };
  if (search) {
    filter.installNumber = { $regex: search, $options: 'i' };
  }
  if (status) {
    filter.status = status;
  }
  if (startDate) {
    filter.startDate = endDate ? { $gte: new Date(startDate), $lte: new Date(endDate) } : { $gte: new Date(startDate) };
  }

  const skip = (page - 1) * limit;

  const [installations, total] = await Promise.all([
    Installation.find(filter)
      .populate('projectId', 'projectName')
      .populate('siteId', 'siteName siteAddress')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Installation.countDocuments(filter),
  ]);

  return { installations, meta: buildMeta(Number(page), Number(limit), total) };
};

// 2. Create Installation
const createInstallation = async (branchId, userId, data) => {
  // Check project & site exist
  const project = await Project.findById(data.projectId);
  if (!project) {
    const err = new Error('Project mapping is invalid');
    err.statusCode = 404;
    throw err;
  }

  const site = await Site.findOne({ _id: data.siteId, projectId: data.projectId });
  if (!site) {
    const err = new Error('Site mapping is invalid or does not belong to selected project');
    err.statusCode = 404;
    throw err;
  }

  const installNumber = data.installNumber || `INS-${Date.now().toString().slice(-8)}`;

  // Double check uniqueness
  const conflict = await Installation.findOne({ branchId, installNumber });
  if (conflict) {
    const err = new Error(`Installation sequence number '${installNumber}' already exists`);
    err.statusCode = 409;
    throw err;
  }

  const installation = await Installation.create({
    branchId,
    projectId: data.projectId,
    siteId: data.siteId,
    installNumber,
    itemsInstalled: data.itemsInstalled,
    teamSize: data.teamSize || 0,
    labourCount: data.labourCount || 0,
    status: 'planned',
    createdBy: userId,
  });

  return installation;
};

const getInstallation = async (id, branchFilter) => {
  const installation = await Installation.findOne({ _id: id, ...branchFilter })
    .populate('projectId')
    .populate('siteId')
    .populate('itemsInstalled.productId', 'productName productCode unit');

  if (!installation) {
    const err = new Error('Installation record not found');
    err.statusCode = 404;
    throw err;
  }

  return installation;
};

// 3. Update Details
const updateInstallation = async (id, branchFilter, data) => {
  const installation = await Installation.findOne({ _id: id, ...branchFilter });
  if (!installation) {
    const err = new Error('Installation record not found');
    err.statusCode = 404;
    throw err;
  }

  if (installation.status === 'completed') {
    const err = new Error('Completed installations cannot be modified');
    err.statusCode = 400;
    throw err;
  }

  if (data.itemsInstalled) installation.itemsInstalled = data.itemsInstalled;
  if (data.teamSize !== undefined)       installation.teamSize = data.teamSize;
  if (data.labourCount !== undefined)   installation.labourCount = data.labourCount;

  if (data.status) {
    installation.status = data.status;
    if (data.status === 'in_progress' && !installation.startDate) {
      installation.startDate = new Date();
    }
    if (data.status === 'completed') {
      installation.completedDate = new Date();
      // If installation completed, automatically sync project site status to completed!
      const site = await Site.findById(installation.siteId);
      if (site && site.status !== 'completed') {
        site.status = 'completed';
        if (!site.endDate) site.endDate = new Date();
        await site.save();

        const { triggerNotification } = require('../notifications/service');
        await triggerNotification({
          branchId: installation.branchId,
          title: 'Site Installation Completed',
          message: `Site installation is fully completed for '${site.siteName}'!`,
          type: 'site_completed',
        });
      }
    }
  }

  await installation.save();
  return installation;
};

// 4. Update Status (Transition methods)
const updateStatus = async (id, branchFilter, status) => {
  return await updateInstallation(id, branchFilter, { status });
};

module.exports = {
  listInstallations,
  createInstallation,
  getInstallation,
  updateInstallation,
  updateStatus,
};
