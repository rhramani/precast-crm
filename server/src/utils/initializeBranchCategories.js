const RawMaterialCategory = require('../modules/rawMaterialCategories/model');
const ProductCategory = require('../modules/productCategories/model');

const initializeBranchCategories = async (branchId) => {
  const rmCategories = ['Cement', 'Sand', 'Aggregate', 'Steel', 'Chemical', 'Fly Ash', 'Stone Dust', 'Water', 'Other'];
  for (const name of rmCategories) {
    await RawMaterialCategory.findOneAndUpdate(
      { branchId, name },
      { branchId, name, description: `Default ${name} category` },
      { upsert: true }
    );
  }

  const prodCategories = ['Cement Wall', 'Compound Wall', 'Boundary Wall', 'Pole', 'Beam', 'Top Beam', 'Slab', 'Paver Block', 'Column', 'Custom'];
  for (const name of prodCategories) {
    await ProductCategory.findOneAndUpdate(
      { branchId, name },
      { branchId, name, description: `Default ${name} category` },
      { upsert: true }
    );
  }
};

module.exports = initializeBranchCategories;
