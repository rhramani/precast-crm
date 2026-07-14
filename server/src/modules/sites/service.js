const Site = require('./model');
const Project = require('../projects/model');
const SiteCalculation = require('./calculationModel');

// 1. Create Site
const createSite = async (branchId, data) => {
  const project = await Project.findById(data.projectId);
  if (!project) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }

  const site = await Site.create({
    ...data,
    branchId,
  });

  return site;
};

// 2. Update Site
const updateSite = async (id, branchFilter, data) => {
  const site = await Site.findOneAndUpdate({ _id: id, ...branchFilter }, data, { new: true, runValidators: true });
  if (!site) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }
  return site;
};

// 3. Update Status
const updateSiteStatus = async (id, branchFilter, status) => {
  const site = await Site.findOneAndUpdate({ _id: id, ...branchFilter }, { status }, { new: true });
  if (!site) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }
  return site;
};

// 4. Site Requirement Calculator (Read-only calculation logic)
const calculateRequirements = async (id, branchFilter, siteArea) => {
  const site = await Site.findOne({ _id: id, ...branchFilter });
  if (!site) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }

  // Linear length of the wall is represented by siteArea (in meters)
  const length = Number(siteArea);

  // Standard boundary wall spacing:
  // Post-to-post spacing is 3 meters.
  const bays = Math.ceil(length / 3) || 1;

  // Stack of 8 precast panels per bay to reach a standard 2.4 meter height (each panel is 0.3m height)
  const wallPanels = bays * 8;
  const poles = bays + 1;
  const beams = bays;
  const topBeams = bays;

  // Material estimations:
  // Panels: 0.5 bags cement, 8kg steel, 50kg aggregate
  // Poles: 1.0 bag cement, 15kg steel, 100kg aggregate
  const cement = Math.ceil((wallPanels * 0.5) + (poles * 1.0));
  const steel = Math.ceil((wallPanels * 8) + (poles * 15));
  const aggregate = Math.ceil((wallPanels * 50) + (poles * 100)); // in kg

  // Labor: 1 crew day per 15 meters. Crew is 4 workers.
  const installationDays = Math.ceil(length / 15) || 1;
  const labour = installationDays * 4; // man-days

  // Transport: 1 flatbed truck load holds 20 slabs or 15 poles.
  const transportTrips = Math.ceil((wallPanels / 20) + (poles / 15)) || 1;

  // Estimations using direct component purchase costs:
  // panel = ₹700, pole = ₹1400, installer/man-day = ₹800, transport trip = ₹3500
  const panelCost = wallPanels * 700;
  const poleCost = poles * 1400;
  const laborCost = labour * 800;
  const transportCost = transportTrips * 3500;
  const estimatedCost = panelCost + poleCost + laborCost + transportCost;

  const result = {
    wallPanels,
    poles,
    beams,
    topBeams,
    cement,
    steel,
    aggregate,
    labour,
    installationDays,
    transportTrips,
    estimatedCost,
  };

  // We can choose to persist this calculation reference for reports/logs
  await SiteCalculation.create({
    siteId: site._id,
    siteArea: length,
    calculated: result,
  });

  return { site, siteArea: length, calculated: result };
};

const getSite = async (id, branchFilter) => {
  const site = await Site.findOne({ _id: id, ...branchFilter }).populate('projectId', 'projectName customerId');
  return site;
};

// 6. Delete Site and cleanup calculations
const deleteSite = async (id, branchFilter) => {
  const site = await Site.findOneAndDelete({ _id: id, ...branchFilter });
  if (!site) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }
  await SiteCalculation.deleteMany({ siteId: id });
  return site;
};

module.exports = {
  createSite,
  updateSite,
  updateSiteStatus,
  calculateRequirements,
  getSite,
  deleteSite,
};


