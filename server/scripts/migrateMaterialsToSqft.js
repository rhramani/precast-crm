/**
 * Migration: Convert Installation Material Allocation from per_meter to per_sqft
 * Run: node scripts/migrateMaterialsToSqft.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function migrate() {
  const connStr = process.env.MONGO_URI || 'mongodb://localhost:27017/precast-crm';
  await mongoose.connect(connStr);
  console.log('✅ Connected to MongoDB');

  const templates = await mongoose.connection.db.collection('wallcategorytemplates').find({}).toArray();
  console.log(`Found ${templates.length} templates to check for material migration.`);

  for (const template of templates) {
    let updatedMaterials = [];
    let updated = false;

    if (Array.isArray(template.installationMaterials)) {
      updatedMaterials = template.installationMaterials.map(m => {
        if (m.type === 'per_meter') {
          const heightFeet = template.heightFeet || 6;
          const conversionFactor = (1 / 0.3048) * heightFeet; // ~19.685 for 6ft
          const newQty = Number((m.qty / conversionFactor).toFixed(4));
          console.log(`  -> Template "${template.name}": Converting ${m.qty} ${m.type} to ${newQty} per_sqft (Height: ${heightFeet}ft)`);
          updated = true;
          return {
            ...m,
            qty: newQty,
            type: 'per_sqft'
          };
        }
        return m;
      });
    }

    if (updated) {
      await mongoose.connection.db.collection('wallcategorytemplates').updateOne(
        { _id: template._id },
        {
          $set: {
            installationMaterials: updatedMaterials
          }
        }
      );
      console.log(`✅ Template "${template.name}" installation materials updated.`);
    }
  }

  console.log('🎉 Installation materials migration completed.');
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
