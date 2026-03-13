/**
 * ZeroDB Memory Storage Layer
 *
 * Provides data access layer for NPC memories using ZeroDB (PostgreSQL).
 * Implements all CRUD operations with proper error handling and validation.
 *
 * Features:
 * - Duplicate detection based on exact memory text match
 * - Importance scoring (1-10)
 * - Efficient querying with composite indexes
 * - Transaction support for complex operations
 *
 * References:
 * - Issue #6: NPC Memory Storage Migration
 * - datamodel.md: NPC Memories schema
 */

import { query, transaction, PoolClient } from './db';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Database representation of NPC memory (snake_case)
 */
export interface NPCMemoryRow {
  id: string;
  npc_id: string;
  player_id: string;
  memory: string;
  importance: number;
  metadata: Record<string, any>;
  created_at: string;
}

/**
 * Input for creating a new memory
 */
export interface CreateMemoryInput {
  npc_id: string;
  player_id: string;
  memory: string;
  importance?: number;
  metadata?: Record<string, any>;
}

// ============================================================================
// Create Operations
// ============================================================================

/**
 * Create a new NPC memory
 *
 * @param input - Memory data to create
 * @returns Created memory record
 *
 * @example
 * const memory = await createMemory({
 *   npc_id: 'uuid-here',
 *   player_id: 'uuid-here',
 *   memory: 'Player asked about Ember Tower',
 *   importance: 2
 * });
 */
