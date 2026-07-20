/**
 * Migration: Convert Wall Category Templates from Bay-based to SQFT-based
 * Run: node scripts/migrateToSqft.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Define temporary schema for migration convenience
const wallCategoryTemplateSchema = new mongoose.Schema({
  name: String,
  baySpacingMeters: Number,
  heightFeet: Number,
  products: mongoose.Schema.Types.Mixed,
  productId: mongoose.Schema.Types.ObjectId,
  productSqft: Number
});

const WallCategoryTemplate = mongoose.model('WallCategoryTemplateMigration', wallCategoryTemplateSchema, 'wallcategorytemplates');

async function migrate() {
  const connStr = process.env.MONGO_URI || 'mongodb://localhost:27017/precast-crm';
  await mongoose.connect(connStr);
  console.log('✅ Connected to MongoDB');

  const templates = await WallCategoryTemplate.find({});
  console.log(`Found ${templates.length} templates to migrate.`);

  const productsInDb = await mongoose.connection.db.collection('products').find({}).toArray();
  const categoriesInDb = await mongoose.connection.db.collection('productcategories').find({}).toArray();

  const catMap = {};
  categoriesInDb.forEach(c => {
    catMap[c._id.toString()] = c.name.toLowerCase().replace(/[\s-]/g, '_');
  });

  for (const template of templates) {
    console.log(`Migrating template: "${template.name}"...`);

    // Default to height of 6 feet
    const heightFeet = 6;
    const spacing = template.baySpacingMeters || 3;
    const areaPerBay = (spacing / 0.3048) * heightFeet; // feet length * height

    let updatedProducts = [];
    if (Array.isArray(template.products)) {
      updatedProducts = template.products.map(p => {
        const qtyPerBay = p.qtyPerBay ?? p.qtyPerSqft ?? 1;
        const qtyPerSqft = Number((qtyPerBay / areaPerBay).toFixed(6));
        
        const newProd = {
          productId: p.productId,
          qtyPerSqft: qtyPerSqft,
          unit: p.unit || 'pcs',
          note: p.note || ''
        };
        return newProd;
      });
    }

    // Try to find the parent wall panel product in this template
    let matchedProductId = null;
    let computedProductSqft = 0;

    if (Array.isArray(template.products)) {
      for (const line of template.products) {
        const pIdStr = (line.productId?._id || line.productId || '').toString();
        const dbProd = productsInDb.find(p => p._id.toString() === pIdStr);
        if (dbProd) {
          const catKey = catMap[dbProd.category?.toString()] || '';
          if (['cement_wall', 'compound_wall', 'boundary_wall', 'slab'].includes(catKey)) {
            matchedProductId = dbProd._id;
            const w = dbProd.dimensions?.width || 0;
            const h = dbProd.dimensions?.height || 0;
            computedProductSqft = Number((w * h * 10.7639).toFixed(2));
            console.log(`  -> Found parent panel product: ${dbProd.productName} (${computedProductSqft} SQFT)`);
            break;
          }
        }
      }
    }

    // Perform database update
    await mongoose.connection.db.collection('wallcategorytemplates').updateOne(
      { _id: template._id },
      {
        $set: {
          heightFeet: heightFeet,
          products: updatedProducts,
          productId: matchedProductId,
          productSqft: computedProductSqft
        },
        $unset: {
          baySpacingMeters: ""
        }
      }
    );

    console.log(`✅ Template "${template.name}" successfully migrated. Area per Bay was: ${areaPerBay.toFixed(2)} SQFT.`);
  }

  console.log('🎉 Migration completed successfully.');
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
