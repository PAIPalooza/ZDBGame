#!/usr/bin/env ts-node
/**
 * Database Migration Runner
 *
 * Executes SQL migration files against ZeroDB
 *
 * Usage:
 *   npx ts-node scripts/run-migration.ts migrations/001_create_npc_memories.sql
 *
 * Environment Variables:
 *   DATABASE_URL - PostgreSQL connection string
 *
 * Issue: #6 - NPC Memory Storage Migration
 */

import * as fs from 'fs';
import * as path from 'path';
import { query, healthCheck, closePool } from '../lib/db';

async function runMigration(migrationFile: string): Promise<void> {
  console.log('===================================');
  console.log('Database Migration Runner');
  console.log('===================================\n');

  // Check database connection
  console.log('Checking database connection...');
  const isHealthy = await healthCheck();

  if (!isHealthy) {
    throw new Error('Database connection failed. Check DATABASE_URL environment variable.');
  }

  console.log('Database connection OK\n');

  // Read migration file
  const filePath = path.resolve(process.cwd(), migrationFile);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Migration file not found: ${filePath}`);
  }

  console.log(`Reading migration: ${migrationFile}`);
  const sql = fs.readFileSync(filePath, 'utf-8');

  console.log(`SQL length: ${sql.length} characters\n`);

  // Execute migration
  console.log('Executing migration...');

  try {
    const result = await query(sql);
    console.log('Migration executed successfully!');
    console.log(`Rows affected: ${result.rowCount || 0}\n`);
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }

  // Verify table was created
  console.log('Verifying migration...');
  const verifyResult = await query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'npc_memories'
  `);

  if (verifyResult.rows.length > 0) {
    console.log('Table "npc_memories" created successfully!\n');

    // Show table structure
    const columnsResult = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'npc_memories'
      ORDER BY ordinal_position
    `);

    console.log('Table structure:');
    console.table(columnsResult.rows);

    // Show indexes
    const indexesResult = await query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'npc_memories'
      ORDER BY indexname
    `);

    console.log('\nIndexes created:');
    console.table(indexesResult.rows);
  } else {
    console.warn('Warning: Table verification failed');
  }

  console.log('\n===================================');
  console.log('Migration completed!');
  console.log('===================================');
}

// Main execution
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Error: Migration file path required');
  console.log('Usage: npx ts-node scripts/run-migration.ts <migration-file>');
  console.log('Example: npx ts-node scripts/run-migration.ts migrations/001_create_npc_memories.sql');
  process.exit(1);
}

runMigration(migrationFile)
  .then(async () => {
    await closePool();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('\nFATAL ERROR:', error);
    await closePool();
    process.exit(1);
  });
