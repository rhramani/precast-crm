require('dotenv').config();
const mongoose = require('mongoose');
const Project = require('../src/modules/projects/model');
const Site = require('../src/modules/sites/model');
const Expense = require('../src/modules/expenses/model');
const User = require('../src/modules/auth/model');
const Branch = require('../src/modules/branches/model');

const seedExpenses = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/precast-crm';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB:', mongoUri);

    // Get admin user or branch user for createdBy
    let user = await User.findOne({ role: 'super_admin' }) || await User.findOne({});
    if (!user) {
      console.error('❌ No user found in database to set createdBy field');
      process.exit(1);
    }

    // Get sites and projects
    const sites = await Site.find().populate('projectId');
    console.log(`Found ${sites.length} sites in database.`);

    if (sites.length === 0) {
      console.log('⚠️ No sites found to attach expenses to.');
      process.exit(0);
    }

    const mockExpenseCategories = [
      'Transport & Logistics',
      'Crane & Heavy Machinery Charges',
      'Site Labor Wages',
      'Fuel & Generator Charges',
      'Food & Catering for Site Crew',
      'Safety Consumables & Tools',
      'Site Accommodation',
      'JCB Excavation Charges',
      'Unloading & Handling',
      'Misc Site Overhead'
    ];

    const expensesToInsert = [];

    for (const site of sites) {
      const proj = site.projectId;
      if (!proj) continue;

      const branchId = site.branchId || proj.branchId || user.branchId;

      // Seed 3-5 expenses per site
      const count = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const cat = mockExpenseCategories[Math.floor(Math.random() * mockExpenseCategories.length)];
        const amount = Math.floor(2500 + Math.random() * 25000);
        const dateOffsetDays = Math.floor(Math.random() * 30);
        const expenseDate = new Date(Date.now() - dateOffsetDays * 86400000);

        expensesToInsert.push({
          branchId,
          projectId: proj._id,
          siteId: site._id,
          expenseCategory: cat,
          amount,
          expenseDate,
          description: `Voucher details for ${cat} at ${site.siteName || 'Project Site'}`,
          createdBy: user._id
        });
      }
    }

    if (expensesToInsert.length > 0) {
      const inserted = await Expense.insertMany(expensesToInsert);
      console.log(`🎉 Successfully seeded ${inserted.length} site expense vouchers!`);
    } else {
      console.log('No expenses were created.');
    }

    await mongoose.disconnect();
    console.log('Done.');
  } catch (err) {
    console.error('Error seeding expenses:', err);
    process.exit(1);
  }
};

seedExpenses();
