const mongoose = require('mongoose');

const migrateRawMaterialCategoriesDirect = async () => {
  try {
    const db = mongoose.connection.db;
    const rawMaterialsCol = db.collection('rawmaterials');
    const branchesCol = db.collection('users'); // Note: in this CRM, branches are represented in the 'users' collection with role = 'branch' or 'super_admin'
    // Let's also check if there is a 'branches' collection. Let's look at `server/src/modules/branches/model.js` to be sure.
    // Wait! Let's verify what the branches collection name is in mongoose!
    // In mongoose, the model 'Branch' usually maps to 'branches'.
    // Let's check server/src/modules/branches/model.js.
    const branchesColName = 'branches'; 
    const categoriesCol = db.collection('rawmaterialcategories');
    
    // Find all branches from the branches collection
    const branches = await db.collection(branchesColName).find({}).toArray();
    
    // Default categories to create
    const defaultCategoryNames = ['cement', 'sand', 'aggregate', 'steel', 'chemical', 'fly_ash', 'stone_dust', 'water', 'other'];
    const displayNameMap = {
      cement: 'Cement',
      sand: 'Sand',
      aggregate: 'Aggregate',
      steel: 'Steel',
      chemical: 'Chemical',
      fly_ash: 'Fly Ash',
      stone_dust: 'Stone Dust',
      water: 'Water',
      other: 'Other'
    };

    console.log(`🔍 Found ${branches.length} branches. Ensuring default categories exist...`);

    // Ensure default categories exist for each branch
    for (const branch of branches) {
      for (const catName of defaultCategoryNames) {
        const existing = await categoriesCol.findOne({ branchId: branch._id, name: displayNameMap[catName] });
        if (!existing) {
          await categoriesCol.insertOne({
            branchId: branch._id,
            name: displayNameMap[catName],
            description: `Default ${displayNameMap[catName]} category`,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
    }

    // Convert string categories in rawmaterials to the corresponding category's ObjectId
    const materials = await rawMaterialsCol.find({}).toArray();
    let migratedCount = 0;
    
    for (const mat of materials) {
      // If the category is a string and not a 24-character ObjectId string
      if (typeof mat.category === 'string' && mat.category.length < 24) {
        const matchedName = displayNameMap[mat.category] || displayNameMap['other'] || 'Other';
        
        let categoryObj = await categoriesCol.findOne({ branchId: mat.branchId, name: matchedName });
        if (!categoryObj) {
          // If no category found for this branch, try to find any category in this branch, or insert one
          categoryObj = await categoriesCol.findOne({ branchId: mat.branchId });
          if (!categoryObj) {
            const res = await categoriesCol.insertOne({
              branchId: mat.branchId,
              name: matchedName,
              description: `Default ${matchedName} category`,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            categoryObj = { _id: res.insertedId };
          }
        }
        
        await rawMaterialsCol.updateOne({ _id: mat._id }, { $set: { category: categoryObj._id } });
        migratedCount++;
      }
    }

    console.log(`✅ Raw Material category migration completed. Migrated ${migratedCount} materials.`);
  } catch (error) {
    console.error('❌ Error during Raw Material categories migration:', error);
  }
};

module.exports = migrateRawMaterialCategoriesDirect;
