/**
 * Seed script — creates the initial Super Admin account.
 * Run once: node scripts/seedAdmin.js
 *
 * Credentials (change after first login!):
 *   Email:    admin@girprecast.com
 *   Password: Admin@123
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/modules/auth/model');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const existing = await User.findOne({ role: 'super_admin' });
  if (existing) {
    console.log('⚠️  Super Admin already exists:', existing.email);
    process.exit(0);
  }

  const admin = await User.create({
    name:         'Super Admin',
    email:        'admin@girprecast.com',
    passwordHash: 'Admin@123', // Pre-save hook hashes this
    role:         'super_admin',
    branchId:     null,
    permissions:  [],
    status:       'active',
  });

  console.log('🎉 Super Admin created!');
  console.log('   Email:    admin@girprecast.com');
  console.log('   Password: Admin@123');
  console.log('   ID:      ', admin._id.toString());
  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
