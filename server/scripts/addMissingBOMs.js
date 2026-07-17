/**
 * Script to add missing Bill of Materials (BOM) definitions for products.
 * It identifies products that do not have an active BOM, calculates a realistic
 * weight-proportional BOM based on the existing mock data recipe, and inserts it.
 *
 * Run: node scripts/addMissingBOMs.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../src/modules/products/model');
const RawMaterial = require('../src/modules/rawMaterials/model');
const BOM = require('../src/modules/bom/model');

const seed = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/precast-crm';
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  // 1. Fetch all products
  const products = await Product.find({});
  console.log(`📦 Found ${products.length} products in database.`);

  // 2. Fetch all active BOMs to find which products already have one
  const existingBoms = await BOM.find({ isActive: true });
  const productsWithBoms = new Set(existingBoms.map(b => b.productId.toString()));
  console.log(`🔍 ${productsWithBoms.size} products already have active BOMs.`);

  let createdCount = 0;

  for (const product of products) {
    if (productsWithBoms.has(product._id.toString())) {
      console.log(`➡️ Skipping Product: ${product.productName} (${product.productCode}) - BOM already exists.`);
      continue;
    }

    console.log(`\n🛠️  Creating BOM for Product: ${product.productName} (${product.productCode})`);
    
    // Fetch raw materials for the product's branch
    const rawMaterials = await RawMaterial.find({ branchId: product.branchId });
    if (rawMaterials.length === 0) {
      console.warn(`⚠️ No raw materials found for branch ${product.branchId} of product ${product.productCode}. Skipping.`);
      continue;
    }

    // Helper to find raw material by preferred code or fallback category
    const findMaterial = (category, preferredCode) => {
      let mat = rawMaterials.find(rm => rm.materialCode === preferredCode);
      if (!mat) {
        mat = rawMaterials.find(rm => rm.category === category);
      }
      return mat;
    };

    const cementMat = findMaterial('cement', 'RM-OPC53');
    const sandMat = findMaterial('sand', 'RM-SAND-RIV');
    const aggregateMat = findMaterial('aggregate', 'RM-AGG10');
    const steelMat = findMaterial('steel', 'RM-STL08');
    const waterMat = findMaterial('water', 'RM-WATER');
    const chemicalMat = findMaterial('chemical', 'RM-CHEM-PL');

    if (!cementMat || !sandMat || !aggregateMat || !waterMat || !chemicalMat) {
      console.warn(`⚠️ Critical raw materials missing for branch ${product.branchId}. Cannot create BOM.`);
      continue;
    }

    // Determine weight base scaling (using 65kg as base matching PR-BW-SLAB recipe)
    const productWeight = product.weight > 0 ? product.weight : 100; // fallback to 100kg if weight is not defined
    const scale = productWeight / 65;

    const items = [];

    // 1. Cement
    items.push({
      materialId: cementMat._id,
      quantityRequired: parseFloat((12.5 * scale).toFixed(4)),
      unit: cementMat.unit,
      wastagePercent: 3,
      materialRef: cementMat // temporary reference for cost calculation
    });

    // 2. Sand
    items.push({
      materialId: sandMat._id,
      quantityRequired: parseFloat((0.005 * scale).toFixed(6)),
      unit: sandMat.unit,
      wastagePercent: 5,
      materialRef: sandMat
    });

    // 3. Aggregate
    items.push({
      materialId: aggregateMat._id,
      quantityRequired: parseFloat((0.007 * scale).toFixed(6)),
      unit: aggregateMat.unit,
      wastagePercent: 5,
      materialRef: aggregateMat
    });

    // 4. Steel (Omit for paver blocks, as paver blocks are plain concrete and do not have steel reinforcements)
    if (product.category !== 'paver_block' && steelMat) {
      items.push({
        materialId: steelMat._id,
        quantityRequired: parseFloat((1.8 * scale).toFixed(4)),
        unit: steelMat.unit,
        wastagePercent: 2,
        materialRef: steelMat
      });
    }

    // 5. Water
    items.push({
      materialId: waterMat._id,
      quantityRequired: parseFloat((6.5 * scale).toFixed(4)),
      unit: waterMat.unit,
      wastagePercent: 10,
      materialRef: waterMat
    });

    // 6. Chemical
    items.push({
      materialId: chemicalMat._id,
      quantityRequired: parseFloat((0.08 * scale).toFixed(4)),
      unit: chemicalMat.unit,
      wastagePercent: 1,
      materialRef: chemicalMat
    });

    // Calculate dynamic calculatedCost
    let calculatedCost = 0;
    const finalItems = items.map(item => {
      const { materialRef, ...cleanItem } = item;
      const effectiveQty = cleanItem.quantityRequired * (1 + cleanItem.wastagePercent / 100);
      calculatedCost += effectiveQty * (materialRef.purchaseRate || 0);
      return cleanItem;
    });

    // Create the BOM version 1
    const newBom = await BOM.create({
      branchId: product.branchId,
      productId: product._id,
      version: 1,
      isActive: true,
      items: finalItems,
      calculatedCost: parseFloat(calculatedCost.toFixed(4)),
      createdBy: product.branchId, // Seeded under the branch's authority
    });

    console.log(`🎉 BOM created successfully! Version: 1, Cost: ₹${newBom.calculatedCost}, Items: ${newBom.items.length}`);
    createdCount++;
  }

  console.log(`\n🏁 Done! Successfully created BOM for ${createdCount} products.`);
  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seeding failed:', err.message);
  process.exit(1);
});
