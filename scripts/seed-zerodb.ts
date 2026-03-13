#!/usr/bin/env ts-node

/**
 * ZeroDB Seed Script for AI-Native Game World Demo (Moonvale)
 *
 * This script seeds the ZeroDB database with initial world data:
 * - 3 Regions: Moonvale, Northern Forest, Ember Tower Ruins
 * - 1 Faction: Forest Guild
 * - 1 NPC: Elarin (Village Historian)
 * - 3 Lore entries: Fall of Ember Tower, Founding of Moonvale, Wolves of the Northern Forest
 *
 * The script is idempotent - it checks for existing data before inserting
 * to prevent duplicate entries.
 *
 * Usage:
 *   npm run seed:zerodb
 *   or
 *   ts-node scripts/seed-zerodb.ts
 *
 * Environment Variables Required:
 *   AINATIVE_API_TOKEN - ZeroDB API authentication token
 *
 * Refs: GitHub Issue #2
 */

import * as dotenv from 'dotenv';
import { loreDatabase } from '../lib/lore';

// Load environment variables
dotenv.config();

// ZeroDB API configuration
const ZERODB_API_URL = process.env.AINATIVE_API_URL || 'https://api.ainative.studio/';
const ZERODB_API_TOKEN = process.env.AINATIVE_API_TOKEN;

if (!ZERODB_API_TOKEN) {
  console.error('❌ Error: AINATIVE_API_TOKEN environment variable is not set');
  console.error('Please set it in your .env file or environment');
  process.exit(1);
}

// ============================================================================
// Type Definitions
// ============================================================================

interface Region {
  name: string;
  description: string;
  danger_level: number;
  metadata: Record<string, any>;
}

interface Faction {
  name: string;
  description: string;
  alignment: string;
  headquarters: string;
  metadata: Record<string, any>;
}

interface NPC {
  name: string;
  role: string;
  location: string;
  personality: Record<string, any>;
}

interface Lore {
  title: string;
  content: string;
  region: string;
  tags: string[];
}

// ============================================================================
// Seed Data Definitions
// ============================================================================

const REGIONS: Region[] = [
  {
    name: 'Moonvale',
    description: 'A peaceful village settlement nestled in the forest valley, founded by the Forest Guild to protect the ancient woods.',
    danger_level: 1,
    metadata: {
      population: 'small',
      type: 'village',
      notable_features: ['Forest Guild headquarters', 'village historian', 'safe haven']
    }
  },
  {
    name: 'Northern Forest',
    description: 'Dense ancient woodlands to the north of Moonvale, home to wolves and other wild creatures.',
    danger_level: 5,
    metadata: {
      population: 'wildlife',
      type: 'wilderness',
      notable_features: ['wolf packs', 'ancient trees', 'hunter trails']
    }
  },
  {
    name: 'Ember Tower Ruins',
    description: 'The collapsed remains of a once-mighty magical tower, destroyed by a catastrophic experiment gone wrong.',
    danger_level: 8,
    metadata: {
      population: 'abandoned',
      type: 'ruins',
      notable_features: ['magical debris', 'arcane ash', 'unstable magic']
    }
  }
];

const FACTIONS: Faction[] = [
  {
    name: 'Forest Guild',
    description: 'A protective organization dedicated to preserving the ancient woods and maintaining balance between civilization and nature.',
    alignment: 'neutral_good',
    headquarters: 'Moonvale',
    metadata: {
      founded: 'ancient times',
      primary_mission: 'forest preservation',
      notable_members: ['Elarin']
    }
  }
];

const NPCS: NPC[] = [
  {
    name: 'Elarin',
    role: 'Village Historian',
    location: 'Moonvale',
    personality: {
      traits: ['wise', 'knowledgeable', 'patient', 'helpful'],
      background: 'Guardian of Moonvale\'s history and lore, member of the Forest Guild',
      demeanor: 'calm and scholarly',
      interests: ['history', 'ancient magic', 'forest preservation']
    }
  }
];

const LORE: Lore[] = [
  {
    title: loreDatabase[0].title,
    content: loreDatabase[0].content,
    region: 'Ember Tower Ruins',
    tags: loreDatabase[0].tags
  },
  {
    title: loreDatabase[1].title,
    content: loreDatabase[1].content,
    region: 'Moonvale',
    tags: loreDatabase[1].tags
  },
  {
    title: loreDatabase[2].title,
    content: loreDatabase[2].content,
    region: 'Northern Forest',
    tags: loreDatabase[2].tags
  }
];

// ============================================================================
// ZeroDB API Client Functions
// ============================================================================

interface ZeroDBTableSchema {
  fields: Record<string, string>;
  indexes?: string[];
}

interface ZeroDBQueryOptions {
  table_id: string;
  filter?: Record<string, any>;
  limit?: number;
  offset?: number;
  sort?: Record<string, number>;
}

interface ZeroDBInsertOptions {
  table_id: string;
  rows: Record<string, any>[];
  return_ids?: boolean;
}

/**
 * Make authenticated request to ZeroDB API
 */
