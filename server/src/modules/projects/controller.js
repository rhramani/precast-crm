const projectService = require('./service');

const list = async (req, res) => {
  const { page, limit, search, status } = req.query;
  const result = await projectService.listProjects({ page, limit, search, status });
  res.json({ success: true, data: { projects: result.projects }, meta: result.meta });
};

const create = async (req, res) => {
  const project = await projectService.createProject(req.body);
  res.status(201).json({ success: true, message: 'Project created successfully', data: { project } });
};

const update = async (req, res) => {
  const project = await projectService.updateProject(req.params.id, req.body);
  res.json({ success: true, message: 'Project details updated', data: { project } });
};

const getOne = async (req, res) => {
  const project = await projectService.getProject(req.params.id);
  res.json({ success: true, data: { project } });
};

const getSites = async (req, res) => {
  const sites = await projectService.getProjectSites(req.params.id, req.branchFilter);
  res.json({ success: true, data: { sites } });
};

const remove = async (req, res) => {
  await projectService.deleteProject(req.params.id);
  res.json({ success: true, message: 'Project deleted successfully' });
};

module.exports = {
  list,
  create,
  update,
  getOne,
  getSites,
  remove,
};
