require('dotenv').config();
const mongoose = require('mongoose');
const Dispatch = require('../src/modules/dispatch/model');
const Project = require('../src/modules/projects/model');
const Site = require('../src/modules/sites/model');
const Product = require('../src/modules/products/model');
const FinishedGoodsInventory = require('../src/modules/inventory/model');
const Branch = require('../src/modules/branches/model');
const User = require('../src/modules/auth/model');

const seedDispatches = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/precast-crm';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB:', mongoUri);

    // 1. Find User / Branch
    let user = await User.findOne({ role: 'super_admin' }) || await User.findOne({});
    let branch = await Branch.findOne({ status: 'active' }) || await Branch.findOne({});
    if (!user) {
      console.error('❌ No user found in database');
      process.exit(1);
    }
    const branchId = branch ? branch._id : (user.branchId || user._id);

    // 2. Find projects and sites
    const projects = await Project.find({});
    const sites = await Site.find({});
    const products = await Product.find({});

    console.log(`Found ${projects.length} projects, ${sites.length} sites, ${products.length} products.`);

    if (projects.length === 0 || sites.length === 0) {
      console.error('❌ Need at least 1 project and 1 site in database.');
      process.exit(1);
    }

    if (products.length === 0) {
      console.error('❌ Need products in database.');
      process.exit(1);
    }

    // Ensure Finished Goods stock exists for products
    for (const prod of products) {
      await FinishedGoodsInventory.findOneAndUpdate(
        { branchId, productId: prod._id },
        {
          $set: {
            branchId,
            productId: prod._id,
            availableStock: 1000,
            reservedStock: 0,
            damagedStock: 0,
            dispatchReadyStock: 1000
          }
        },
        { upsert: true, new: true }
      );
    }
    console.log('✅ Ensured Finished Goods inventory stock.');

    // Sample transport details & drivers
    const drivers = [
      { vehicleNumber: 'MH-12-PQ-9999', driverName: 'Ramesh Sharma', contactNumber: '+919822011223', helperName: 'Suresh' },
      { vehicleNumber: 'MH-14-AB-4321', driverName: 'Vikram Singh', contactNumber: '+919822044556', helperName: 'Mahesh' },
      { vehicleNumber: 'KA-01-MJ-8821', driverName: 'Sunil Patil', contactNumber: '+919733022114', helperName: 'Ganesh' },
      { vehicleNumber: 'GJ-06-TR-7712', driverName: 'Dinesh Yadav', contactNumber: '+919811099887', helperName: 'Rajesh' },
      { vehicleNumber: 'MH-04-XY-1234', driverName: 'Amit Verma', contactNumber: '+919922033445', helperName: 'Prakash' },
      { vehicleNumber: 'DL-01-AB-5544', driverName: 'Rajesh Kumar', contactNumber: '+919876543210', helperName: 'Rinku' }
    ];

    const statuses = ['draft', 'dispatched', 'delivered'];

    const dispatchesToInsert = [];
    let dispatchCounter = 1;

    // Clear existing dispatches to re-seed cleanly across both sites
    await Dispatch.deleteMany({ branchId });

    // Seed 4 dispatches per site (total 8 dispatches across both sites)
    for (let sIdx = 0; sIdx < sites.length; sIdx++) {
      const site = sites[sIdx];
      const project = projects.find(p => String(p._id) === String(site.projectId)) || projects[0];

      for (let i = 0; i < 4; i++) {
        const itemIdx = sIdx * 4 + i;
        const transport = drivers[itemIdx % drivers.length];
        const status = statuses[i % statuses.length];

        const prod1 = products[itemIdx % products.length];
        const prod2 = products[(itemIdx + 1) % products.length];

        const items = [
          { productId: prod1._id, quantity: 25 + (i * 10) }
        ];
        if (prod1._id.toString() !== prod2._id.toString()) {
          items.push({ productId: prod2._id, quantity: 15 + (i * 5) });
        }

        const dispatchNumber = `DSP-${String(dispatchCounter++).padStart(5, '0')}`;
        const dispatchedDate = status !== 'draft' ? new Date(Date.now() - (8 - itemIdx) * 86400000) : null;
        const deliveredDate = status === 'delivered' ? new Date(Date.now() - (8 - itemIdx - 1) * 86400000) : null;

        dispatchesToInsert.push({
          branchId,
          projectId: project._id,
          siteId: site._id,
          dispatchNumber,
          items,
          transportDetails: transport,
          transportCost: 3500,
          status,
          dispatchedDate,
          deliveredDate,
          createdBy: user._id
        });
      }
    }

    // Insert dispatches
    for (const d of dispatchesToInsert) {
      await Dispatch.create(d);
    }

    console.log(`🎉 Successfully seeded ${dispatchesToInsert.length} dispatches across ${sites.length} sites!`);
    await mongoose.disconnect();
    console.log('Done.');
  } catch (err) {
    console.error('❌ Error seeding dispatches:', err);
    process.exit(1);
  }
};

seedDispatches();
