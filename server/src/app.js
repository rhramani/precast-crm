require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const requestLogger = require('./middlewares/requestLogger');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

// Module routes
const authRoutes = require('./modules/auth/routes');
const branchRoutes = require('./modules/branches/routes');
const userRoutes = require('./modules/users/routes');
const rawMaterialRoutes = require('./modules/rawMaterials/routes');
const rawMaterialCategoryRoutes = require('./modules/rawMaterialCategories/routes');
const productCategoryRoutes = require('./modules/productCategories/routes');
const productRoutes = require('./modules/products/routes');
const bomRoutes = require('./modules/bom/routes');
const productionRoutes = require('./modules/production/routes');
const inventoryRoutes = require('./modules/inventory/routes');
const customerRoutes = require('./modules/customers/routes');
const projectRoutes = require('./modules/projects/routes');
const siteRoutes = require('./modules/sites/routes');
const quotationRoutes = require('./modules/quotations/routes');
const purchaseRoutes = require('./modules/purchases/routes');
const dispatchRoutes = require('./modules/dispatch/routes');
const installationRoutes = require('./modules/installation/routes');
const paymentRoutes = require('./modules/payments/routes');
const labourRoutes = require('./modules/labour/routes');
const expenseRoutes = require('./modules/expenses/routes');
const costingRoutes = require('./modules/costing/routes');
const reportRoutes = require('./modules/reports/routes');
const notificationRoutes = require('./modules/notifications/routes');
const settingsRoutes = require('./modules/settings/routes');
const equipmentRoutes = require('./modules/equipment/routes');
const auditLogRoutes = require('./modules/auditLogs/routes');
const wallTemplateRoutes = require('./modules/wallTemplates/routes');

const app = express();

// ──────────────────────────────────────────────
// Security & parsing middlewares
// ──────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: [process.env.CLIENT_URL || 'http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ──────────────────────────────────────────────
// Request logger
// ──────────────────────────────────────────────
app.use(requestLogger);

// ──────────────────────────────────────────────
// Health check
// ──────────────────────────────────────────────
app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    message: 'Precast CRM API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ──────────────────────────────────────────────
// API Routes (base: /api/v1)
// ──────────────────────────────────────────────
const BASE = '/api/v1';

app.use(`${BASE}/auth`, authRoutes);
app.use(`${BASE}/branches`, branchRoutes);
app.use(`${BASE}/users`, userRoutes);
app.use(`${BASE}/raw-materials`, rawMaterialRoutes);
app.use(`${BASE}/raw-material-categories`, rawMaterialCategoryRoutes);
app.use(`${BASE}/product-categories`, productCategoryRoutes);
app.use(`${BASE}/products`, productRoutes);
app.use(`${BASE}/bom`, bomRoutes);
app.use(`${BASE}/production`, productionRoutes);
app.use(`${BASE}/inventory`, inventoryRoutes);
app.use(`${BASE}/customers`, customerRoutes);
app.use(`${BASE}/projects`, projectRoutes);
app.use(`${BASE}/sites`, siteRoutes);
app.use(`${BASE}/quotations`, quotationRoutes);
app.use(`${BASE}/purchases`, purchaseRoutes);
app.use(`${BASE}/dispatch`, dispatchRoutes);
app.use(`${BASE}/installation`, installationRoutes);
app.use(`${BASE}/payments`, paymentRoutes);
app.use(`${BASE}/labour`, labourRoutes);
app.use(`${BASE}/expenses`, expenseRoutes);
app.use(`${BASE}/costing`, costingRoutes);
app.use(`${BASE}/reports`, reportRoutes);
app.use(`${BASE}/notifications`, notificationRoutes);
app.use(`${BASE}/settings`, settingsRoutes);
app.use(`${BASE}/equipment`, equipmentRoutes);
app.use(`${BASE}/audit-logs`, auditLogRoutes);
app.use(`${BASE}/wall-templates`, wallTemplateRoutes);

// ──────────────────────────────────────────────
// 404 & Error handlers (must be last)
// ──────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