export async function createMemory(input: CreateMemoryInput): Promise<NPCMemoryRow> {
  // Validate importance score
  const importance = input.importance ?? 1;
  if (importance < 1 || importance > 10) {
    throw new Error('Importance must be between 1 and 10');
  }

  // Validate required fields
  if (!input.npc_id || !input.player_id || !input.memory) {
    throw new Error('npc_id, player_id, and memory are required');
  }

  const result = await query<NPCMemoryRow>(
    `INSERT INTO npc_memories (npc_id, player_id, memory, importance, metadata)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      input.npc_id,
      input.player_id,
      input.memory.trim(),
      importance,
      JSON.stringify(input.metadata || {}),
    ]
  );

  return result.rows[0];
}

/**
 * Create a memory only if a similar one doesn't already exist
 * Checks for exact match (case-insensitive) to prevent duplicates
 *
 * @param input - Memory data to create
 * @returns Created or existing memory record
 */
export async function createMemoryIfNotExists(
  input: CreateMemoryInput
): Promise<NPCMemoryRow> {
  // Check for existing memory with same text
  const existing = await findDuplicateMemory(
    input.npc_id,
    input.player_id,
    input.memory
  );

  if (existing) {
    return existing;
  }

  return createMemory(input);
}

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Get a specific memory by ID
 *
 * @param memoryId - UUID of the memory
 * @returns Memory record or null if not found
 */
export async function getMemoryById(memoryId: string): Promise<NPCMemoryRow | null> {
  const result = await query<NPCMemoryRow>(
    'SELECT * FROM npc_memories WHERE id = $1',
    [memoryId]
  );

  return result.rows[0] || null;
}

/**
 * Get all memories for a specific NPC and player
 * Results are sorted by importance (desc) then creation date (desc)
 *
 * @param npcId - UUID of the NPC
 * @param playerId - UUID of the player
 * @returns Array of memory records
 */
export async function getMemoriesForNPCAndPlayer(
  npcId: string,
  playerId: string
): Promise<NPCMemoryRow[]> {
  const result = await query<NPCMemoryRow>(
    `SELECT * FROM npc_memories
     WHERE npc_id = $1 AND player_id = $2
     ORDER BY importance DESC, created_at DESC`,
    [npcId, playerId]
  );

  return result.rows;
}

/**
 * Get all memories for a specific NPC (across all players)
 *
 * @param npcId - UUID of the NPC
 * @returns Array of memory records
 */
export async function getAllMemoriesForNPC(npcId: string): Promise<NPCMemoryRow[]> {
  const result = await query<NPCMemoryRow>(
    `SELECT * FROM npc_memories
     WHERE npc_id = $1
     ORDER BY created_at DESC`,
    [npcId]
  );

  return result.rows;
}

/**
 * Get all memories about a specific player (across all NPCs)
 *
 * @param playerId - UUID of the player
 * @returns Array of memory records
 */
export async function getAllMemoriesForPlayer(playerId: string): Promise<NPCMemoryRow[]> {
  const result = await query<NPCMemoryRow>(
    `SELECT * FROM npc_memories
     WHERE player_id = $1
     ORDER BY created_at DESC`,
    [playerId]
  );

  return result.rows;
}

/**
 * Get the most important memories for an NPC about a player
 *
 * @param npcId - UUID of the NPC
 * @param playerId - UUID of the player
 * @param limit - Maximum number of memories to return
 * @returns Array of memory records
 */
export async function getTopMemories(
  npcId: string,
  playerId: string,
  limit: number = 10
): Promise<NPCMemoryRow[]> {
  const result = await query<NPCMemoryRow>(
    `SELECT * FROM npc_memories
     WHERE npc_id = $1 AND player_id = $2
     ORDER BY importance DESC, created_at DESC
     LIMIT $3`,
    [npcId, playerId, limit]
  );

  return result.rows;
}

/**
 * Get all memories in the database
 * Use with caution on large datasets
 *
 * @returns Array of all memory records
 */
export async function getAllMemories(): Promise<NPCMemoryRow[]> {
  const result = await query<NPCMemoryRow>(
    'SELECT * FROM npc_memories ORDER BY created_at DESC'
  );

  return result.rows;
}

// ============================================================================
// Duplicate Detection
// ============================================================================

/**
 * Find a duplicate memory (case-insensitive exact match)
 *
 * @param npcId - UUID of the NPC
 * @param playerId - UUID of the player
 * @param memoryText - Memory text to check
 * @returns Existing memory or null
 */
export async function findDuplicateMemory(
  npcId: string,
  playerId: string,
  memoryText: string
): Promise<NPCMemoryRow | null> {
  const result = await query<NPCMemoryRow>(
    `SELECT * FROM npc_memories
     WHERE npc_id = $1
     AND player_id = $2
     AND LOWER(memory) = LOWER($3)
     LIMIT 1`,
    [npcId, playerId, memoryText.trim()]
  );

  return result.rows[0] || null;
}

// ============================================================================
// Update Operations
// ============================================================================

/**
 * Update the importance of a memory
 *
 * @param memoryId - UUID of the memory
 * @param importance - New importance value (1-10)
 * @returns Updated memory or null if not found
 */
export async function updateMemoryImportance(
  memoryId: string,
  importance: number
): Promise<NPCMemoryRow | null> {
  if (importance < 1 || importance > 10) {
    throw new Error('Importance must be between 1 and 10');
  }

  const result = await query<NPCMemoryRow>(
    `UPDATE npc_memories
     SET importance = $1
     WHERE id = $2
     RETURNING *`,
    [importance, memoryId]
  );

  return result.rows[0] || null;
}

/**
 * Update memory metadata
 *
 * @param memoryId - UUID of the memory
 * @param metadata - New metadata object
 * @returns Updated memory or null if not found
 */
export async function updateMemoryMetadata(
  memoryId: string,
  metadata: Record<string, any>
): Promise<NPCMemoryRow | null> {
  const result = await query<NPCMemoryRow>(
    `UPDATE npc_memories
     SET metadata = $1
     WHERE id = $2
     RETURNING *`,
    [JSON.stringify(metadata), memoryId]
  );

  return result.rows[0] || null;
}

// ============================================================================
// Delete Operations
// ============================================================================

/**
 * Delete a specific memory
 *
 * @param memoryId - UUID of the memory
 * @returns True if deleted, false if not found
 */
export async function deleteMemory(memoryId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM npc_memories WHERE id = $1',
    [memoryId]
  );

  return (result.rowCount ?? 0) > 0;
}

/**
 * Delete all memories for a specific NPC and player
 *
 * @param npcId - UUID of the NPC
 * @param playerId - UUID of the player
 * @returns Number of memories deleted
 */
export async function deleteMemoriesForNPCAndPlayer(
  npcId: string,
  playerId: string
): Promise<number> {
  const result = await query(
    'DELETE FROM npc_memories WHERE npc_id = $1 AND player_id = $2',
    [npcId, playerId]
  );

  return result.rowCount ?? 0;
}

/**
 * Delete all memories (use with caution!)
 * Primarily for testing and development
 *
 * @returns Number of memories deleted
 */
export async function deleteAllMemories(): Promise<number> {
  const result = await query('DELETE FROM npc_memories');
  return result.rowCount ?? 0;
}

// ============================================================================
// Statistics and Analytics
// ============================================================================

/**
 * Get total count of memories
 *
 * @returns Total number of memories
 */
export async function getMemoryCount(): Promise<number> {
  const result = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM npc_memories'
  );

  return parseInt(result.rows[0]?.count || '0', 10);
}

/**
 * Get memory count for a specific NPC
 *
 * @param npcId - UUID of the NPC
 * @returns Number of memories for the NPC
 */
export async function getMemoryCountForNPC(npcId: string): Promise<number> {
  const result = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM npc_memories WHERE npc_id = $1',
    [npcId]
  );

  return parseInt(result.rows[0]?.count || '0', 10);
}

/**
 * Get memory count for a specific player
 *
 * @param playerId - UUID of the player
 * @returns Number of memories about the player
 */
export async function getMemoryCountForPlayer(playerId: string): Promise<number> {
  const result = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM npc_memories WHERE player_id = $1',
    [playerId]
  );

  return parseInt(result.rows[0]?.count || '0', 10);
}

/**
 * Get memory statistics
 *
 * @returns Object with various memory statistics
 */
export async function getMemoryStats(): Promise<{
  total: number;
  avgImportance: number;
  maxImportance: number;
  minImportance: number;
}> {
  const result = await query<{
    total: string;
    avg_importance: string;
    max_importance: number;
    min_importance: number;
  }>(
    `SELECT
      COUNT(*) as total,
      AVG(importance) as avg_importance,
      MAX(importance) as max_importance,
      MIN(importance) as min_importance
     FROM npc_memories`
  );

  const row = result.rows[0];

  return {
    total: parseInt(row?.total || '0', 10),
    avgImportance: parseFloat(row?.avg_importance || '0'),
    maxImportance: row?.max_importance || 0,
    minImportance: row?.min_importance || 0,
  };
}
