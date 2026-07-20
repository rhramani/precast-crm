const Project = require('./model');
const Site = require('../sites/model');
const SiteCalculation = require('../sites/calculationModel');
const WallCategoryTemplate = require('../wallTemplates/model');
const Product = require('../products/model');

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
    .populate('wallTemplateId', 'name category')
    .sort({ createdAt: -1 });
  return sites;
};

const getCombinedRequirements = async (projectId, branchFilter) => {
  const sites = await Site.find({ projectId, ...branchFilter });
  const productMap = {};

  for (const site of sites) {
    const calculation = await SiteCalculation.findOne({ siteId: site._id }).sort({ createdAt: -1 });
    if (!calculation) continue;

    let template = null;
    if (site.wallTemplateId) {
      template = await WallCategoryTemplate.findById(site.wallTemplateId).populate({ path: 'products.productId', populate: { path: 'category' } });
    } else {
      template = await WallCategoryTemplate.findOne({ branchId: site.branchId, isDefault: true }).populate({ path: 'products.productId', populate: { path: 'category' } });
    }

    if (!template) continue;

    const { wallPanels = 0, poles = 0, beams = 0, topBeams = 0 } = calculation.calculated || {};

    for (const pLine of template.products) {
      const prod = pLine.productId;
      if (!prod) continue;

      const catKey = prod.category?.name
        ? prod.category.name.toLowerCase().replace(/[\s-]/g, '_')
        : (typeof prod.category === 'string' ? prod.category : '');
      let quantity = 0;

      if (['cement_wall', 'compound_wall', 'boundary_wall', 'slab'].includes(catKey)) {
        quantity = wallPanels;
      } else if (['pole', 'column'].includes(catKey)) {
        quantity = poles;
      } else if (catKey === 'beam') {
        quantity = beams;
      } else if (catKey === 'top_beam') {
        quantity = topBeams;
      }

      if (quantity > 0) {
        const prodId = prod._id.toString();
        if (!productMap[prodId]) {
          productMap[prodId] = {
            productId: prod._id,
            productName: prod.productName,
            productCode: prod.productCode,
            quantity: 0,
            rate: prod.sellingPrice || 0,
            taxPercent: 18,
          };
        }
        productMap[prodId].quantity += quantity;
      }
    }
  }

  return Object.values(productMap);
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
  getCombinedRequirements,
  deleteProject,
};
