const mongoose = require('mongoose');

const migrateProductCategoriesDirect = async () => {
  try {
    const db = mongoose.connection.db;
    const productsCol = db.collection('products');
    const templatesCol = db.collection('wallcategorytemplates');
    const branchesColName = 'branches'; 
    const categoriesCol = db.collection('productcategories');
    
    // Find all branches from the branches collection
    const branches = await db.collection(branchesColName).find({}).toArray();
    
    // Default categories to create
    const defaultCategoryKeys = [
      'cement_wall',
      'compound_wall',
      'boundary_wall',
      'pole',
      'beam',
      'top_beam',
      'slab',
      'paver_block',
      'column',
      'custom'
    ];
    
    const displayNameMap = {
      cement_wall: 'Cement Wall',
      compound_wall: 'Compound Wall',
      boundary_wall: 'Boundary Wall',
      pole: 'Pole',
      beam: 'Beam',
      top_beam: 'Top Beam',
      slab: 'Slab',
      paver_block: 'Paver Block',
      column: 'Column',
      custom: 'Custom'
    };

    console.log(`🔍 [Product Category Migration] Found ${branches.length} branches. Ensuring default categories exist...`);

    // Ensure default categories exist for each branch
    for (const branch of branches) {
      for (const catKey of defaultCategoryKeys) {
        const name = displayNameMap[catKey];
        const existing = await categoriesCol.findOne({ branchId: branch._id, name });
        if (!existing) {
          await categoriesCol.insertOne({
            branchId: branch._id,
            name,
            description: `Default ${name} category`,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
    }

    // Convert string categories in products to the corresponding category's ObjectId
    const products = await productsCol.find({}).toArray();
    let productMigratedCount = 0;
    
    for (const prod of products) {
      if (typeof prod.category === 'string' && prod.category.length < 24) {
        const matchedName = displayNameMap[prod.category] || displayNameMap['custom'] || 'Custom';
        
        let categoryObj = await categoriesCol.findOne({ branchId: prod.branchId, name: matchedName });
        if (!categoryObj) {
          categoryObj = await categoriesCol.findOne({ branchId: prod.branchId });
          if (!categoryObj) {
            const res = await categoriesCol.insertOne({
              branchId: prod.branchId,
              name: matchedName,
              description: `Default ${matchedName} category`,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            categoryObj = { _id: res.insertedId };
          }
        }
        
        await productsCol.updateOne({ _id: prod._id }, { $set: { category: categoryObj._id } });
        productMigratedCount++;
      }
    }

    console.log(`✅ Product category migration: Migrated ${productMigratedCount} products.`);

    // Convert string categories in wall category templates to corresponding category's ObjectId
    const templates = await templatesCol.find({}).toArray();
    let templateMigratedCount = 0;

    for (const tmpl of templates) {
      if (typeof tmpl.category === 'string' && tmpl.category.length < 24) {
        const matchedName = displayNameMap[tmpl.category] || displayNameMap['custom'] || 'Custom';
        
        let categoryObj = await categoriesCol.findOne({ branchId: tmpl.branchId, name: matchedName });
        if (!categoryObj) {
          categoryObj = await categoriesCol.findOne({ branchId: tmpl.branchId });
          if (!categoryObj) {
            const res = await categoriesCol.insertOne({
              branchId: tmpl.branchId,
              name: matchedName,
              description: `Default ${matchedName} category`,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            categoryObj = { _id: res.insertedId };
          }
        }

        await templatesCol.updateOne({ _id: tmpl._id }, { $set: { category: categoryObj._id } });
        templateMigratedCount++;
      }
    }

    console.log(`✅ Wall category templates category migration: Migrated ${templateMigratedCount} templates.`);

  } catch (error) {
    console.error('❌ Error during Product categories migration:', error);
  }
};

module.exports = migrateProductCategoriesDirect;
