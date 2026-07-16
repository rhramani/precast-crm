require('dotenv').config();
const mongoose = require('mongoose');
const Branch = require('../src/modules/branches/model');
const RawMaterial = require('../src/modules/rawMaterials/model');
const Product = require('../src/modules/products/model');
const Supplier = require('../src/modules/purchases/supplierModel');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // 1. Get or Create a Branch
  let branch = await Branch.findOne({ status: 'active' });
  if (!branch) {
    console.log('⚠️ No active branch found. Creating a default branch...');
    branch = await Branch.create({
      branchName: 'Main Factory Branch',
      branchCode: 'MFB',
      address: 'Industrial Area Phase 2, Delhi, India',
      contactPerson: 'Raj Kumar',
      mobileNumber: '+919999999999',
      email: 'branch@girprecast.com',
      passwordHash: '$2a$10$X8m1Z9m1Z9m1Z9m1Z9m1Z.o5iK7K2s8/Oq3x6gK7H2k8d7W7r7YyG', // hashed 'Password@123'
      role: 'branch',
      status: 'active'
    });
    console.log('🎉 Default Branch created: MFB');
  } else {
    console.log(`🏢 Seeding data for branch: ${branch.branchName} (${branch.branchCode})`);
  }

  const branchId = branch._id;

  // 1.5. Mock Suppliers
  const suppliersData = [
    { supplierName: 'Ultratech Cement Ltd', contactPerson: 'Arvind Sharma', mobileNumber: '+919876543211', email: 'sales@ultratech.com', address: 'Mumbai Head Office', gstNumber: '27AAAUC1234A1Z1', paymentTerms: 'Net 30' },
    { supplierName: 'Ganga Sand Traders', contactPerson: 'Ramesh Singh', mobileNumber: '+919876543212', email: 'gangasand@gmail.com', address: 'Ghat Area, Patna', gstNumber: '10AAAGS5678B1Z2', paymentTerms: 'COD' },
    { supplierName: 'Jindal Steel & Power', contactPerson: 'Vikram Jindal', mobileNumber: '+919876543213', email: 'sales@jindalsteel.com', address: 'OP Jindal Marg, Hisar', gstNumber: '06AAAJG1122C1Z3', paymentTerms: 'Net 45' },
    { supplierName: 'Krishna Chemicals & Admixtures', contactPerson: 'Dr. S. K. Gupta', mobileNumber: '+919876543214', email: 'info@krishnachem.com', address: 'MIDC Phase 1, Thane', gstNumber: '27AAAKC9988D1Z4', paymentTerms: 'Net 15' },
    { supplierName: 'Vardhman Flyash Co', contactPerson: 'Sanjay Jain', mobileNumber: '+919876543215', email: 'vardhmanflyash@yahoo.com', address: 'NTPC Plant Area, Singrauli', gstNumber: '23AAAVF4433E1Z5', paymentTerms: 'Net 30' },
    { supplierName: 'Apex Aggregates & Crusher', contactPerson: 'Manoj Kohli', mobileNumber: '+919876543216', email: 'sales@apexaggregate.com', address: 'Stone Quarry Zone, Faridabad', gstNumber: '06AAAAC7766F1Z6', paymentTerms: 'Net 30' },
    { supplierName: 'Himalayan Water Corp', contactPerson: 'Raman Negi', mobileNumber: '+919876543217', email: 'info@himalayanwater.com', address: 'Borewell Road, Palwal', gstNumber: '06AAAHW3322G1Z7', paymentTerms: 'Net 15' }
  ];

  console.log('🌱 Inserting Suppliers...');
  const supplierIdMap = {};
  for (const s of suppliersData) {
    try {
      const supplierObj = await Supplier.findOneAndUpdate(
        { supplierName: s.supplierName },
        s,
        { upsert: true, new: true, runValidators: true }
      );
      if (s.supplierName.includes('Cement')) supplierIdMap.cement = supplierObj._id;
      if (s.supplierName.includes('Sand')) supplierIdMap.sand = supplierObj._id;
      if (s.supplierName.includes('Steel')) supplierIdMap.steel = supplierObj._id;
      if (s.supplierName.includes('Chemicals')) supplierIdMap.chemicals = supplierObj._id;
      if (s.supplierName.includes('Flyash')) supplierIdMap.flyash = supplierObj._id;
      if (s.supplierName.includes('Aggregates')) supplierIdMap.aggregates = supplierObj._id;
      if (s.supplierName.includes('Water')) supplierIdMap.water = supplierObj._id;
    } catch (e) {
      console.warn(`⚠️ Failed to upsert supplier ${s.supplierName}:`, e.message);
    }
  }

  // 2. 10 Mock Raw Materials
  const rawMaterialsData = [
    { materialCode: 'RM-OPC53', materialName: 'OPC 53 Cement', category: 'cement', unit: 'kg', currentQuantity: 15000, minimumQuantity: 3000, purchaseRate: 8.5, supplierId: supplierIdMap.cement },
    { materialCode: 'RM-SAND-RIV', materialName: 'River Sand', category: 'sand', unit: 'brass', currentQuantity: 25, minimumQuantity: 5, purchaseRate: 6200, supplierId: supplierIdMap.sand },
    { materialCode: 'RM-AGG10', materialName: '10mm Blue Metal Aggregate', category: 'aggregate', unit: 'brass', currentQuantity: 18, minimumQuantity: 4, purchaseRate: 4800, supplierId: supplierIdMap.aggregates },
    { materialCode: 'RM-AGG20', materialName: '20mm Blue Metal Aggregate', category: 'aggregate', unit: 'brass', currentQuantity: 20, minimumQuantity: 4, purchaseRate: 5000, supplierId: supplierIdMap.aggregates },
    { materialCode: 'RM-STL08', materialName: '8mm TMT Steel Rebar', category: 'steel', unit: 'kg', currentQuantity: 2500, minimumQuantity: 500, purchaseRate: 64, supplierId: supplierIdMap.steel },
    { materialCode: 'RM-STL10', materialName: '10mm TMT Steel Rebar', category: 'steel', unit: 'kg', currentQuantity: 3000, minimumQuantity: 500, purchaseRate: 62, supplierId: supplierIdMap.steel },
    { materialCode: 'RM-CHEM-PL', materialName: 'Superplasticizer Chemical Admixture', category: 'chemical', unit: 'kg', currentQuantity: 450, minimumQuantity: 100, purchaseRate: 140, supplierId: supplierIdMap.chemicals },
    { materialCode: 'RM-FLYASH', materialName: 'Premium Class F Fly Ash', category: 'fly_ash', unit: 'kg', currentQuantity: 8000, minimumQuantity: 2000, purchaseRate: 3.2, supplierId: supplierIdMap.flyash },
    { materialCode: 'RM-STDUST', materialName: 'Fine Stone Dust', category: 'stone_dust', unit: 'brass', currentQuantity: 15, minimumQuantity: 3, purchaseRate: 3100, supplierId: supplierIdMap.aggregates },
    { materialCode: 'RM-WATER', materialName: 'Processed Borewell Water', category: 'water', unit: 'litres', currentQuantity: 25000, minimumQuantity: 5000, purchaseRate: 0.15, supplierId: supplierIdMap.water }
  ];

  console.log('🌱 Inserting Raw Materials...');
  let rmCount = 0;
  for (const item of rawMaterialsData) {
    try {
      await RawMaterial.findOneAndUpdate(
        { branchId, materialCode: item.materialCode },
        { ...item, branchId },
        { upsert: true, new: true, runValidators: true }
      );
      rmCount++;
    } catch (e) {
      console.warn(`⚠️ Failed to upsert raw material ${item.materialCode}:`, e.message);
    }
  }
  console.log(`🎉 Successfully seeded ${rmCount} raw materials.`);

  // 3. 10 Mock Products
  const productsData = [
    { productCode: 'PR-CW-01', productName: 'Cement Wall Panel 6ft', category: 'cement_wall', dimensions: { width: 0.3, height: 1.8, length: 0.1, thickness: 0.05 }, weight: 85, unit: 'pcs', description: 'Standard high-strength boundary wall panels.' },
    { productCode: 'PR-CW-COL', productName: 'Precast Compound Wall Column 8ft', category: 'compound_wall', dimensions: { width: 0.15, height: 2.4, length: 0.15, thickness: 0.15 }, weight: 140, unit: 'pcs', description: 'Heavy-duty columns for secure compound walling.' },
    { productCode: 'PR-BW-SLAB', productName: 'RCC Boundary Wall Slab 5ft', category: 'boundary_wall', dimensions: { width: 0.3, height: 1.5, length: 0.08, thickness: 0.04 }, weight: 65, unit: 'pcs', description: 'Standard boundary wall infill slab.' },
    { productCode: 'PR-PO-9M', productName: 'Precast Electric Pole 9m', category: 'pole', dimensions: { width: 0.2, height: 9.0, length: 0.2, thickness: 0.2 }, weight: 420, unit: 'pcs', description: 'Electricity transmission post.' },
    { productCode: 'PR-BM-H10', productName: 'Precast H-Beam Column 3m', category: 'beam', dimensions: { width: 0.25, height: 3.0, length: 0.25, thickness: 0.25 }, weight: 280, unit: 'pcs', description: 'Structural load-bearing H-section beam.' },
    { productCode: 'PR-TB-06', productName: 'Standard Top Beam 2.4m', category: 'top_beam', dimensions: { width: 0.15, height: 2.4, length: 0.15, thickness: 0.15 }, weight: 95, unit: 'pcs', description: 'Top coping beam.' },
    { productCode: 'PR-SL-2X1', productName: 'Heavy Duty Precast Slab 2x1m', category: 'slab', dimensions: { width: 1.0, height: 2.0, length: 0.1, thickness: 0.1 }, weight: 480, unit: 'pcs', description: 'Ground floor cover slab.' },
    { productCode: 'PR-PV-GRY', productName: 'Uni Paver Block Grey 80mm', category: 'paver_block', dimensions: { width: 0.1, height: 0.08, length: 0.2, thickness: 0.08 }, weight: 3.6, unit: 'pcs', description: 'Grey interlocking paver block for heavy vehicle traffic.' },
    { productCode: 'PR-COL-4M', productName: 'Precast Square Column 4m', category: 'column', dimensions: { width: 0.3, height: 4.0, length: 0.3, thickness: 0.3 }, weight: 860, unit: 'pcs', description: 'Heavy industrial precast column.' },
    { productCode: 'PR-CUST-TRN', productName: 'Cable Trench U-Shape 1m', category: 'custom', dimensions: { width: 0.6, height: 1.0, length: 0.5, thickness: 0.1 }, weight: 220, unit: 'pcs', description: 'Custom cable trench utility block.' }
  ];

  console.log('🌱 Inserting Products...');
  let prCount = 0;
  for (const item of productsData) {
    try {
      await Product.findOneAndUpdate(
        { branchId, productCode: item.productCode },
        { ...item, branchId },
        { upsert: true, new: true, runValidators: true }
      );
      prCount++;
    } catch (e) {
      console.warn(`⚠️ Failed to upsert product ${item.productCode}:`, e.message);
    }
  }
  console.log(`🎉 Successfully seeded ${prCount} products.`);

  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seeding failed:', err.message);
  process.exit(1);
});
