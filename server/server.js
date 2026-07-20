require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { initSocket } = require('./src/config/socket');
const runCategoryMigration = require('./src/modules/rawMaterialCategories/migration');
const runProductCategoryMigration = require('./src/modules/productCategories/migration');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await runCategoryMigration();
  await runProductCategoryMigration();
  const server = http.createServer(app);

  // Initialize Socket.io
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    console.log(`📡 API base: http://localhost:${PORT}/api/v1`);
    console.log(`💊 Health:   http://localhost:${PORT}/api/v1/health`);
  });
};

startServer();