async function zerodbRequest(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
  const url = `${ZERODB_API_URL}${endpoint}`;

  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${ZERODB_API_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ZeroDB API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to call ZeroDB API: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Create a table in ZeroDB if it doesn't exist
 */
async function createTableIfNotExists(tableName: string, schema: ZeroDBTableSchema): Promise<void> {
  try {
    // Check if table exists by trying to list it
    const tables = await zerodbRequest('zerodb/tables', 'GET');
    const tableExists = tables.tables?.some((t: any) => t.name === tableName);

    if (tableExists) {
      console.log(`  ℹ Table '${tableName}' already exists, skipping creation`);
      return;
    }

    // Create the table
    await zerodbRequest('zerodb/tables', 'POST', {
      table_name: tableName,
      schema
    });

    console.log(`  ✓ Created table '${tableName}'`);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to create table '${tableName}': ${error.message}`);
    }
    throw error;
  }
}

/**
 * Query rows from a ZeroDB table
 */
async function queryTable(options: ZeroDBQueryOptions): Promise<any[]> {
  try {
    const result = await zerodbRequest('zerodb/query', 'POST', options);
    return result.rows || [];
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to query table '${options.table_id}': ${error.message}`);
    }
    throw error;
  }
}

/**
 * Insert rows into a ZeroDB table
 */
async function insertRows(options: ZeroDBInsertOptions): Promise<any> {
  try {
    const result = await zerodbRequest('zerodb/insert', 'POST', options);
    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to insert into table '${options.table_id}': ${error.message}`);
    }
    throw error;
  }
}

/**
 * Check if a record exists in a table based on a unique field
 */
async function recordExists(tableName: string, field: string, value: any): Promise<boolean> {
  try {
    const rows = await queryTable({
      table_id: tableName,
      filter: { [field]: value },
      limit: 1
    });
    return rows.length > 0;
  } catch (error) {
    // If table doesn't exist, record doesn't exist
    return false;
  }
}

// ============================================================================
// Seed Functions
// ============================================================================

/**
 * Seed regions table
 */
async function seedRegions(): Promise<number> {
  console.log('\n📍 Seeding Regions...');

  // Create regions table
  await createTableIfNotExists('regions', {
    fields: {
      id: 'uuid',
      name: 'string',
      description: 'string',
      danger_level: 'integer',
      metadata: 'object',
      created_at: 'timestamp'
    },
    indexes: ['name']
  });

  let insertedCount = 0;

  for (const region of REGIONS) {
    const exists = await recordExists('regions', 'name', region.name);

    if (exists) {
      console.log(`  ↷ Region '${region.name}' already exists, skipping`);
      continue;
    }

    await insertRows({
      table_id: 'regions',
      rows: [region]
    });

    console.log(`  ✓ Inserted region: ${region.name}`);
    insertedCount++;
  }

  return insertedCount;
}

/**
 * Seed factions table
 */
async function seedFactions(): Promise<number> {
  console.log('\n🏛️  Seeding Factions...');

  // Create factions table
  await createTableIfNotExists('factions', {
    fields: {
      id: 'uuid',
      name: 'string',
      description: 'string',
      alignment: 'string',
      headquarters: 'string',
      metadata: 'object',
      created_at: 'timestamp'
    },
    indexes: ['name']
  });

  let insertedCount = 0;

  for (const faction of FACTIONS) {
    const exists = await recordExists('factions', 'name', faction.name);

    if (exists) {
      console.log(`  ↷ Faction '${faction.name}' already exists, skipping`);
      continue;
    }

    await insertRows({
      table_id: 'factions',
      rows: [faction]
    });

    console.log(`  ✓ Inserted faction: ${faction.name}`);
    insertedCount++;
  }

  return insertedCount;
}

/**
 * Seed NPCs table
 */
async function seedNPCs(): Promise<number> {
  console.log('\n👤 Seeding NPCs...');

  // Create npcs table
  await createTableIfNotExists('npcs', {
    fields: {
      id: 'uuid',
      name: 'string',
      role: 'string',
      location: 'string',
      personality: 'object',
      created_at: 'timestamp'
    },
    indexes: ['name', 'location']
  });

  let insertedCount = 0;

  for (const npc of NPCS) {
    const exists = await recordExists('npcs', 'name', npc.name);

    if (exists) {
      console.log(`  ↷ NPC '${npc.name}' already exists, skipping`);
      continue;
    }

    await insertRows({
      table_id: 'npcs',
      rows: [npc]
    });

    console.log(`  ✓ Inserted NPC: ${npc.name} (${npc.role})`);
    insertedCount++;
  }

  return insertedCount;
}

/**
 * Seed lore table
 */
async function seedLore(): Promise<number> {
  console.log('\n📚 Seeding Lore...');

  // Create lore table
  await createTableIfNotExists('lore', {
    fields: {
      id: 'uuid',
      title: 'string',
      content: 'string',
      region: 'string',
      tags: 'array',
      created_at: 'timestamp'
    },
    indexes: ['title', 'region']
  });

  let insertedCount = 0;

  for (const loreEntry of LORE) {
    const exists = await recordExists('lore', 'title', loreEntry.title);

    if (exists) {
      console.log(`  ↷ Lore '${loreEntry.title}' already exists, skipping`);
      continue;
    }

    await insertRows({
      table_id: 'lore',
      rows: [loreEntry]
    });

    console.log(`  ✓ Inserted lore: ${loreEntry.title}`);
    insertedCount++;
  }

  return insertedCount;
}

// ============================================================================
// Main Execution
// ============================================================================

async function main(): Promise<void> {
  console.log('🎮 ZeroDB Seed Script - Moonvale World Data');
  console.log('='.repeat(60));

  try {
    let totalInserted = 0;

    // Seed all data
    totalInserted += await seedRegions();
    totalInserted += await seedFactions();
    totalInserted += await seedNPCs();
    totalInserted += await seedLore();

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Seed completed successfully!`);
    console.log(`   Total new records inserted: ${totalInserted}`);
    console.log('='.repeat(60));

    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ Seed failed with error:');
    console.error(error instanceof Error ? error.message : String(error));
    console.error('='.repeat(60));
    process.exit(1);
  }
}

// Run the seed script
main();
