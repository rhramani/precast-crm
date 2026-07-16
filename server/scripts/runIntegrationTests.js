/**
 * Integration Test Suite — E2E validation of Precast Manufacturing CRM APIs.
 * Runs in test environment using a clean mongodb database.
 */

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://localhost:27017/precast-crm-test';
process.env.JWT_SECRET = 'test_jwt_secret_key_123456';
process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_key_123456';

const http = require('http');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/modules/auth/model');
const Branch = require('../src/modules/branches/model');
const RawMaterial = require('../src/modules/rawMaterials/model');
const Product = require('../src/modules/products/model');
const BOM = require('../src/modules/bom/model');
const ProductionOrder = require('../src/modules/production/model');
const FinishedGoods = require('../src/modules/inventory/model');
const Customer = require('../src/modules/customers/model');
const Project = require('../src/modules/projects/model');
const Site = require('../src/modules/sites/model');
const SiteCalculation = require('../src/modules/sites/calculationModel');
const Quotation = require('../src/modules/quotations/model');
const Supplier = require('../src/modules/purchases/supplierModel');
const PurchaseOrder = require('../src/modules/purchases/model');
const Dispatch = require('../src/modules/dispatch/model');
const Installation = require('../src/modules/installation/model');
const Expense = require('../src/modules/expenses/model');

const PORT = 5051;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

let server;
let superAdminToken;
let branchUserToken;
let testBranchId;
let testUserId;
let rawMaterialId;
let productId;
let bomId;
let productionOrderId;
let customerId;
let projectId;
let siteId;
let quotationId;
let supplierId;
let purchaseOrderId;
let dispatchId;

// Utility for console colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
};

function logHeader(msg) {
  console.log(`\n${colors.cyan}================================================================${colors.reset}`);
  console.log(`${colors.cyan}🚀 ${msg}${colors.reset}`);
  console.log(`${colors.cyan}================================================================${colors.reset}`);
}

function logSuccess(msg) {
  console.log(`  ${colors.green}✓ ${msg}${colors.reset}`);
}

