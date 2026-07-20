const Site = require('./model');
const Project = require('../projects/model');
const SiteCalculation = require('./calculationModel');
const WallCategoryTemplate = require('../wallTemplates/model');

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

  // Fetch the selected template or fallback to the branch default
  let template = null;
  if (site.wallTemplateId) {
    template = await WallCategoryTemplate.findById(site.wallTemplateId)
      .populate({ path: 'products.productId', populate: { path: 'category' } })
      .populate({
        path: 'installationMaterials.materialId',
        populate: { path: 'category', select: 'name' }
      });
  } else {
    template = await WallCategoryTemplate.findOne({ branchId: site.branchId, isDefault: true })
      .populate({ path: 'products.productId', populate: { path: 'category' } })
      .populate({
        path: 'installationMaterials.materialId',
        populate: { path: 'category', select: 'name' }
      });
  }

  const wallAreaSqft = (length / 0.3048) * (template ? template.heightFeet || 6 : 6);

  // Identify products in the template by their category mappings
  let panelQtyPerSqft = 0.1355; // default fallback if no template
  let poleQtyPerSqft = 0.0169;
  let beamQtyPerSqft = 0.0169;
  let topBeamQtyPerSqft = 0.0169;

  let panelProduct = null;
  let poleProduct = null;
  let beamProduct = null;
  let topBeamProduct = null;

  if (template && template.products) {
    for (const pLine of template.products) {
      const prod = pLine.productId;
      if (!prod) continue;
      
      const catKey = prod.category?.name
        ? prod.category.name.toLowerCase().replace(/[\s-]/g, '_')
        : (typeof prod.category === 'string' ? prod.category : '');

      if (['cement_wall', 'compound_wall', 'boundary_wall', 'slab'].includes(catKey)) {
        panelQtyPerSqft = pLine.qtyPerSqft;
        panelProduct = prod;
      } else if (['pole', 'column'].includes(catKey)) {
        poleQtyPerSqft = pLine.qtyPerSqft;
        poleProduct = prod;
      } else if (catKey === 'beam') {
        beamQtyPerSqft = pLine.qtyPerSqft;
        beamProduct = prod;
      } else if (catKey === 'top_beam') {
        topBeamQtyPerSqft = pLine.qtyPerSqft;
        topBeamProduct = prod;
      }
    }
  }

  const wallPanels = Math.ceil(wallAreaSqft * panelQtyPerSqft);
  const poles = Math.ceil(wallAreaSqft * poleQtyPerSqft) + 1; // 1 extra post at the end
  const beams = Math.ceil(wallAreaSqft * beamQtyPerSqft);
  const topBeams = Math.ceil(wallAreaSqft * topBeamQtyPerSqft);

  // Site Installation Raw Materials (needed on client's site for Column foundations & joint grouting)
  // Dynamically calculated using template's installationMaterials array populated from Raw Material Master
  let cement = 0;
  let steel = 0;
  let aggregate = 0;
  let rawMaterialCost = 0;
  const rawMaterialBreakdown = [];

  if (template && template.installationMaterials && template.installationMaterials.length > 0) {
    for (const item of template.installationMaterials) {
      const mat = item.materialId;
      if (!mat) continue;

      let multiplier = 0;
      if (item.type === 'per_pole') {
        multiplier = poles;
      } else if (item.type === 'per_sqft' || item.type === 'per_meter') {
        multiplier = wallAreaSqft;
      }

      const totalQty = item.qty * multiplier;
      const getCategoryName = (cat) => (cat && typeof cat === 'object' ? cat.name : cat);
      const catName = getCategoryName(mat.category);

      let rate = mat.purchaseRate || 0;
      if (catName === 'cement' && site.cementRate) {
        rate = site.cementRate;
      } else if (catName === 'steel' && site.steelRate) {
        rate = site.steelRate;
      } else if (['sand', 'aggregate', 'stone_dust', 'fly_ash'].includes(catName) && site.aggregateRate) {
        rate = site.aggregateRate;
      }
      const totalCost = totalQty * rate;
      rawMaterialCost += totalCost;

      rawMaterialBreakdown.push({
        materialId: mat._id,
        materialName: mat.materialName,
        materialCode: mat.materialCode,
        category: catName,
        quantity: Math.ceil(totalQty),
        unit: mat.unit,
        rate,
        totalCost: Math.ceil(totalCost)
      });

      if (catName === 'cement') {
        cement += totalQty;
      } else if (catName === 'steel') {
        steel += totalQty;
      } else if (['sand', 'aggregate', 'stone_dust', 'fly_ash'].includes(catName)) {
        aggregate += totalQty;
      }
    }
  } else {
    // Fallback standard defaults if template has no installation materials defined
    cement = (poles * 0.5) + (length * 0.05);
    steel = poles * 2;
    aggregate = poles * 50;
    // Assume standard rate presets: Cement: ₹400/bag, Steel: ₹60/kg, Aggregate: ₹2/kg
    rawMaterialCost = (cement * 400) + (steel * 60) + (aggregate * 2);
  }

  cement = Math.ceil(cement);
  steel = Math.ceil(steel);
  aggregate = Math.ceil(aggregate);
  rawMaterialCost = Math.ceil(rawMaterialCost);

  // Labor: Calculate planned duration from site's start & end dates, falling back to length estimation if undefined
  let installationDays = 1;
  if (site.startDate && site.endDate) {
    const diffTime = Math.abs(new Date(site.endDate) - new Date(site.startDate));
    installationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  } else {
    installationDays = Math.ceil(length / 15) || 1;
  }

  // Fetch actual logs from the database tabs (Dispatches & Labour Attendance)
  const Labour = require('../labour/model');
  const LabourAttendance = require('../labour/attendanceModel');
  const Dispatch = require('../dispatch/model');

  const actualDispatches = await Dispatch.find({ siteId: id });
  const transportTrips = actualDispatches.length;

  // Query attendance logs directly assigned to this site
  const directAttendance = await LabourAttendance.find({
    siteId: id,
    status: { $in: ['present', 'half_day'] }
  }).populate('labourId');

  // Fallback for older records: find labourers currently assigned to this site and get their logs that don't have siteId set
  const siteLabourers = await Labour.find({ siteId: id });
  const labourIds = siteLabourers.map((l) => l._id);
  
  const fallbackAttendance = labourIds.length > 0 ? await LabourAttendance.find({
    labourId: { $in: labourIds },
    siteId: { $exists: false },
    status: { $in: ['present', 'half_day'] }
  }).populate('labourId') : [];

  const attendance = [...directAttendance, ...fallbackAttendance];

  let labour = 0;
  attendance.forEach((att) => {
    if (att.status === 'present') {
      labour += 1;
    } else if (att.status === 'half_day') {
      labour += 0.5;
    }
  });

  // Fetch detailed breakdown of actual dispatches
  const dispatchesBreakdown = actualDispatches.map(d => ({
    challanNumber: d.dispatchNumber,
    dispatchDate: d.dispatchedDate || d.createdAt,
    driverName: d.transportDetails?.driverName || '—',
    vehicleNumber: d.transportDetails?.vehicleNumber || '—',
    status: d.status
  }));

  // Fetch detailed breakdown of labour attendance
  const labourBreakdown = [];
  if (siteLabourers && siteLabourers.length > 0) {
    siteLabourers.forEach(lab => {
      const atts = attendance.filter(a => {
        const aLabId = a.labourId?._id || a.labourId;
        return aLabId.toString() === lab._id.toString();
      });
      let days = 0;
      atts.forEach(a => {
        if (a.status === 'present') days += 1;
        else if (a.status === 'half_day') days += 0.5;
      });
      if (days > 0) {
        const wages = lab.dailyWages || 800;
        labourBreakdown.push({
          labourName: lab.labourName,
          labourType: lab.labourType,
          daysLogged: days,
          dailyWages: wages,
          totalCost: days * wages
        });
      }
    });
  }

  // Dynamically resolve product selling prices, falling back to site overrides, then Product Master, then standard presets
  const panelPrice = site.panelSellingPrice || (panelProduct ? (panelProduct.sellingPrice || 700) : 700);
  const polePrice = site.poleSellingPrice || (poleProduct ? (poleProduct.sellingPrice || 1400) : 1400);
  const beamPrice = site.beamSellingPrice || (beamProduct ? (beamProduct.sellingPrice || 500) : 500);
  const topBeamPrice = site.topBeamSellingPrice || (topBeamProduct ? (topBeamProduct.sellingPrice || 450) : 450);

  const panelCost = wallPanels * panelPrice;
  const poleCost = poles * polePrice;
  const beamCost = beams * beamPrice;
  const topBeamCost = topBeams * topBeamPrice;

  // Resolve average crew daily wage rates based on actual labourers assigned to this site, or active database workers in the branch
  let estimatedDailyWage = 0;
  let crewSize = 0;
  let compositionText = '';
  let masonRate = 0;
  let helperRate = 0;

  if (siteLabourers && siteLabourers.length > 0) {
    crewSize = siteLabourers.length;
    estimatedDailyWage = siteLabourers.reduce((sum, lab) => sum + (lab.dailyWages || 0), 0);
    
    // Group and count by labourType
    const counts = {};
    const rates = {};
    siteLabourers.forEach(l => {
      counts[l.labourType] = (counts[l.labourType] || 0) + 1;
      rates[l.labourType] = (rates[l.labourType] || 0) + (l.dailyWages || 0);
    });

    const parts = Object.keys(counts).map(type => {
      const count = counts[type];
      const avgRate = Math.round(rates[type] / count);
      const label = count === 1 ? type.toUpperCase() : `${type.toUpperCase()}s`;
      return `${count} ${label} @ ₹${avgRate.toLocaleString('en-IN')}/day`;
    });
    compositionText = parts.join(' + ');

    // Extract average rates for backwards compatibility
    const masonsList = siteLabourers.filter(l => l.labourType === 'mason');
    const helpersList = siteLabourers.filter(l => l.labourType === 'helper');
    masonRate = masonsList.length > 0 ? Math.round(masonsList.reduce((s, m) => s + (m.dailyWages || 0), 0) / masonsList.length) : 1200;
    helperRate = helpersList.length > 0 ? Math.round(helpersList.reduce((s, h) => s + (h.dailyWages || 0), 0) / helpersList.length) : 700;
  } else {
    // Resolve average crew daily wage rates from active database workers in the branch
    const activeLabourers = await Labour.find({ status: 'active', branchId: site.branchId });
    const activeMasons = activeLabourers.filter(l => l.labourType === 'mason');
    const activeHelpers = activeLabourers.filter(l => l.labourType === 'helper');

    masonRate = activeMasons.length > 0 
      ? Math.round(activeMasons.reduce((s, m) => s + (m.dailyWages || 0), 0) / activeMasons.length) 
      : 1200; // default mason rate if no active mason profile exists
    
    helperRate = activeHelpers.length > 0 
      ? Math.round(activeHelpers.reduce((s, h) => s + (h.dailyWages || 0), 0) / activeHelpers.length) 
      : 700; // default helper rate if no active helper profile exists

    // Use site-wise labor rate override if specified and greater than 0
    if (site.labourRatePerManDay && site.labourRatePerManDay > 0) {
      helperRate = site.labourRatePerManDay;
      masonRate = Math.round(site.labourRatePerManDay * 1.5);
    }

    crewSize = 4;
    estimatedDailyWage = (1 * masonRate) + (3 * helperRate);
    compositionText = `1 MASON @ ₹${masonRate.toLocaleString('en-IN')}/day + 3 HELPERS @ ₹${helperRate.toLocaleString('en-IN')}/day each`;
  }

  const estimatedLaborCost = installationDays * estimatedDailyWage;

  const estimatedTrips = Math.ceil(wallPanels / 50) || 1; // Capacity of 50 panels per truck trip
  const transportRate = (site.transportRatePerTrip && site.transportRatePerTrip > 0) ? site.transportRatePerTrip : 3500;
  const estimatedLogisticsCost = estimatedTrips * transportRate;

  const estimatedCost = panelCost + poleCost + beamCost + topBeamCost + rawMaterialCost + estimatedLaborCost + estimatedLogisticsCost;

  const result = {
    wallPanels,
    poles,
    beams,
    topBeams,
    cement,
    steel,
    aggregate,
    labour,
    labourBreakdown,
    installationDays,
    transportTrips,
    dispatchesBreakdown,
    estimatedCost,
    rawMaterialCost,
    rawMaterialBreakdown,
    transportRate,
    prices: {
      panel: panelPrice,
      pole: polePrice,
      beam: beamPrice,
      topBeam: topBeamPrice,
    },
    laborEstimate: {
      crewSize,
      masonRate,
      helperRate,
      composition: compositionText,
      avgDailyWage: crewSize > 0 ? Math.round(estimatedDailyWage / crewSize) : 800,
      totalCost: estimatedLaborCost
    }
  };

  // Persist this calculation reference for reports/logs
  await SiteCalculation.create({
    siteId: site._id,
    siteArea: length,
    calculated: result,
  });

  return { site, siteArea: length, calculated: result };
};

const getSite = async (id, branchFilter) => {
  const site = await Site.findOne({ _id: id, ...branchFilter })
    .populate('projectId', 'projectName customerId')
    .populate('wallTemplateId', 'name category');
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


