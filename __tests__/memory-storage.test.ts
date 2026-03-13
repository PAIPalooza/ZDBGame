/**
 * Memory Storage Layer Tests
 *
 * Tests for ZeroDB-backed NPC memory storage
 *
 * References:
 * - Issue #6: NPC Memory Storage Migration
 * - lib/memory-storage.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  createMemory,
  createMemoryIfNotExists,
  getMemoryById,
  getMemoriesForNPCAndPlayer,
  getAllMemoriesForNPC,
  getAllMemoriesForPlayer,
  getTopMemories,
  getAllMemories,
  findDuplicateMemory,
  updateMemoryImportance,
  updateMemoryMetadata,
  deleteMemory,
  deleteMemoriesForNPCAndPlayer,
  deleteAllMemories,
  getMemoryCount,
  getMemoryStats,
} from '../lib/memory-storage';
import { closePool } from '../lib/db';

// Test UUIDs
const TEST_NPC_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_PLAYER_ID = '650e8400-e29b-41d4-a716-446655440001';
const TEST_PLAYER_ID_2 = '750e8400-e29b-41d4-a716-446655440002';

describe('Memory Storage Layer', () => {
  // Clean up before and after tests
  beforeEach(async () => {
    await deleteAllMemories();
  });

  afterAll(async () => {
    await deleteAllMemories();
    await closePool();
  });

  describe('Create Operations', () => {
    it('should create a new memory with default importance', async () => {
      const memory = await createMemory({
        npc_id: TEST_NPC_ID,
        player_id: TEST_PLAYER_ID,
        memory: 'Player asked about Ember Tower',
      });

      expect(memory).toBeDefined();
      expect(memory.id).toBeDefined();
      expect(memory.npc_id).toBe(TEST_NPC_ID);
      expect(memory.player_id).toBe(TEST_PLAYER_ID);
      expect(memory.memory).toBe('Player asked about Ember Tower');
      expect(memory.importance).toBe(1);
      expect(memory.created_at).toBeDefined();
    });

    it('should create a memory with custom importance', async () => {
      const memory = await createMemory({
        npc_id: TEST_NPC_ID,
        player_id: TEST_PLAYER_ID,
        memory: 'Player defeated wolves near Moonvale',
        importance: 3,
      });

      expect(memory.importance).toBe(3);
    });

    it('should create a memory with metadata', async () => {
      const memory = await createMemory({
        npc_id: TEST_NPC_ID,
        player_id: TEST_PLAYER_ID,
        memory: 'Player completed quest',
        importance: 4,
        metadata: { questName: 'Wolf Hunt', reward: 100 },
      });

      expect(memory.metadata).toEqual({ questName: 'Wolf Hunt', reward: 100 });
    });

    it('should trim memory text', async () => {
      const memory = await createMemory({
        npc_id: TEST_NPC_ID,
        player_id: TEST_PLAYER_ID,
        memory: '  Player explored forest  ',
      });

      expect(memory.memory).toBe('Player explored forest');
    });

    it('should reject importance outside 1-10 range', async () => {
      await expect(
        createMemory({
          npc_id: TEST_NPC_ID,
          player_id: TEST_PLAYER_ID,
          memory: 'Test',
          importance: 0,
        })
      ).rejects.toThrow('Importance must be between 1 and 10');

      await expect(
        createMemory({
          npc_id: TEST_NPC_ID,
          player_id: TEST_PLAYER_ID,
          memory: 'Test',
          importance: 11,
        })
      ).rejects.toThrow('Importance must be between 1 and 10');
    });

    it('should reject missing required fields', async () => {
      await expect(
        createMemory({
          npc_id: '',
          player_id: TEST_PLAYER_ID,
          memory: 'Test',
        })
      ).rejects.toThrow('npc_id, player_id, and memory are required');
    });
  });

  describe('Duplicate Detection', () => {
    it('should detect duplicate memories (case-insensitive)', async () => {
      await createMemory({
        npc_id: TEST_NPC_ID,
        player_id: TEST_PLAYER_ID,
        memory: 'Player asked about Ember Tower',
      });

      const duplicate = await findDuplicateMemory(
        TEST_NPC_ID,
        TEST_PLAYER_ID,
        'player asked about ember tower'
      );

      expect(duplicate).toBeDefined();
      expect(duplicate?.memory).toBe('Player asked about Ember Tower');
    });

    it('should not create duplicate memories', async () => {
      const first = await createMemoryIfNotExists({
        npc_id: TEST_NPC_ID,
        player_id: TEST_PLAYER_ID,
        memory: 'Player defeated wolves',
      });

      const second = await createMemoryIfNotExists({
        npc_id: TEST_NPC_ID,
        player_id: TEST_PLAYER_ID,
        memory: 'Player defeated wolves',
      });

      expect(first.id).toBe(second.id);

      const count = await getMemoryCount();
      expect(count).toBe(1);
    });

    it('should allow same memory text for different NPCs', async () => {
      const npc1Memory = await createMemoryIfNotExists({
        npc_id: TEST_NPC_ID,
        player_id: TEST_PLAYER_ID,
        memory: 'Player asked about lore',
      });

      const npc2Memory = await createMemoryIfNotExists({
        npc_id: '850e8400-e29b-41d4-a716-446655440003',
        player_id: TEST_PLAYER_ID,
        memory: 'Player asked about lore',
      });

      expect(npc1Memory.id).not.toBe(npc2Memory.id);
    });
  });

  describe('Read Operations', () => {
    beforeEach(async () => {
      await createMemory({
        npc_id: TEST_NPC_ID,
        player_id: TEST_PLAYER_ID,
        memory: 'Player asked about Ember Tower',
        importance: 2,
      });

      await createMemory({
        npc_id: TEST_NPC_ID,
        player_id: TEST_PLAYER_ID,
        memory: 'Player defeated wolves',
        importance: 3,
      });

      await createMemory({
        npc_id: TEST_NPC_ID,
        player_id: TEST_PLAYER_ID_2,
        memory: 'Player helped village',
        importance: 2,
      });
    });

    it('should retrieve memory by ID', async () => {
      const memories = await getAllMemories();
      const firstMemory = memories[0];

      const retrieved = await getMemoryById(firstMemory.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(firstMemory.id);
    });

    it('should retrieve memories for NPC and player', async () => {
      const memories = await getMemoriesForNPCAndPlayer(TEST_NPC_ID, TEST_PLAYER_ID);

      expect(memories).toHaveLength(2);
      expect(memories[0].importance).toBe(3); // Sorted by importance desc
      expect(memories[1].importance).toBe(2);
    });

    it('should retrieve all memories for NPC', async () => {
      const memories = await getAllMemoriesForNPC(TEST_NPC_ID);
      expect(memories).toHaveLength(3);
    });

    it('should retrieve all memories for player', async () => {
      const memories = await getAllMemoriesForPlayer(TEST_PLAYER_ID);
      expect(memories).toHaveLength(2);
    });

    it('should retrieve top N memories', async () => {
      const topMemories = await getTopMemories(TEST_NPC_ID, TEST_PLAYER_ID, 1);
      expect(topMemories).toHaveLength(1);
      expect(topMemories[0].importance).toBe(3); // Highest importance
    });

    it('should return empty array for non-existent NPC/Player combo', async () => {
      const memories = await getMemoriesForNPCAndPlayer(
        '999e8400-e29b-41d4-a716-446655440999',
        TEST_PLAYER_ID
      );
      expect(memories).toHaveLength(0);
    });
  });

  describe('Update Operations', () => {
    let memoryId: string;

    beforeEach(async () => {
      const memory = await createMemory({
        npc_id: TEST_NPC_ID,
        player_id: TEST_PLAYER_ID,
        memory: 'Test memory',
        importance: 1,
      });
      memoryId = memory.id;
    });

    it('should update memory importance', async () => {
      const updated = await updateMemoryImportance(memoryId, 5);
      expect(updated?.importance).toBe(5);

      const retrieved = await getMemoryById(memoryId);
      expect(retrieved?.importance).toBe(5);
    });

    it('should reject invalid importance update', async () => {
      await expect(updateMemoryImportance(memoryId, 11)).rejects.toThrow(
        'Importance must be between 1 and 10'
      );
    });

    it('should update memory metadata', async () => {
      const updated = await updateMemoryMetadata(memoryId, { test: 'value' });
      expect(updated?.metadata).toEqual({ test: 'value' });
    });
  });

  describe('Delete Operations', () => {
    it('should delete a specific memory', async () => {
      const memory = await createMemory({
        npc_id: TEST_NPC_ID,
        player_id: TEST_PLAYER_ID,
        memory: 'Test',
      });

      const deleted = await deleteMemory(memory.id);
      expect(deleted).toBe(true);

      const retrieved = await getMemoryById(memory.id);
      expect(retrieved).toBeNull();
    });

    it('should delete all memories for NPC and player', async () => {
      await createMemory({
        npc_id: TEST_NPC_ID,
        player_id: TEST_PLAYER_ID,
        memory: 'Memory 1',
      });

      await createMemory({
        npc_id: TEST_NPC_ID,
        player_id: TEST_PLAYER_ID,
        memory: 'Memory 2',
      });

      await createMemory({
        npc_id: TEST_NPC_ID,
        player_id: TEST_PLAYER_ID_2,
        memory: 'Memory 3',
      });

      const deleted = await deleteMemoriesForNPCAndPlayer(TEST_NPC_ID, TEST_PLAYER_ID);
      expect(deleted).toBe(2);

      const remaining = await getAllMemories();
      expect(remaining).toHaveLength(1);
    });

    it('should delete all memories', async () => {
      await createMemory({
        npc_id: TEST_NPC_ID,
        player_id: TEST_PLAYER_ID,
        memory: 'Memory 1',
      });

      await createMemory({
        npc_id: TEST_NPC_ID,
        player_id: TEST_PLAYER_ID,
        memory: 'Memory 2',
      });

      const deleted = await deleteAllMemories();
      expect(deleted).toBe(2);

      const count = await getMemoryCount();
      expect(count).toBe(0);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await createMemory({
        npc_id: TEST_NPC_ID,
        player_id: TEST_PLAYER_ID,
        memory: 'Low importance',
        importance: 1,
      });

      await createMemory({
        npc_id: TEST_NPC_ID,
        player_id: TEST_PLAYER_ID,
        memory: 'High importance',
        importance: 5,
      });

      await createMemory({
        npc_id: TEST_NPC_ID,
        player_id: TEST_PLAYER_ID_2,
        memory: 'Medium importance',
        importance: 3,
      });
    });

    it('should get memory count', async () => {
      const count = await getMemoryCount();
      expect(count).toBe(3);
    });

    it('should get memory statistics', async () => {
      const stats = await getMemoryStats();

      expect(stats.total).toBe(3);
      expect(stats.avgImportance).toBe(3); // (1 + 5 + 3) / 3
      expect(stats.maxImportance).toBe(5);
      expect(stats.minImportance).toBe(1);
    });
  });
});
