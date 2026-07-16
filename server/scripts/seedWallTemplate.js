/**
 * Seed Wall Category Template — Compound Wall Standard
 * Run: node scripts/seedWallTemplate.js
 *
 * Seeds 1 realistic Compound Wall template using existing products from DB.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const WallCategoryTemplate = require('../src/modules/wallTemplates/model');
const Product = require('../src/modules/products/model');
const User = require('../src/modules/auth/model');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // The branch that owns all these products
  const BRANCH_ID = '6a5605134c88c32f68db41dd';

  // ── Look up the products we'll reference ──────────────────────
  const [wallPanel, column, beam, topBeam] = await Promise.all([
    Product.findOne({ productCode: 'PR-CW-01',    branchId: BRANCH_ID }), // Cement Wall Panel 6ft
    Product.findOne({ productCode: 'PR-BW-SLAB',  branchId: BRANCH_ID }), // RCC Boundary Wall Slab 5ft  (used as slab panel)
    Product.findOne({ productCode: 'PR-BM-H10',   branchId: BRANCH_ID }), // Precast H-Beam Column 3m
    Product.findOne({ productCode: 'PR-TB-06',    branchId: BRANCH_ID }), // Standard Top Beam 2.4m
  ]);

  if (!wallPanel || !column || !beam || !topBeam) {
    console.error('❌ Some products not found. Please seed products first.');
    console.log('  wallPanel:', wallPanel?._id || 'NOT FOUND');
    console.log('  column:   ', column?._id    || 'NOT FOUND');
    console.log('  beam:     ', beam?._id      || 'NOT FOUND');
    console.log('  topBeam:  ', topBeam?._id   || 'NOT FOUND');
    process.exit(1);
  }

  console.log('\n📦 Products found:');
  console.log('  Wall Panel :', wallPanel.productCode, '-', wallPanel.productName);
  console.log('  Column     :', column.productCode,    '-', column.productName);
  console.log('  Beam       :', beam.productCode,      '-', beam.productName);
  console.log('  Top Beam   :', topBeam.productCode,   '-', topBeam.productName);

  // ── Check if template already exists ──────────────────────────
  const existing = await WallCategoryTemplate.findOne({
    branchId: BRANCH_ID,
    name: 'Standard Compound Wall',
  });

  if (existing) {
    console.log('\n⚠️  Template "Standard Compound Wall" already exists — skipping.');
    process.exit(0);
  }

  // ── Create the template ────────────────────────────────────────
  /*
   * Compound Wall Logic:
   *   - Bay spacing: 3 meters (standard post-to-post distance)
   *   - Per bay structure:
   *       - 8 Wall Panels (stacked vertically for ~2.4m height)
   *       - 1 Column/Post (one post per bay, plus 1 extra at end handled by calc)
   *       - 1 Beam (horizontal support)
   *       - 1 Top Beam (finishing beam at top)
   */
  const template = await WallCategoryTemplate.create({
    branchId:         BRANCH_ID,
    name:             'Standard Compound Wall',
    category:         'compound_wall',
    description:      'Standard precast compound wall with 8 panels per bay, column, beam and top beam. Bay spacing 3m. Suitable for residential and commercial boundary walls up to 2.4m height.',
    baySpacingMeters: 3,
    isDefault:        true,
    isActive:         true,
    products: [
      {
        productId: wallPanel._id,
        qtyPerBay: 8,
        unit:      'pcs',
        note:      '8 panels stacked vertically per bay for 2.4m height wall',
      },
      {
        productId: column._id,
        qtyPerBay: 1,
        unit:      'pcs',
        note:      '1 boundary wall slab/column per bay',
      },
      {
        productId: beam._id,
        qtyPerBay: 1,
        unit:      'pcs',
        note:      '1 horizontal H-beam per bay for structural support',
      },
      {
        productId: topBeam._id,
        qtyPerBay: 1,
        unit:      'pcs',
        note:      '1 top beam per bay for wall finishing',
      },
    ],
  });

  console.log('\n🎉 Wall Category Template created!');
  console.log('   Name      :', template.name);
  console.log('   Category  :', template.category);
  console.log('   Bay Space :', template.baySpacingMeters, 'meters');
  console.log('   Products  :', template.products.length, 'items');
  console.log('   ID        :', template._id.toString());
  console.log('\n💡 Example — for 500 meter compound wall:');

  const bays = Math.ceil(500 / template.baySpacingMeters);
  console.log(`   Bays = ceil(500 / ${template.baySpacingMeters}) = ${bays}`);
  template.products.forEach(p => {
    const name = [wallPanel, column, beam, topBeam].find(pr => pr._id.equals(p.productId))?.productName || '';
    console.log(`   ${name}: ${p.qtyPerBay} × ${bays} = ${p.qtyPerBay * bays} pcs`);
  });

  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
