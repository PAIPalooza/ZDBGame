/**
 * Schema Validation Test Suite
 *
 * Tests database schema integrity, relationships, and constraints.
 * These tests ensure the migration created all necessary tables,
 * indexes, foreign keys, and constraints correctly.
 *
 * Prerequisites:
 * - DATABASE_URL environment variable must be set
 * - Database must have migrations applied
 *
 * Usage:
 *   npm test schema-validation.test.ts
 *
 * @author ZDBGame Team
 * @date 2026-03-13
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// Mock database client (in real implementation, would use pg library)
// For now, we'll create a structure that can be adapted when pg is added

interface DatabaseClient {
  query: (sql: string, params?: unknown[]) => Promise<QueryResult>;
  close: () => Promise<void>;
}

interface QueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
}

/**
 * Mock database client factory
 * In production, replace with actual pg.Pool
 */
function createDatabaseClient(): DatabaseClient {
  // This is a mock - replace with actual implementation when pg is added
  return {
    query: async () => ({ rows: [], rowCount: 0 }),
    close: async () => {},
  };
}

describe('Database Schema Validation', () => {
  let db: DatabaseClient;

  beforeAll(async () => {
    // Verify DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.warn('DATABASE_URL not set - tests will be skipped');
      return;
    }

    db = createDatabaseClient();
  });

  afterAll(async () => {
    if (db) {
      await db.close();
    }
  });

  describe('Extension Validation', () => {
    it('should have pgvector extension installed', async () => {
      if (!process.env.DATABASE_URL) {
        console.warn('Skipping test - DATABASE_URL not set');
        return;
      }

      const result = await db.query(`
        SELECT COUNT(*) as count
        FROM pg_extension
        WHERE extname = 'vector'
      `);

      expect(result.rows[0].count).toBeGreaterThan(0);
    });

    it('should have uuid generation capability', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await db.query(`
        SELECT gen_random_uuid() as uuid
      `);

      expect(result.rows[0].uuid).toBeDefined();
      expect(typeof result.rows[0].uuid).toBe('string');
    });
  });

  describe('Table Existence', () => {
    const requiredTables = [
      'players',
      'npcs',
      'npc_memories',
      'lore',
      'game_events',
      'world_events',
      'player_feedback',
      'assets',
      'schema_migrations',
    ];

    requiredTables.forEach((tableName) => {
      it(`should have ${tableName} table`, async () => {
        if (!process.env.DATABASE_URL) return;

        const result = await db.query(`
          SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = $1
          ) as exists
        `, [tableName]);

        expect(result.rows[0].exists).toBe(true);
      });
    });
  });

  describe('Players Table Schema', () => {
    it('should have all required columns', async () => {
      if (!process.env.DATABASE_URL) return;

      const requiredColumns = [
        'id',
        'username',
        'class',
        'faction',
        'level',
        'xp',
        'inventory',
        'reputation',
        'created_at',
        'updated_at',
      ];

      const result = await db.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'players'
      `);

      const columnNames = result.rows.map(row => row.column_name);

      requiredColumns.forEach((col) => {
        expect(columnNames).toContain(col);
      });
    });

    it('should have UUID primary key', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await db.query(`
        SELECT data_type
        FROM information_schema.columns
        WHERE table_name = 'players'
        AND column_name = 'id'
      `);

      expect(result.rows[0].data_type).toBe('uuid');
    });

    it('should have UNIQUE constraint on username', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await db.query(`
        SELECT COUNT(*) as count
        FROM information_schema.table_constraints
        WHERE table_name = 'players'
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%username%'
      `);

      expect(result.rows[0].count).toBeGreaterThan(0);
    });

    it('should have CHECK constraint on level', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await db.query(`
        SELECT COUNT(*) as count
        FROM information_schema.check_constraints
        WHERE constraint_schema = 'public'
        AND constraint_name LIKE '%players%level%'
      `);

      expect(result.rows[0].count).toBeGreaterThan(0);
    });

    it('should have JSONB type for inventory', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await db.query(`
        SELECT data_type
        FROM information_schema.columns
        WHERE table_name = 'players'
        AND column_name = 'inventory'
      `);

      expect(result.rows[0].data_type).toBe('jsonb');
    });
  });

  describe('NPCs Table Schema', () => {
    it('should have all required columns', async () => {
      if (!process.env.DATABASE_URL) return;

      const requiredColumns = ['id', 'name', 'role', 'location', 'personality', 'created_at'];

      const result = await db.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'npcs'
      `);

      const columnNames = result.rows.map(row => row.column_name);

      requiredColumns.forEach((col) => {
        expect(columnNames).toContain(col);
      });
    });

    it('should have JSONB type for personality', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await db.query(`
        SELECT data_type
        FROM information_schema.columns
        WHERE table_name = 'npcs'
        AND column_name = 'personality'
      `);

      expect(result.rows[0].data_type).toBe('jsonb');
    });
  });

  describe('NPC Memories Table Schema', () => {
    it('should have all required columns', async () => {
      if (!process.env.DATABASE_URL) return;

      const requiredColumns = [
        'id',
        'npc_id',
        'player_id',
        'memory',
        'importance',
        'metadata',
        'created_at',
      ];

      const result = await db.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'npc_memories'
      `);

      const columnNames = result.rows.map(row => row.column_name);

      requiredColumns.forEach((col) => {
        expect(columnNames).toContain(col);
      });
    });

    it('should have CHECK constraint on importance (1-10)', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await db.query(`
        SELECT COUNT(*) as count
        FROM information_schema.check_constraints
        WHERE constraint_schema = 'public'
        AND constraint_name LIKE '%npc_memories%importance%'
      `);

      expect(result.rows[0].count).toBeGreaterThan(0);
    });

    it('should have foreign key to players', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await db.query(`
        SELECT COUNT(*) as count
        FROM information_schema.referential_constraints rc
        JOIN information_schema.constraint_column_usage ccu
          ON rc.constraint_name = ccu.constraint_name
        WHERE rc.constraint_schema = 'public'
        AND ccu.table_name = 'players'
        AND rc.table_name = 'npc_memories'
      `);

      expect(result.rows[0].count).toBeGreaterThan(0);
    });

    it('should have foreign key to npcs', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await db.query(`
        SELECT COUNT(*) as count
        FROM information_schema.referential_constraints rc
        JOIN information_schema.constraint_column_usage ccu
          ON rc.constraint_name = ccu.constraint_name
        WHERE rc.constraint_schema = 'public'
        AND ccu.table_name = 'npcs'
        AND rc.table_name = 'npc_memories'
      `);

      expect(result.rows[0].count).toBeGreaterThan(0);
    });
  });

  describe('Lore Table Schema', () => {
    it('should have all required columns', async () => {
      if (!process.env.DATABASE_URL) return;

      const requiredColumns = [
        'id',
        'title',
        'content',
        'region',
        'tags',
        'embedding',
        'created_at',
      ];

      const result = await db.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'lore'
      `);

      const columnNames = result.rows.map(row => row.column_name);

      requiredColumns.forEach((col) => {
        expect(columnNames).toContain(col);
      });
    });

    it('should have vector type for embedding column', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await db.query(`
        SELECT udt_name
        FROM information_schema.columns
        WHERE table_name = 'lore'
        AND column_name = 'embedding'
      `);

      expect(result.rows[0].udt_name).toBe('vector');
    });

    it('should have array type for tags column', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await db.query(`
        SELECT data_type
        FROM information_schema.columns
        WHERE table_name = 'lore'
        AND column_name = 'tags'
      `);

      expect(result.rows[0].data_type).toBe('ARRAY');
    });

    it('should have vector index on embedding', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await db.query(`
        SELECT COUNT(*) as count
        FROM pg_indexes
        WHERE tablename = 'lore'
        AND indexdef LIKE '%vector%'
      `);

      expect(result.rows[0].count).toBeGreaterThan(0);
    });

    it('should have GIN index on tags', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await db.query(`
        SELECT COUNT(*) as count
        FROM pg_indexes
        WHERE tablename = 'lore'
        AND indexdef LIKE '%gin%'
      `);

      expect(result.rows[0].count).toBeGreaterThan(0);
    });
  });

  describe('Game Events Table Schema', () => {
    it('should have all required columns', async () => {
      if (!process.env.DATABASE_URL) return;

      const requiredColumns = [
        'id',
        'player_id',
        'event_type',
        'location',
        'metadata',
        'created_at',
      ];

      const result = await db.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'game_events'
      `);

      const columnNames = result.rows.map(row => row.column_name);

      requiredColumns.forEach((col) => {
        expect(columnNames).toContain(col);
      });
    });

    it('should have foreign key to players', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await db.query(`
        SELECT COUNT(*) as count
        FROM information_schema.referential_constraints rc
        JOIN information_schema.constraint_column_usage ccu
          ON rc.constraint_name = ccu.constraint_name
        WHERE rc.constraint_schema = 'public'
        AND ccu.table_name = 'players'
        AND rc.table_name = 'game_events'
      `);

      expect(result.rows[0].count).toBeGreaterThan(0);
    });

    it('should have composite index on player_id and event_type', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await db.query(`
        SELECT COUNT(*) as count
        FROM pg_indexes
        WHERE tablename = 'game_events'
        AND indexname LIKE '%player%type%'
      `);

      expect(result.rows[0].count).toBeGreaterThan(0);
    });
  });

  describe('World Events Table Schema', () => {
    it('should have all required columns', async () => {
      if (!process.env.DATABASE_URL) return;

      const requiredColumns = [
        'id',
        'event_name',
        'description',
        'trigger_source',
        'metadata',
        'created_at',
      ];

      const result = await db.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'world_events'
      `);

      const columnNames = result.rows.map(row => row.column_name);

      requiredColumns.forEach((col) => {
        expect(columnNames).toContain(col);
      });
    });
  });

  describe('Index Optimization', () => {
    it('should have at least 3 indexes on players table', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await db.query(`
        SELECT COUNT(*) as count
        FROM pg_indexes
        WHERE tablename = 'players'
      `);

      expect(result.rows[0].count).toBeGreaterThanOrEqual(3);
    });

    it('should have at least 3 indexes on npc_memories table', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await db.query(`
        SELECT COUNT(*) as count
        FROM pg_indexes
        WHERE tablename = 'npc_memories'
      `);

      expect(result.rows[0].count).toBeGreaterThanOrEqual(3);
    });

    it('should have at least 3 indexes on game_events table', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await db.query(`
        SELECT COUNT(*) as count
        FROM pg_indexes
        WHERE tablename = 'game_events'
      `);

      expect(result.rows[0].count).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Trigger Validation', () => {
    it('should have update_updated_at_column function', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await db.query(`
        SELECT COUNT(*) as count
        FROM pg_proc
        WHERE proname = 'update_updated_at_column'
      `);

      expect(result.rows[0].count).toBeGreaterThan(0);
    });

    it('should have triggers for updated_at columns', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await db.query(`
        SELECT COUNT(*) as count
        FROM information_schema.triggers
        WHERE trigger_name LIKE 'update_%_updated_at'
      `);

      // Should have triggers for players, npcs, lore, assets (at least 3)
      expect(result.rows[0].count).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Data Type Consistency', () => {
    it('should use TIMESTAMP WITH TIME ZONE for all timestamp columns', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await db.query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE (column_name = 'created_at' OR column_name = 'updated_at')
        AND table_schema = 'public'
        AND data_type != 'timestamp with time zone'
      `);

      expect(result.rows[0].count).toBe(0);
    });

    it('should use UUID for all id columns', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await db.query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE column_name = 'id'
        AND table_schema = 'public'
        AND data_type != 'uuid'
      `);

      expect(result.rows[0].count).toBe(0);
    });
  });

  describe('Cascade Delete Configuration', () => {
    it('should have CASCADE delete on npc_memories foreign keys', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await db.query(`
        SELECT COUNT(*) as count
        FROM information_schema.referential_constraints
        WHERE constraint_schema = 'public'
        AND table_name = 'npc_memories'
        AND delete_rule = 'CASCADE'
      `);

      // Should have 2 CASCADE rules (player_id and npc_id)
      expect(result.rows[0].count).toBe(2);
    });

    it('should have CASCADE delete on game_events foreign key', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await db.query(`
        SELECT COUNT(*) as count
        FROM information_schema.referential_constraints
        WHERE constraint_schema = 'public'
        AND table_name = 'game_events'
        AND delete_rule = 'CASCADE'
      `);

      expect(result.rows[0].count).toBeGreaterThan(0);
    });
  });

  describe('Schema Migrations Table', () => {
    it('should track applied migrations', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await db.query(`
        SELECT COUNT(*) as count
        FROM schema_migrations
      `);

      // Should have at least 1 migration applied (001_initial_schema.sql)
      expect(result.rows[0].count).toBeGreaterThan(0);
    });

    it('should have 001_initial_schema.sql recorded', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await db.query(`
        SELECT COUNT(*) as count
        FROM schema_migrations
        WHERE migration_file = '001_initial_schema.sql'
      `);

      expect(result.rows[0].count).toBe(1);
    });
  });
});

