require('dotenv').config();
const mongoose = require('mongoose');
const Branch = require('../src/modules/branches/model');
const Project = require('../src/modules/projects/model');
const Site = require('../src/modules/sites/model');
const Labour = require('../src/modules/labour/model');

const seedLabours = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find active branch
    let branch = await Branch.findOne({ status: 'active' });
    if (!branch) {
      branch = await Branch.findOne({});
    }

    if (!branch) {
      console.log('⚠️ Creating default branch for seeding...');
      branch = await Branch.create({
        branchName: 'Main Factory Branch',
        branchCode: 'MFB',
        address: 'Industrial Area Phase 2, Delhi, India',
        contactPerson: 'Raj Kumar',
        mobileNumber: '+919999999999',
        email: 'branch@girprecast.com',
        role: 'branch',
        status: 'active'
      });
    }

    console.log(`🏢 Using Branch: ${branch.branchName || branch.email} (${branch._id})`);

    // Find sites
    let sites = await Site.find({ branchId: branch._id }).populate('projectId');
    if (sites.length < 2) {
      sites = await Site.find({}).populate('projectId');
    }

    console.log(`📌 Found ${sites.length} existing sites in DB.`);

    let site1 = sites[0] || null;
    let site2 = sites[1] || null;

    if (!site1 || !site2) {
      console.log('⚠️ Less than 2 sites found. Creating projects and sites...');
      let project = await Project.findOne({ branchId: branch._id });
      if (!project) {
        project = await Project.create({
          branchId: branch._id,
          projectName: 'Precast Villa Project',
          clientName: 'Rahul Verma',
          clientMobile: '+919876543210',
          status: 'in_progress',
        });
      }

      if (!site1) {
        site1 = await Site.create({
          projectId: project._id,
          branchId: branch._id,
          siteName: 'Site Alpha - North Zone',
          siteAddress: 'Sector 62, Noida',
          wallSqftArea: 5000,
          status: 'active',
        });
        site1.projectId = project;
      }

      if (!site2) {
        site2 = await Site.create({
          projectId: project._id,
          branchId: branch._id,
          siteName: 'Site Beta - South Zone',
          siteAddress: 'Tech Park, Gurgaon',
          wallSqftArea: 7500,
          status: 'active',
        });
        site2.projectId = project;
      }
    }

    const mockLabours = [
      {
        labourName: 'Ramesh Pujari',
        mobileNumber: '+919876543211',
        labourType: 'mason',
        dailyWages: 15,
        status: 'active',
        projectId: site1.projectId?._id || site1.projectId,
        siteId: site1._id,
        branchId: branch._id,
      },
      {
        labourName: 'Suresh Kumar',
        mobileNumber: '+919876543212',
        labourType: 'helper',
        dailyWages: 12,
        status: 'active',
        projectId: site1.projectId?._id || site1.projectId,
        siteId: site1._id,
        branchId: branch._id,
      },
      {
        labourName: 'Mahesh Sharma',
        mobileNumber: '+919876543213',
        labourType: 'carpenter',
        dailyWages: 14,
        status: 'active',
        projectId: site1.projectId?._id || site1.projectId,
        siteId: site1._id,
        branchId: branch._id,
      },
      {
        labourName: 'Dinesh Verma',
        mobileNumber: '+919876543214',
        labourType: 'bar_bender',
        dailyWages: 13,
        status: 'active',
        projectId: site2.projectId?._id || site2.projectId,
        siteId: site2._id,
        branchId: branch._id,
      },
      {
        labourName: 'Rajesh Patel',
        mobileNumber: '+919876543215',
        labourType: 'operator',
        dailyWages: 15,
        status: 'active',
        projectId: site2.projectId?._id || site2.projectId,
        siteId: site2._id,
        branchId: branch._id,
      },
      {
        labourName: 'Anil Yadav',
        mobileNumber: '+919876543216',
        labourType: 'supervisor',
        dailyWages: 11,
        status: 'active',
        projectId: site2.projectId?._id || site2.projectId,
        siteId: site2._id,
        branchId: branch._id,
      },
    ];

    console.log('🧹 Inserting 6 labour records...');
    const inserted = await Labour.insertMany(mockLabours);
    console.log(`🎉 Successfully added ${inserted.length} labours assigned to 2 sites:`);
    inserted.forEach((l, idx) => {
      console.log(`  ${idx + 1}. ${l.labourName} (${l.labourType}) - Rate: ₹${l.dailyWages}/SQFT | Site ID: ${l.siteId}`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding labours:', error);
    process.exit(1);
  }
};

seedLabours();
