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

  // Input siteArea is in SQFT
  const wallAreaSqft = Number(siteArea);
  const heightFeet = template ? template.heightFeet || 6 : 6;
  const length = (wallAreaSqft * 0.3048) / heightFeet;

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
      
      const prodName = prod.productName?.toLowerCase() || '';
      const prodCode = prod.productCode?.toLowerCase() || '';
      const catKey = prod.category?.name
        ? prod.category.name.toLowerCase().replace(/[\s-]/g, '_')
        : (typeof prod.category === 'string' ? prod.category : '');

      // Helper checking if it is a pole/column
      const isPole = ['pole', 'column'].includes(catKey) || 
                     prodName.includes('column') || 
                     prodName.includes('pole') || 
                     prodName.includes('post') || 
                     prodCode.includes('col');

      // Helper checking if it is a top beam
      const isTopBeam = catKey === 'top_beam' || 
                        prodName.includes('top beam');

      // Helper checking if it is a beam (and not top beam)
      const isBeam = (catKey === 'beam' || prodName.includes('beam')) && !isTopBeam;

      // Helper checking if it is a panel/slab/wall
      const isPanel = !isPole && !isBeam && !isTopBeam && 
                      (['cement_wall', 'compound_wall', 'boundary_wall', 'slab'].includes(catKey) || 
                       prodName.includes('panel') || 
                       prodName.includes('slab') || 
                       prodName.includes('wall'));

      if (isPanel) {
        panelQtyPerSqft = pLine.qtyPerSqft;
        panelProduct = prod;
      } else if (isPole) {
        poleQtyPerSqft = pLine.qtyPerSqft;
        poleProduct = prod;
      } else if (isBeam) {
        beamQtyPerSqft = pLine.qtyPerSqft;
        beamProduct = prod;
      } else if (isTopBeam) {
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
  rawMaterialCost = Math.ceil(rawMaterialCost);

  // Labor: Calculate planned duration from site's start & end dates, falling back to length estimation if undefined
  let installationDays = 1;
  if (site.startDate && site.endDate) {
    const diffTime = Math.abs(new Date(site.endDate) - new Date(site.startDate));
    installationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  } else {
    installationDays = Math.ceil(length / 15) || 1;
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

  // Dynamic calculation of Logistics & Crew from Dispatch & Labour tabs
  // 1. Fetch actual dispatches logged in Dispatch tab for this site
  const Dispatch = require('../dispatch/model');
  const actualDispatches = await Dispatch.find({ siteId: id });
  const transportTrips = actualDispatches.length;
  const transportRate = (site.transportRatePerTrip && site.transportRatePerTrip > 0) ? site.transportRatePerTrip : 3500;
  const transportCost = actualDispatches.reduce((sum, d) => sum + (d.transportCost || d.freightCharge || transportRate), 0);

  // Fetch detailed breakdown of actual dispatches
  const dispatchesBreakdown = actualDispatches.map(d => ({
    challanNumber: d.dispatchNumber,
    dispatchDate: d.dispatchedDate || d.createdAt,
    driverName: d.transportDetails?.driverName || '—',
    vehicleNumber: d.transportDetails?.vehicleNumber || '—',
    transportCost: d.transportCost || d.freightCharge || transportRate,
    status: d.status
  }));

  // 2. Fetch actual labour attendance logged in Labour tab for this site
  const Labour = require('../labour/model');
  const LabourAttendance = require('../labour/attendanceModel');

  const directAttendance = await LabourAttendance.find({
    siteId: id,
    status: { $in: ['present', 'half_day'] }
  }).populate('labourId');

  const siteLabourers = await Labour.find({ siteId: id });
  const labourIds = siteLabourers.map((l) => l._id);
  
  const fallbackAttendance = labourIds.length > 0 ? await LabourAttendance.find({
    labourId: { $in: labourIds },
    siteId: { $exists: false },
    status: { $in: ['present', 'half_day'] }
  }).populate('labourId') : [];

  const attendance = [...directAttendance, ...fallbackAttendance];

  let labourManDays = 0;
  let actualLaborCost = 0;
  const labourBreakdown = [];

  if (siteLabourers && siteLabourers.length > 0) {
    // SQFT-based Labour Payment: Total site area (SQFT) divided equally among assigned labourers
    const workerCount = siteLabourers.length;
    const sqftPerWorker = wallAreaSqft / workerCount;
    labourManDays = workerCount;

    siteLabourers.forEach((lab) => {
      const ratePerSqft = lab.dailyWages || site.labourRatePerManDay || 13;
      const workerCost = Math.round(sqftPerWorker * ratePerSqft);
      actualLaborCost += workerCost;
      labourBreakdown.push({
        labourName: lab.labourName,
        labourType: lab.labourType,
        sqftAllocated: Math.round(sqftPerWorker),
        ratePerSqft,
        dailyWages: ratePerSqft,
        daysLogged: Math.round(sqftPerWorker), // For UI backward compatibility
        totalCost: workerCost,
      });
    });
  } else if (attendance && attendance.length > 0) {
    attendance.forEach((att) => {
      if (att.status === 'present') labourManDays += 1;
      else if (att.status === 'half_day') labourManDays += 0.5;
    });

    siteLabourers.forEach((lab) => {
      const atts = attendance.filter((a) => {
        const aLabId = a.labourId?._id || a.labourId;
        return aLabId.toString() === lab._id.toString();
      });
      let days = 0;
      atts.forEach((a) => {
        if (a.status === 'present') days += 1;
        else if (a.status === 'half_day') days += 0.5;
      });
      if (days > 0) {
        const ratePerSqft = lab.dailyWages || site.labourRatePerManDay || 13;
        const total = Math.round((wallAreaSqft / siteLabourers.length) * ratePerSqft);
        actualLaborCost += total;
        labourBreakdown.push({
          labourName: lab.labourName,
          labourType: lab.labourType,
          sqftAllocated: Math.round(wallAreaSqft / siteLabourers.length),
          ratePerSqft,
          dailyWages: ratePerSqft,
          totalCost: total,
        });
      }
    });
  } else {
    const defaultRate = site.labourRatePerManDay || 13;
    actualLaborCost = Math.round(wallAreaSqft * defaultRate);
  }

  const componentCost = panelCost + poleCost + beamCost + topBeamCost;
  const logisticsLaborCost = transportCost + actualLaborCost;
  const totalCalculatedCost = componentCost + rawMaterialCost + logisticsLaborCost;

  const result = {
    wallPanels,
    poles,
    beams,
    topBeams,
    cement,
    steel,
    aggregate,
    labour: labourManDays,
    labourManDays,
    labourBreakdown,
    installationDays,
    transportTrips,
    transportCost,
    actualLaborCost,
    logisticsLaborCost,
    dispatchesBreakdown,
    totalCalculatedCost,
    estimatedCost: totalCalculatedCost,
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
      crewSize: siteLabourers ? siteLabourers.length : 0,
      avgDailyWage: siteLabourers && siteLabourers.length > 0
        ? Math.round(siteLabourers.reduce((s, l) => s + (l.dailyWages || 800), 0) / siteLabourers.length)
        : (site.labourRatePerManDay || 800),
      totalCost: actualLaborCost
    }
  };

  // Persist this calculation reference for reports/logs
  await SiteCalculation.create({
    siteId: site._id,
    siteArea: wallAreaSqft,
    calculated: { ...result, lengthInMeters: length },
  });

  return { site, siteArea: wallAreaSqft, calculated: { ...result, lengthInMeters: length } };
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

const getSiteProductRequirements = async (id, branchFilter) => {
  const site = await Site.findOne({ _id: id, ...branchFilter });
  if (!site) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }

  let template = null;
  if (site.wallTemplateId) {
    template = await WallCategoryTemplate.findById(site.wallTemplateId)
      .populate({ path: 'products.productId', populate: { path: 'category' } });
  } else {
    template = await WallCategoryTemplate.findOne({ branchId: site.branchId, isDefault: true })
      .populate({ path: 'products.productId', populate: { path: 'category' } });
  }

  const siteArea = Number(site.siteArea || 0);
  const productRequirementsMap = {};

  if (template && template.products && template.products.length > 0 && siteArea > 0) {
    for (const pLine of template.products) {
      const prod = pLine.productId;
      if (!prod || !prod._id) continue;

      const pIdStr = prod._id.toString();
      const prodName = prod.productName?.toLowerCase() || '';
      const prodCode = prod.productCode?.toLowerCase() || '';
      const catKey = prod.category?.name
        ? prod.category.name.toLowerCase().replace(/[\s-]/g, '_')
        : (typeof prod.category === 'string' ? prod.category : '');

      const isPole = ['pole', 'column'].includes(catKey) || 
                     prodName.includes('column') || 
                     prodName.includes('pole') || 
                     prodName.includes('post') || 
                     prodCode.includes('col');

      const qtyPerSqft = pLine.qtyPerSqft || 0;
      let totalRequired = Math.ceil(siteArea * qtyPerSqft);
      if (isPole) totalRequired += 1;

      productRequirementsMap[pIdStr] = {
        productId: prod._id,
        productName: prod.productName,
        productCode: prod.productCode,
        unit: prod.unit || 'pcs',
        totalRequired,
        alreadyDispatched: 0,
        remainingRequired: totalRequired
      };
    }
  }

  const Dispatch = require('../dispatch/model');
  const existingDispatches = await Dispatch.find({ siteId: id });

  for (const disp of existingDispatches) {
    if (!disp.items) continue;
    for (const item of disp.items) {
      const pIdStr = item.productId?._id?.toString() || item.productId?.toString();
      if (!pIdStr) continue;

      if (productRequirementsMap[pIdStr]) {
        productRequirementsMap[pIdStr].alreadyDispatched += item.quantity;
      }
    }
  }

  const requirementsList = Object.values(productRequirementsMap).map(req => ({
    ...req,
    remainingRequired: Math.max(0, req.totalRequired - req.alreadyDispatched)
  }));

  return {
    siteId: site._id,
    siteName: site.siteName,
    siteArea: site.siteArea,
    hasTemplate: !!template,
    templateName: template ? template.name : null,
    requirements: requirementsList
  };
};

module.exports = {
  createSite,
  updateSite,
  updateSiteStatus,
  calculateRequirements,
  getSiteProductRequirements,
  getSite,
  deleteSite,
};


