#!/usr/bin/env ts-node
/**
 * Migration Script: File-based Memories to ZeroDB
 *
 * Migrates existing NPC memories from file-based storage (.data/) to ZeroDB
 *
 * Usage:
 *   npx ts-node scripts/migrate-file-memories-to-db.ts
 *
 * Environment Variables:
 *   DATABASE_URL - PostgreSQL connection string
 *
 * References:
 * - Issue #6: NPC Memory Storage Migration
 * - Original storage: lib/data.ts (file-based)
 * - New storage: lib/memory-storage.ts (ZeroDB)
 */

import * as fs from 'fs';
import * as path from 'path';
import { createMemory, getMemoryCount } from '../lib/memory-storage';
import { closePool, tableExists } from '../lib/db';

// ============================================================================
// Type Definitions
// ============================================================================

interface FileBasedMemory {
  id: string;
  npc_id: string;
  player_id: string;
  memory: string;
  importance: number;
  metadata: Record<string, any>;
  created_at: string;
}

// ============================================================================
// Configuration
// ============================================================================

const DATA_DIR = path.join(process.cwd(), '.data');
const DRY_RUN = process.argv.includes('--dry-run');

// ============================================================================
// File Reading Functions
// ============================================================================

/**
 * Read all NPC memory files from .data directory
 */
function readFileBasedMemories(): FileBasedMemory[] {
  if (!fs.existsSync(DATA_DIR)) {
    console.log(`Data directory not found: ${DATA_DIR}`);
    return [];
  }

  const files = fs.readdirSync(DATA_DIR);
  const memoryFiles = files.filter(f => f.startsWith('npc_memory_') && f.endsWith('.json'));

  console.log(`Found ${memoryFiles.length} memory files`);

  const memories: FileBasedMemory[] = [];

  for (const file of memoryFiles) {
    try {
      const filePath = path.join(DATA_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const memory = JSON.parse(content) as FileBasedMemory;
      memories.push(memory);
    } catch (error) {
      console.error(`Failed to read file ${file}:`, error);
    }
  }

  return memories;
}

// ============================================================================
// Migration Functions
// ============================================================================

/**
 * Migrate a single memory to ZeroDB
 */
async function migrateMemory(memory: FileBasedMemory): Promise<boolean> {
  try {
    if (DRY_RUN) {
      console.log(`  [DRY RUN] Would migrate: ${memory.memory.substring(0, 50)}...`);
      return true;
    }

    await createMemory({
      npc_id: memory.npc_id,
      player_id: memory.player_id,
      memory: memory.memory,
      importance: memory.importance || 1,
      metadata: memory.metadata || {},
    });

    return true;
  } catch (error) {
    console.error(`  Failed to migrate memory ${memory.id}:`, error);
    return false;
  }
}

/**
 * Main migration function
 */
async function runMigration(): Promise<void> {
  console.log('===================================');
  console.log('NPC Memory Migration');
  console.log('File-based (.data/) -> ZeroDB');
  console.log('===================================\n');

  if (DRY_RUN) {
    console.log('*** DRY RUN MODE - No changes will be made ***\n');
  }

  // Check if npc_memories table exists
  console.log('Checking database...');
  const tableReady = await tableExists('npc_memories');

  if (!tableReady) {
    throw new Error(
      'Table "npc_memories" does not exist. Run migration first:\n' +
      'npx ts-node scripts/run-migration.ts migrations/001_create_npc_memories.sql'
    );
  }

  console.log('Database ready\n');

  // Get current memory count in database
  const existingCount = await getMemoryCount();
  console.log(`Existing memories in database: ${existingCount}`);

  if (existingCount > 0) {
    console.log('WARNING: Database already contains memories!');
    console.log('This script will attempt to migrate, but duplicates may be created.');
    console.log('Consider backing up or clearing the database first.\n');
  }

  // Read file-based memories
  console.log('Reading file-based memories...');
  const fileMemories = readFileBasedMemories();

  if (fileMemories.length === 0) {
    console.log('\nNo file-based memories found. Nothing to migrate.');
    console.log('This is normal if you have already migrated or have no memories yet.\n');
    return;
  }

  console.log(`\nFound ${fileMemories.length} memories to migrate\n`);

  // Display sample memories
  console.log('Sample memories:');
  fileMemories.slice(0, 3).forEach((mem, idx) => {
    console.log(`  ${idx + 1}. [Importance: ${mem.importance}] ${mem.memory}`);
  });
  console.log();

  if (DRY_RUN) {
    console.log('Dry run completed. Re-run without --dry-run to perform migration.\n');
    return;
  }

  // Migrate memories
  console.log('Starting migration...');
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < fileMemories.length; i++) {
    const memory = fileMemories[i];
    const success = await migrateMemory(memory);

    if (success) {
      successCount++;
    } else {
      failureCount++;
    }

    // Show progress every 10 memories
    if ((i + 1) % 10 === 0) {
      console.log(`  Migrated ${i + 1}/${fileMemories.length}...`);
    }
  }

  console.log(`\nMigration complete!`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Failures: ${failureCount}`);
  console.log(`  Total: ${fileMemories.length}\n`);

  // Verify migration
  const finalCount = await getMemoryCount();
  console.log('Database verification:');
  console.log(`  Memories before: ${existingCount}`);
  console.log(`  Memories after: ${finalCount}`);
  console.log(`  Net new: ${finalCount - existingCount}\n`);

  if (failureCount === 0) {
    console.log('Migration successful! All memories have been migrated to ZeroDB.');
    console.log('\nNext steps:');
    console.log('  1. Test the application to ensure memories are working correctly');
    console.log('  2. Backup the .data/ directory');
    console.log('  3. Once verified, you can safely delete the old memory files\n');
  } else {
    console.log('Migration completed with errors. Please review the failures above.');
    console.log('Do NOT delete the .data/ directory until all memories are successfully migrated.\n');
  }
}

// ============================================================================
// Backup Function
// ============================================================================

/**
 * Create a backup of the .data directory
 */
function createBackup(): void {
  if (!fs.existsSync(DATA_DIR)) {
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const backupDir = path.join(process.cwd(), `.data-backup-${timestamp}`);

  try {
    console.log(`Creating backup: ${backupDir}`);
    fs.mkdirSync(backupDir);

    const files = fs.readdirSync(DATA_DIR);
    const memoryFiles = files.filter(f => f.startsWith('npc_memory_'));

    for (const file of memoryFiles) {
      const src = path.join(DATA_DIR, file);
      const dest = path.join(backupDir, file);
      fs.copyFileSync(src, dest);
    }

    console.log(`Backup created: ${memoryFiles.length} files\n`);
  } catch (error) {
    console.error('Failed to create backup:', error);
    throw error;
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  try {
    // Create backup unless in dry-run mode
    if (!DRY_RUN) {
      createBackup();
    }

    await runMigration();

    console.log('===================================');
    console.log('Migration script completed!');
    console.log('===================================');
  } catch (error) {
    console.error('\nFATAL ERROR:');
    console.error(error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run if executed directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

export { runMigration, readFileBasedMemories };
