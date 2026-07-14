/**
 * clearDatabase.js
 * ─────────────────────────────────────────────────────────────────
 * Clears ALL collections in the precast-crm MongoDB database
 * EXCEPT the `users` collection, so user accounts are preserved.
 *
 * Usage:
 *   node scripts/clearDatabase.js
 * ─────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const mongoose = require('mongoose');

// ── Collections to SKIP (preserve) ───────────────────────────────
const PRESERVED_COLLECTIONS = ['users'];

// ── Colour helpers ────────────────────────────────────────────────
const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const red    = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const cyan   = (s) => `\x1b[36m${s}\x1b[0m`;
const bold   = (s) => `\x1b[1m${s}\x1b[0m`;

async function clearDatabase() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error(red('❌  MONGO_URI is not defined in .env'));
    process.exit(1);
  }

  console.log(bold('\n╔══════════════════════════════════════════╗'));
  console.log(bold('║       Precast CRM – Database Cleaner     ║'));
  console.log(bold('╚══════════════════════════════════════════╝\n'));

  console.log(cyan(`🔌  Connecting to: ${uri}`));
  await mongoose.connect(uri);
  console.log(green('✅  Connected to MongoDB\n'));

  const db = mongoose.connection.db;
  const allCollections = await db.listCollections().toArray();

  if (allCollections.length === 0) {
    console.log(yellow('⚠️   No collections found in the database.'));
    await mongoose.disconnect();
    return;
  }

  console.log(`📋  Found ${allCollections.length} collection(s) total.`);
  console.log(yellow(`🔒  Preserving: ${PRESERVED_COLLECTIONS.join(', ')}\n`));

  let cleared = 0;
  let skipped = 0;

  for (const col of allCollections) {
    const name = col.name;

    if (PRESERVED_COLLECTIONS.includes(name)) {
      console.log(yellow(`  ⏭️   Skipped  → ${name} (preserved)`));
      skipped++;
      continue;
    }

    try {
      const result = await db.collection(name).deleteMany({});
      console.log(green(`  🗑️   Cleared  → ${name} (${result.deletedCount} document${result.deletedCount !== 1 ? 's' : ''} removed)`));
      cleared++;
    } catch (err) {
      console.log(red(`  ❌  Failed   → ${name}: ${err.message}`));
    }
  }

  console.log(bold(`\n──────────────────────────────────────────`));
  console.log(green(`✅  Cleared  : ${cleared} collection(s)`));
  console.log(yellow(`🔒  Preserved: ${skipped} collection(s) (users intact)`));
  console.log(bold(`──────────────────────────────────────────\n`));

  await mongoose.disconnect();
  console.log(cyan('🔌  Disconnected from MongoDB\n'));
}

clearDatabase().catch((err) => {
  console.error(red(`\n❌  Unexpected error: ${err.message}`));
  process.exit(1);
});
