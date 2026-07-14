const Project = require('./model');
const Site = require('../sites/model');

const buildMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});

const listProjects = async ({ page = 1, limit = 10, search, status }) => {
  const filter = {};
  if (search) {
    filter.projectName = { $regex: search, $options: 'i' };
  }
  if (status) filter.status = status;

  const skip = (page - 1) * limit;

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .populate('customerId', 'customerName companyName mobile')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Project.countDocuments(filter),
  ]);

  return { projects, meta: buildMeta(Number(page), Number(limit), total) };
};

const createProject = async (data) => {
  const project = await Project.create(data);
  return project;
};

const updateProject = async (id, data) => {
  const project = await Project.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!project) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }
  return project;
};

const getProject = async (id) => {
  const project = await Project.findById(id).populate('customerId', 'customerName companyName mobile');
  if (!project) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }
  return project;
};

const getProjectSites = async (projectId, branchFilter) => {
  const sites = await Site.find({ projectId, ...branchFilter })
    .populate('projectId', 'projectName')
    .sort({ createdAt: -1 });
  return sites;
};

const deleteProject = async (id) => {
  const project = await Project.findByIdAndDelete(id);
  if (!project) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }
  return { success: true };
};

module.exports = {
  listProjects,
  createProject,
  updateProject,
  getProject,
  getProjectSites,
  deleteProject,
};