function logError(msg, detail = '') {
  console.error(`  ${colors.red}✗ ${msg}${colors.reset}`, detail);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token ? { 'Authorization': `Bearer ${options.token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (err) {
    throw new Error(`Invalid JSON response: ${text}`);
  }

  if (!response.ok) {
    const error = new Error(json.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = json;
    throw error;
  }

  return json;
}

async function setup() {
  logHeader('Setting up test server & clean DB');
  
  // Connect Mongoose
  await mongoose.connect(process.env.MONGO_URI);
  logSuccess('Connected to MongoDB');

  // Clear test DB
  await mongoose.connection.db.dropDatabase();
  logSuccess('Dropped precast-crm-test database');

  // Start HTTP Server
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  logSuccess(`Test server listening on port ${PORT}`);

  // Seed Super Admin directly in DB
  const admin = await User.create({
    name: 'Super Admin',
    email: 'admin@girprecast.com',
    passwordHash: 'Admin@123', // Hook hashes this
    role: 'super_admin',
    branchId: null,
    permissions: [],
    status: 'active',
  });
  logSuccess(`Super Admin seeded directly: ${admin.email}`);
}

async function runTests() {
  // 1. AUTHENTICATION & LOGIN
  logHeader('Test 1: Authentication & Logins');
  
  const superAdminLoginRes = await request('/auth/login', {
    method: 'POST',
    body: { email: 'admin@girprecast.com', password: 'Admin@123' },
  });
  assert(superAdminLoginRes.success === true, 'Login success field should be true');
  assert(superAdminLoginRes.data.accessToken, 'Token must be generated');
  superAdminToken = superAdminLoginRes.data.accessToken;
  logSuccess('Super Admin login completed and verified');

  // 2. BRANCH CRUD
  logHeader('Test 2: Branch CRUD Operations');

  const createBranchRes = await request('/branches', {
    method: 'POST',
    token: superAdminToken,
    body: {
      branchName: 'Noida Factory',
      branchCode: 'NOI01',
      email: 'noida@girprecast.com',
      password: 'BranchPassword123',
      address: 'Industrial Area Sector 62 Noida',
      contactPerson: 'Mr. Vivek Singh',
      mobileNumber: '+919876543210',
      gstNumber: '09AAAAA1111A1Z1',
    },
  });
  assert(createBranchRes.success === true, 'Branch creation failed');
  assert(createBranchRes.data.branch._id, 'Branch must have an ID');
  testBranchId = createBranchRes.data.branch._id;
  logSuccess(`Branch created successfully. Branch ID: ${testBranchId}`);

  // Test duplicate email check (conflict)
  try {
    await request('/branches', {
      method: 'POST',
      token: superAdminToken,
      body: {
        branchName: 'Duplicate Branch',
        email: 'noida@girprecast.com', // Duplicate email
        password: 'BranchPassword123',
      },
    });
    assert(false, 'Should have failed due to duplicate email');
  } catch (err) {
    assert(err.status === 400 || err.status === 409, `Should get validation/conflict error (status ${err.status})`);
    logSuccess('Branch email duplication check passed (threw validation error)');
  }

  // Test update branch (verifying branchCode is allowed and not rejected by schema validation)
  const updateBranchRes = await request(`/branches/${testBranchId}`, {
    method: 'PUT',
    token: superAdminToken,
    body: {
      branchName: 'Noida Factory Updated',
      branchCode: 'NOI01',
      address: 'Industrial Area Sector 62 Noida',
      contactPerson: 'Mr. Vivek Singh',
      mobileNumber: '+919876543210',
      gstNumber: '09AAAAA1111A1Z1',
      email: 'noida@girprecast.com',
    },
  });
  assert(updateBranchRes.success === true, 'Branch update failed');
  assert(updateBranchRes.data.branch.branchName === 'Noida Factory Updated', 'Branch name should be updated');
  logSuccess('Branch update with branchCode payload passed');

  // 3. BRANCH LOGIN
  logHeader('Test 3: Branch Login & Session Verification');
  
  const branchLoginRes = await request('/auth/login', {
    method: 'POST',
    body: { email: 'noida@girprecast.com', password: 'BranchPassword123' },
  });
  assert(branchLoginRes.success === true, 'Branch login failed');
  assert(branchLoginRes.data.accessToken, 'Branch login must return token');
  branchUserToken = branchLoginRes.data.accessToken;
  testUserId = branchLoginRes.data.user._id;
  logSuccess(`Branch User authenticated. User ID: ${testUserId}`);

  // Get Me profile
  const profileRes = await request('/auth/me', { token: branchUserToken });
  assert(profileRes.success === true, 'Get me endpoint failed');
  assert(profileRes.data.user.role === 'branch', 'Authenticated user role should be branch');
  logSuccess('Branch Profile details retrieved and validated');

  // 4. RAW MATERIALS INVENTORY
  logHeader('Test 4: Raw Materials CRUD & Ledger Operations');

  const createMaterialRes = await request('/raw-materials', {
    method: 'POST',
    token: branchUserToken,
    body: {
      materialCode: 'CEM-53',
      materialName: 'UltraTech Cement 53 Grade',
      category: 'cement',
      unit: 'bags',
      minimumQuantity: 20,
      purchaseRate: 450,
    },
  });
  assert(createMaterialRes.success === true, 'Material creation failed');
  rawMaterialId = createMaterialRes.data.material._id;
  logSuccess(`Raw Material created. ID: ${rawMaterialId}, Qty: ${createMaterialRes.data.material.currentQuantity}`);

  // Test Stock In
  const stockInRes = await request(`/raw-materials/${rawMaterialId}/stock-in`, {
    method: 'POST',
    token: branchUserToken,
    body: { quantity: 150, remarks: 'Additional supply delivered' },
  });
  assert(stockInRes.success === true, 'Stock-in request failed');
  assert(stockInRes.data.material.currentQuantity === 150, `Expected 150 bags, got ${stockInRes.data.material.currentQuantity}`);
  logSuccess('Stock In request completed successfully (qty: +150)');

  // Test Stock Out
  const stockOutRes = await request(`/raw-materials/${rawMaterialId}/stock-out`, {
    method: 'POST',
    token: branchUserToken,
    body: { quantity: 30, remarks: 'Shifted to pre-mix area' },
  });
  assert(stockOutRes.success === true, 'Stock-out request failed');
  assert(stockOutRes.data.material.currentQuantity === 120, `Expected 120 bags, got ${stockOutRes.data.material.currentQuantity}`);
  logSuccess('Stock Out request completed successfully (qty: -30)');

  // Verify Ledger record exists
  const ledgerRes = await request(`/raw-materials/${rawMaterialId}/ledger`, { token: branchUserToken });
  assert(ledgerRes.success === true, 'Ledger endpoint failed');
  assert(ledgerRes.data.logs.length >= 2, `Expected at least 2 logs, got ${ledgerRes.data.logs.length}`);
  logSuccess('Material Ledger records generated and verified');

  // 5. PRODUCTS & BOM
  logHeader('Test 5: Products & BOM Configuration');

  const createProductRes = await request('/products', {
    method: 'POST',
    token: branchUserToken,
    body: {
      productCode: 'PAN-06',
      productName: 'Precast compound wall panel 6ft',
      category: 'compound_wall',
      unit: 'nos',
      dimensions: { width: 1, height: 6, length: 1, thickness: 0.1 },
      weight: 120,
      description: 'Standard 6ft fence panel',
    },
  });
  assert(createProductRes.success === true, 'Product creation failed');
  productId = createProductRes.data.product._id;
  logSuccess(`Product created. ID: ${productId}`);

  // Verify Single Product GET Endpoint
  const getProductRes = await request(`/products/${productId}`, { token: branchUserToken });
  assert(getProductRes.success === true, 'GET single product endpoint failed');
  assert(getProductRes.data.product.productName === 'Precast compound wall panel 6ft', 'Unexpected product details returned');
  logSuccess(`Verified GET single product endpoint.`);

  // Create Bill of Materials (BOM)
  const createBomRes = await request('/bom', {
    method: 'POST',
    token: branchUserToken,
    body: {
      productId: productId,
      items: [
        {
          materialId: rawMaterialId,
          quantityRequired: 2, // 2 bags of cement per wall panel
          unit: 'bags',
          wastagePercent: 5,
        },
      ],
      isActive: true,
    },
  });
  assert(createBomRes.success === true, 'BOM creation failed');
  bomId = createBomRes.data.bom._id;
  logSuccess(`BOM configured and activated. BOM ID: ${bomId}`);

  // 6. PRODUCTION CAPACITY CALCULATOR
  logHeader('Test 6: Production Capacity Calculator');

  const capacityRes = await request('/production/capacity-calculator', {
    method: 'POST',
    token: branchUserToken,
    body: { productId, targetQuantity: 10 },
  });
  assert(capacityRes.success === true, 'Capacity calculator endpoint failed');
  // Available cement: 120 bags. Need: 2 bags per panel + 5% wastage = 2.1 bags per panel.
  // Producible = floor(120 / 2.1) = 57 panels.
  assert(capacityRes.data.maxQuantity === 57, `Expected maxQuantity to be 57, got ${capacityRes.data.maxQuantity}`);
  logSuccess(`Capacity calculated successfully. Max Producible Panels: ${capacityRes.data.maxQuantity}`);

  // 7. PRODUCTION ORDERS & ATOMIC TRANSACTIONS
  logHeader('Test 7: Production Order Lifecycle & Inventory Completion Transaction');

  const createOrderRes = await request('/production', {
    method: 'POST',
    token: branchUserToken,
    body: {
      productId: productId,
      plannedQuantity: 10,
      orderNumber: 'PO-NOI-001',
    },
  });
  assert(createOrderRes.success === true, 'Production order creation failed');
  productionOrderId = createOrderRes.data.order._id;
  logSuccess(`Production Order created in draft mode. Order ID: ${productionOrderId}`);

  // Update status to pending
  await request(`/production/${productionOrderId}/status`, {
    method: 'PATCH',
    token: branchUserToken,
    body: { status: 'pending' },
  });

  // Update status to in_production
  await request(`/production/${productionOrderId}/status`, {
    method: 'PATCH',
    token: branchUserToken,
    body: { status: 'in_production' },
  });
  logSuccess('Production order status moved: Draft -> Pending -> In Production');

  // Complete production order (Trigger transaction: consumes cement, creates finished goods)
  // Expected Cement consumption: 10 panels * (2 bags + 5% wastage) = 10 * 2.1 = 21 bags of cement.
  // Initial Cement: 120 bags. Remaining Cement: 120 - 21 = 99 bags.
  const completeOrderRes = await request(`/production/${productionOrderId}/complete`, {
    method: 'POST',
    token: branchUserToken,
    body: { producedQuantity: 10, damagedQuantity: 2, remarks: 'All panels manufactured and cured' },
  });
  assert(completeOrderRes.success === true, 'Failed to complete production order');
  logSuccess('Production completion transaction finished successfully');

  // Verify raw material stock updated
  const updatedMaterial = await RawMaterial.findById(rawMaterialId);
  assert(updatedMaterial.currentQuantity === 99, `Expected 99 bags of cement remaining, got ${updatedMaterial.currentQuantity}`);
  logSuccess(`Verified raw material inventory deduction (Cement remaining: ${updatedMaterial.currentQuantity} bags)`);

  // Verify finished goods inventory updated
  const fgInventory = await FinishedGoods.findOne({ productId, branchId: testBranchId });
  assert(fgInventory !== null, 'Finished goods inventory record must exist');
  assert(fgInventory.availableStock === 8, `Expected 8 available stock, got ${fgInventory.availableStock}`);
  assert(fgInventory.damagedStock === 2, `Expected 2 damaged stock, got ${fgInventory.damagedStock}`);
  logSuccess(`Verified finished goods inventory increment (Available Panels: ${fgInventory.availableStock}, Damaged: ${fgInventory.damagedStock})`);

  // 8. CUSTOMERS, PROJECTS & SITES
  logHeader('Test 8: Customers, Projects & Sites Management');

  const createCustomerRes = await request('/customers', {
    method: 'POST',
    token: branchUserToken,
    body: {
      customerName: 'Delhi Infra Projects Ltd',
      companyName: 'Delhi Infra Group',
      mobile: '+919911223344',
      email: 'info@delhiinfra.com',
      gstNumber: '07BBBBB2222B2Z2',
      address: 'Connaught Place, New Delhi',
      creditLimit: 500000,
      paymentTerms: 'Net 30',
    },
  });
  assert(createCustomerRes.success === true, 'Customer creation failed');
  customerId = createCustomerRes.data.customer._id;
  logSuccess(`Customer record created. Customer ID: ${customerId}`);

  // Create Project
  const createProjectRes = await request('/projects', {
    method: 'POST',
    token: branchUserToken,
    body: {
      customerId: customerId,
      projectName: 'Metro Boundary Wall Project',
      description: 'Metro line security boundaries',
    },
  });
  assert(createProjectRes.success === true, 'Project creation failed');
  projectId = createProjectRes.data.project._id;
  logSuccess(`Project created. Project ID: ${projectId}`);

  // Create Site
  const createSiteRes = await request('/sites', {
    method: 'POST',
    token: branchUserToken,
    body: {
      projectId: projectId,
      siteName: 'Mayur Vihar Extension Site',
      siteAddress: 'Metro Line Phase 4, Mayur Vihar Ext',
      siteEngineer: 'Mr. R. K. Sharma',
      contactNumber: '+919876123450',
      siteArea: 120, // 120 meters
    },
  });
  assert(createSiteRes.success === true, 'Site creation failed');
  siteId = createSiteRes.data.site._id;
  logSuccess(`Site created. Site ID: ${siteId}, Area: ${createSiteRes.data.site.siteArea} meters`);

  // Run Site Requirement Calculator
  const siteCalcRes = await request(`/sites/${siteId}/requirement-calculator`, {
    method: 'POST',
    token: branchUserToken,
    body: { siteArea: 120 },
  });
  assert(siteCalcRes.success === true, 'Site requirement calculator failed');
  assert(siteCalcRes.data.calculated.estimatedCost > 0, 'Estimated cost should be greater than zero');
  logSuccess(`Site calculator executed. Estimated Cost: ₹${siteCalcRes.data.calculated.estimatedCost}`);

  // 9. QUOTATION & PURCHASE ORDERS
  logHeader('Test 9: Quotation & Purchases');

  const createQuoteRes = await request('/quotations', {
    method: 'POST',
    token: branchUserToken,
    body: {
      customerId,
      projectId,
      items: [{ productId, quantity: 12, rate: 800, taxPercent: 18 }],
    },
  });
  assert(createQuoteRes.success === true, 'Quotation creation failed');
  quotationId = createQuoteRes.data.quotation._id;
  logSuccess(`Quotation generated. ID: ${quotationId}, Total: ₹${createQuoteRes.data.quotation.grandTotal}`);

  // Accept Quotation
  const acceptQuoteRes = await request(`/quotations/${quotationId}/status`, {
    method: 'PATCH',
    token: branchUserToken,
    body: { status: 'accepted' },
  });
  assert(acceptQuoteRes.data.quotation.status === 'accepted', 'Quotation acceptance failed');
  logSuccess('Quotation marked as ACCEPTED');

  // Supplier
  const createSupplierRes = await request('/purchases/suppliers', {
    method: 'POST',
    token: branchUserToken,
    body: {
      supplierName: 'UltraTech Cement Distributors',
      mobileNumber: '+919988776655',
      email: 'orders@ultratech.com',
      address: 'Okhla Phase 3, Delhi',
    },
  });
  assert(createSupplierRes.success === true, 'Supplier creation failed');
  supplierId = createSupplierRes.data.supplier._id;
  logSuccess(`Supplier created. Supplier ID: ${supplierId}`);

  // Purchase Order
  const createPoRes = await request('/purchases/orders', {
    method: 'POST',
    token: branchUserToken,
    body: {
      supplierId,
      items: [{ materialId: rawMaterialId, quantity: 100, purchaseRate: 430 }],
    },
  });
  assert(createPoRes.success === true, 'PO creation failed');
  purchaseOrderId = createPoRes.data.order._id;
  logSuccess(`Purchase Order created in ordered status. PO ID: ${purchaseOrderId}`);

  // Receive Purchase Order (Triggers stock-in automatically)
  const receivePoRes = await request(`/purchases/orders/${purchaseOrderId}/receive`, {
    method: 'POST',
    token: branchUserToken,
    body: { remarks: 'Supply received in good condition' },
  });
  assert(receivePoRes.success === true, 'PO receipt failed');
  
  // Verify stock was updated: 99 remaining + 100 received = 199 bags
  const materialAfterPo = await RawMaterial.findById(rawMaterialId);
  assert(materialAfterPo.currentQuantity === 199, `Expected 199 bags of cement after PO receipt, got ${materialAfterPo.currentQuantity}`);
  logSuccess(`Verified PO Receipt auto-increment (Cement stock: ${materialAfterPo.currentQuantity} bags)`);

  // 10. DISPATCH
  logHeader('Test 10: Dispatch tracking');

  const createDispatchRes = await request('/dispatch', {
    method: 'POST',
    token: branchUserToken,
    body: {
      projectId,
      siteId,
      items: [{ productId, quantity: 8 }],
      transportDetails: {
        vehicleNumber: 'DL-1LA-1234',
        driverName: 'Ramesh Kumar',
        contactNumber: '+919999111122',
      },
    },
  });
  assert(createDispatchRes.success === true, 'Dispatch order creation failed');
  dispatchId = createDispatchRes.data.dispatch._id;
  logSuccess(`Dispatch Challan created. ID: ${dispatchId}`);

  // 11. SITE EXPENSES
  logHeader('Test 11: Site Expenses Allocation');

  const createExpenseRes = await request('/expenses', {
    method: 'POST',
    token: branchUserToken,
    body: {
      projectId,
      siteId,
      expenseCategory: 'transport',
      amount: 4500,
      description: 'Truck transport charges for panels',
    },
  });
  assert(createExpenseRes.success === true, 'Site expense creation failed');
  logSuccess(`Site Expense logged: ₹${createExpenseRes.data.expense.amount}`);

  // 12. RECALCULATING SITE COSTING
  logHeader('Test 12: Costing & Profitability Recalculator');

  const costingRes = await request(`/costing/${siteId}`, { token: branchUserToken });
  assert(costingRes.success === true, 'Costing recalculation failed');
  assert(costingRes.data.actual.expenseCost === 4500, `Expected actual expense cost to be ₹4500, got ₹${costingRes.data.actual.expenseCost}`);
  logSuccess(`Site actual costing processed. Revenue Share: ₹${costingRes.data.revenue}, Actual Costs: ₹${costingRes.data.actual.totalCost}`);

  // 13. REPORTS & NOTIFICATIONS
  logHeader('Test 13: Reports & Notifications');

  const prodReport = await request('/reports/production', { token: branchUserToken });
  assert(prodReport.success === true, 'Production report request failed');
  logSuccess('Production report generated');

  const invReport = await request('/reports/inventory', { token: branchUserToken });
  assert(invReport.success === true, 'Inventory report request failed');
  logSuccess('Inventory report generated');

  const finReport = await request('/reports/financial', { token: branchUserToken });
  assert(finReport.success === true, 'Financial report request failed');
  logSuccess('Financial report generated');

  const notifyRes = await request('/notifications', { token: branchUserToken });
  assert(notifyRes.success === true, 'Notifications list request failed');
  logSuccess('Notifications feed fetched successfully');
}

async function teardown() {
  logHeader('Tearing down test environment');
  
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    logSuccess('HTTP Server stopped');
  }

  await mongoose.connection.close();
  logSuccess('Disconnected from MongoDB');
}

async function main() {
  let hasError = false;
  try {
    await setup();
    await runTests();
    console.log(`\n\x1b[32m================================================================\x1b[0m`);
    console.log(`\x1b[32m🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY!\x1b[0m`);
    console.log(`\x1b[32m================================================================\x1b[0m`);
  } catch (err) {
    hasError = true;
    console.log(`\n\x1b[31m================================================================\x1b[0m`);
    console.log(`\x1b[31m❌ INTEGRATION TEST RUN FAILED!\x1b[0m`);
    console.log(`\x1b[31m================================================================\x1b[0m`);
    logError(err.message, err.data || err.stack);
  } finally {
    try {
      await teardown();
    } catch (e) {
      logError('Failed to tear down properly', e.message);
    }
    process.exit(hasError ? 1 : 0);
  }
}

main();
