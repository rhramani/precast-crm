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
  const { calculateRequirements } = require('../sites/service');

  let totalComponentsCost = 0;
  let totalRawMaterialCost = 0;
  let totalTransportCost = 0;
  let totalLabourCost = 0;

  for (const site of sites) {
    let reqs = null;
    try {
      const siteArea = site.siteArea || 1000;
      const calcResult = await calculateRequirements(site._id, branchFilter, siteArea);
      reqs = calcResult.calculated;
    } catch (e) {
      console.error(`Failed to calculate requirements for site ${site._id}:`, e);
      continue;
    }

    if (!reqs) continue;

    const {
      wallPanels = 0,
      poles = 0,
      beams = 0,
      topBeams = 0,
      prices = {},
      rawMaterialCost = 0,
      transportCost = 0,
      actualLaborCost = 0,
    } = reqs;

    totalRawMaterialCost += rawMaterialCost || 0;
    totalTransportCost += transportCost || 0;
    totalLabourCost += actualLaborCost || 0;

    let template = null;
    if (site.wallTemplateId) {
      template = await WallCategoryTemplate.findById(site.wallTemplateId).populate({ path: 'products.productId', populate: { path: 'category' } });
    } else {
      template = await WallCategoryTemplate.findOne({ branchId: site.branchId, isDefault: true }).populate({ path: 'products.productId', populate: { path: 'category' } });
    }

    if (!template) continue;

    for (const pLine of template.products) {
      const prod = pLine.productId;
      if (!prod) continue;

      const prodName = prod.productName?.toLowerCase() || '';
      const prodCode = prod.productCode?.toLowerCase() || '';
      const catKey = prod.category?.name
        ? prod.category.name.toLowerCase().replace(/[\s-]/g, '_')
        : (typeof prod.category === 'string' ? prod.category : '');
      let quantity = 0;
      let unitPrice = prod.sellingPrice || 0;

      const isPole = ['pole', 'column'].includes(catKey) || prodName.includes('column') || prodName.includes('pole') || prodName.includes('post') || prodCode.includes('col');
      const isTopBeam = catKey === 'top_beam' || prodName.includes('top beam');
      const isBeam = (catKey === 'beam' || prodName.includes('beam')) && !isTopBeam;
      const isPanel = !isPole && !isBeam && !isTopBeam && (['cement_wall', 'compound_wall', 'boundary_wall', 'slab'].includes(catKey) || prodName.includes('panel') || prodName.includes('slab') || prodName.includes('wall'));

      if (isPanel) {
        quantity = wallPanels;
        unitPrice = prices.panel || unitPrice;
      } else if (isPole) {
        quantity = poles;
        unitPrice = prices.pole || unitPrice;
      } else if (isBeam) {
        quantity = beams;
        unitPrice = prices.beam || unitPrice;
      } else if (isTopBeam) {
        quantity = topBeams;
        unitPrice = prices.topBeam || unitPrice;
      }

      if (quantity > 0) {
        const prodId = prod._id.toString();
        if (!productMap[prodId]) {
          productMap[prodId] = {
            productId: prod._id,
            productName: prod.productName,
            productCode: prod.productCode,
            quantity: 0,
            rate: unitPrice,
            taxPercent: 18,
          };
        }
        productMap[prodId].quantity += quantity;
        totalComponentsCost += quantity * unitPrice;
      }
    }
  }

  const items = Object.values(productMap);
  const subTotal = totalComponentsCost + totalRawMaterialCost + totalTransportCost + totalLabourCost;
  const taxAmount = subTotal * 0.18;
  const grandTotal = subTotal + taxAmount;

  return {
    items,
    summary: {
      siteCount: sites.length,
      componentsCost: Math.round(totalComponentsCost),
      rawMaterialCost: Math.round(totalRawMaterialCost),
      transportCost: Math.round(totalTransportCost),
      labourCost: Math.round(totalLabourCost),
      subTotal: Math.round(subTotal),
      taxAmount: Math.round(taxAmount),
      grandTotal: Math.round(grandTotal),
    },
  };
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