/**
 * Integration test: Insert and query data
 */
describe('Schema Integration Tests', () => {
  let db: DatabaseClient;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) return;
    db = createDatabaseClient();
  });

  afterAll(async () => {
    if (db) await db.close();
  });

  it('should insert and retrieve a player', async () => {
    if (!process.env.DATABASE_URL) return;

    // Insert test player
    await db.query(`
      INSERT INTO players (username, class, level, xp)
      VALUES ('TestPlayer', 'TestClass', 1, 0)
      ON CONFLICT (username) DO NOTHING
    `);

    // Retrieve player
    const result = await db.query(`
      SELECT * FROM players WHERE username = 'TestPlayer'
    `);

    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows[0].username).toBe('TestPlayer');
  });

  it('should enforce foreign key constraints', async () => {
    if (!process.env.DATABASE_URL) return;

    // Attempt to insert memory with invalid player_id
    const invalidUUID = '00000000-0000-0000-0000-000000000000';

    await expect(async () => {
      await db.query(`
        INSERT INTO npc_memories (npc_id, player_id, memory, importance)
        VALUES ($1, $1, 'Test memory', 5)
      `, [invalidUUID]);
    }).rejects.toThrow();
  });

  it('should enforce CHECK constraints', async () => {
    if (!process.env.DATABASE_URL) return;

    // Attempt to insert invalid importance value
    await expect(async () => {
      await db.query(`
        INSERT INTO npc_memories (npc_id, player_id, memory, importance)
        VALUES (gen_random_uuid(), gen_random_uuid(), 'Test', 15)
      `);
    }).rejects.toThrow();
  });
});
