/*can yu*
 * Seed Script — Sample Quotation (with auto Customer + Project creation)
 * Run: node scripts/seedQuotation.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const Branch    = require('../src/modules/branches/model');
const Customer  = require('../src/modules/customers/model');
const Project   = require('../src/modules/projects/model');
const Product   = require('../src/modules/products/model');
const Quotation = require('../src/modules/quotations/model');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // 1. Get active branch
  const branch = await Branch.findOne({ status: 'active' });
  if (!branch) {
    console.error('❌ No active branch found. Run seedAdmin.js first.');
    process.exit(1);
  }
  console.log(`🏢 Branch: ${branch.branchName}`);
  const branchId = branch._id;

  // 2. Upsert Customer — Rajesh Patel
  let customer = await Customer.findOneAndUpdate(
    { mobile: '+919876543210' },
    {
      customerName:  'Rajesh Patel',
      companyName:   'Rajesh Infrastructure Pvt Ltd',
      contactPerson: 'Rajesh Patel',
      mobile:        '+919876543210',
      email:         'rajesh.patel@rajeshinfra.com',
      gstNumber:     '27AABCR1234Q1Z5',
      city:          'Pune',
      state:         'Maharashtra',
      country:       'India',
      address:       '14, Shivaji Nagar, Pune, Maharashtra - 411005',
      creditLimit:   5000000,
      paymentTerms:  'Net 30',
      status:        'active',
    },
    { upsert: true, new: true, runValidators: true }
  );
  console.log(`👤 Customer: ${customer.customerName}`);

  // 3. Upsert Project — Pune Highway Boundary Wall Construction
  let project = await Project.findOneAndUpdate(
    { projectName: 'Pune Highway Boundary Wall Construction', customerId: customer._id },
    {
      customerId:  customer._id,
      projectName: 'Pune Highway Boundary Wall Construction',
      description: 'Boundary wall construction for Pune–Mumbai Highway Industrial Zone.',
      status:      'in_progress',
    },
    { upsert: true, new: true, runValidators: true }
  );
  console.log(`📁 Project: ${project.projectName}`);

  // 4. Get products
  const panelProduct   = await Product.findOne({ branchId, productCode: 'PR-CW-01' });
  const columnProduct  = await Product.findOne({ branchId, productCode: 'PR-CW-COL' });
  const beamProduct    = await Product.findOne({ branchId, productCode: 'PR-BM-H10' });
  const topBeamProduct = await Product.findOne({ branchId, productCode: 'PR-TB-06' });

  if (!panelProduct) {
    console.error('❌ Products not found. Run: node scripts/seedMockData.js first.');
    process.exit(1);
  }
  console.log('📦 Products found ✅');

  // 5. Build line items (18% GST)
  const TAX = 18;
  const buildItem = (product, qty, rate) => ({
    productId:   product._id,
    quantity:    qty,
    rate:        rate,
    taxPercent:  TAX,
    totalAmount: Math.round(qty * rate * (1 + TAX / 100)),
  });

  const items = [
    buildItem(panelProduct,   4167,  600),   // Wall Panels      — ₹600/pc
    buildItem(columnProduct,  3334,  800),   // Columns          — ₹800/pc
    buildItem(beamProduct,    2084,  500),   // H-Beams          — ₹500/pc
    ...(topBeamProduct ? [buildItem(topBeamProduct, 2084, 450)] : []),  // Top Beams
  ];

  const subTotal   = items.reduce((s, i) => s + i.quantity * i.rate, 0);
  const taxAmount  = Math.round(subTotal * TAX / 100);
  const grandTotal = subTotal + taxAmount;

  // 6. Upsert Quotation
  const quoteNumber = 'QT-2026-001';
  const quotation = await Quotation.findOneAndUpdate(
    { branchId, quoteNumber },
    {
      branchId,
      customerId: customer._id,
      projectId:  project._id,
      quoteNumber,
      items,
      subTotal,
      taxAmount,
      grandTotal,
      status:     'accepted',            // ← accepted so revenue appears in Costing page
      validUntil: new Date('2026-11-15'),
    },
    { upsert: true, new: true, runValidators: true }
  );

  console.log('');
  console.log('🎉 Quotation seeded successfully!');
  console.log('─────────────────────────────────────────────────');
  console.log(`   Quote Number : ${quotation.quoteNumber}`);
  console.log(`   Customer     : ${customer.customerName}`);
  console.log(`   Project      : ${project.projectName}`);
  console.log(`   Line Items   : ${items.length}`);
  console.log(`   Sub Total    : ₹${subTotal.toLocaleString('en-IN')}`);
  console.log(`   GST (18%)    : ₹${taxAmount.toLocaleString('en-IN')}`);
  console.log(`   Grand Total  : ₹${grandTotal.toLocaleString('en-IN')}`);
  console.log(`   Status       : ACCEPTED ✅`);
  console.log('─────────────────────────────────────────────────');
  console.log('');
  console.log('💡 Ab Costing page mein "Allocated Site Revenue" show hoga!');
  console.log('💡 Quotations page mein bhi QT-2026-001 dikh jaayegi.');

  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seeding failed:', err.message);
  process.exit(1);
});
