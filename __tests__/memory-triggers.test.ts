/**
 * Memory Trigger Tests
 *
 * Tests for all NPC memory trigger scenarios:
 * - Lore questions
 * - NPC help
 * - Enemy defeats
 * - Quest completion
 *
 * References:
 * - Issue #6: NPC Memory Storage Migration
 * - lib/memory.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  storeMemory,
  storeMemoryLoreQuestion,
  storeMemoryNPCHelp,
  storeMemoryEnemyDefeat,
  storeMemoryQuestCompletion,
  storeMemoryHelpVillage,
  storeMemoryExploration,
  getMemories,
  clearMemories,
  getMemoryCount,
} from '../lib/memory';
import { closePool } from '../lib/db';

// Test UUIDs
const TEST_NPC_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_PLAYER_ID = '650e8400-e29b-41d4-a716-446655440001';

describe('Memory Trigger Scenarios', () => {
  beforeEach(async () => {
    await clearMemories();
  });

  afterAll(async () => {
    await clearMemories();
    await closePool();
  });

  describe('Lore Question Triggers', () => {
    it('should store memory for Ember Tower questions with importance 2', async () => {
      const memory = await storeMemoryLoreQuestion(
        TEST_NPC_ID,
        TEST_PLAYER_ID,
        'Ember Tower'
      );

      expect(memory).toBeDefined();
      expect(memory.memory).toBe('Player asked about Ember Tower');
      expect(memory.importance).toBe(2);
    });

    it('should store memory for Moonvale questions with importance 1', async () => {
      const memory = await storeMemoryLoreQuestion(
        TEST_NPC_ID,
        TEST_PLAYER_ID,
        'Moonvale'
      );

      expect(memory.memory).toBe('Player asked about Moonvale');
      expect(memory.importance).toBe(1);
    });

    it('should store memory for wolves questions with importance 1', async () => {
      const memory = await storeMemoryLoreQuestion(
        TEST_NPC_ID,
        TEST_PLAYER_ID,
        'wolves'
      );

      expect(memory.memory).toBe('Player asked about wolves');
      expect(memory.importance).toBe(1);
    });

    it('should detect Ember Tower case-insensitively', async () => {
      const memory = await storeMemoryLoreQuestion(
        TEST_NPC_ID,
        TEST_PLAYER_ID,
        'ember TOWER history'
      );

      expect(memory.importance).toBe(2);
    });

    it('should not create duplicate lore question memories', async () => {
      await storeMemoryLoreQuestion(TEST_NPC_ID, TEST_PLAYER_ID, 'Ember Tower');
      await storeMemoryLoreQuestion(TEST_NPC_ID, TEST_PLAYER_ID, 'Ember Tower');

      const count = await getMemoryCount();
      expect(count).toBe(1);
    });
  });

  describe('NPC Help Triggers', () => {
    it('should store memory for help request with importance 2', async () => {
      const memory = await storeMemoryNPCHelp(
        TEST_NPC_ID,
        TEST_PLAYER_ID,
        'finding quest items'
      );

      expect(memory.memory).toBe('Player requested help with finding quest items');
      expect(memory.importance).toBe(2);
    });

    it('should store memory for different help types', async () => {
      const help1 = await storeMemoryNPCHelp(
        TEST_NPC_ID,
        TEST_PLAYER_ID,
        'navigation'
      );

      const help2 = await storeMemoryNPCHelp(
        TEST_NPC_ID,
        TEST_PLAYER_ID,
        'combat advice'
      );

      expect(help1.memory).toBe('Player requested help with navigation');
      expect(help2.memory).toBe('Player requested help with combat advice');

      const memories = await getMemories(TEST_NPC_ID, TEST_PLAYER_ID);
      expect(memories).toHaveLength(2);
    });
  });

  describe('Enemy Defeat Triggers', () => {
    it('should store memory for wolf defeat with importance 3', async () => {
      const memory = await storeMemoryEnemyDefeat(
        TEST_NPC_ID,
        TEST_PLAYER_ID,
        'wolves',
        'Moonvale'
      );

      expect(memory.memory).toBe('Player defeated wolves near Moonvale');
      expect(memory.importance).toBe(3);
    });

    it('should store memory for enemy defeat with default location', async () => {
      const memory = await storeMemoryEnemyDefeat(
        TEST_NPC_ID,
        TEST_PLAYER_ID,
        'bandits'
      );

      expect(memory.memory).toBe('Player defeated bandits near the area');
      expect(memory.importance).toBe(3);
    });

    it('should store multiple enemy defeats', async () => {
      await storeMemoryEnemyDefeat(TEST_NPC_ID, TEST_PLAYER_ID, 'wolves', 'northern forest');
      await storeMemoryEnemyDefeat(TEST_NPC_ID, TEST_PLAYER_ID, 'bandits', 'eastern road');
      await storeMemoryEnemyDefeat(TEST_NPC_ID, TEST_PLAYER_ID, 'goblins', 'western caves');

      const memories = await getMemories(TEST_NPC_ID, TEST_PLAYER_ID);
      expect(memories).toHaveLength(3);
      // All should have importance 3
      memories.forEach(m => expect(m.importance).toBe(3));
    });

    it('should allow duplicate wolf defeats to track count', async () => {
      await storeMemoryEnemyDefeat(TEST_NPC_ID, TEST_PLAYER_ID, 'wolves', 'forest');
      await storeMemoryEnemyDefeat(TEST_NPC_ID, TEST_PLAYER_ID, 'wolves', 'plains');

      const memories = await getMemories(TEST_NPC_ID, TEST_PLAYER_ID);
      expect(memories).toHaveLength(2); // Different locations = different memories
    });
  });

  describe('Quest Completion Triggers', () => {
    it('should store memory for quest completion with default importance 4', async () => {
      const memory = await storeMemoryQuestCompletion(
        TEST_NPC_ID,
        TEST_PLAYER_ID,
        'Wolf Hunt'
      );

      expect(memory.memory).toBe('Player completed quest: Wolf Hunt');
      expect(memory.importance).toBe(4);
    });

    it('should store memory for major quest with importance 5', async () => {
      const memory = await storeMemoryQuestCompletion(
        TEST_NPC_ID,
        TEST_PLAYER_ID,
        'Save the Village',
        5
      );

      expect(memory.importance).toBe(5);
    });

    it('should clamp importance to 4-5 range', async () => {
      const lowMemory = await storeMemoryQuestCompletion(
        TEST_NPC_ID,
        TEST_PLAYER_ID,
        'Minor Quest',
        1
      );

      expect(lowMemory.importance).toBe(4); // Clamped to minimum

      await clearMemories();

      const highMemory = await storeMemoryQuestCompletion(
        TEST_NPC_ID,
        TEST_PLAYER_ID,
        'Epic Quest',
        10
      );

      expect(highMemory.importance).toBe(5); // Clamped to maximum
    });

    it('should store multiple quest completions', async () => {
      await storeMemoryQuestCompletion(TEST_NPC_ID, TEST_PLAYER_ID, 'Quest 1');
      await storeMemoryQuestCompletion(TEST_NPC_ID, TEST_PLAYER_ID, 'Quest 2');
      await storeMemoryQuestCompletion(TEST_NPC_ID, TEST_PLAYER_ID, 'Quest 3');

      const memories = await getMemories(TEST_NPC_ID, TEST_PLAYER_ID);
      expect(memories).toHaveLength(3);
    });
  });

  describe('Village Help Triggers', () => {
    it('should store memory for helping village with importance 2', async () => {
      const memory = await storeMemoryHelpVillage(TEST_NPC_ID, TEST_PLAYER_ID);

      expect(memory.memory).toBe('Player helped the village');
      expect(memory.importance).toBe(2);
    });

    it('should not create duplicate village help memories', async () => {
      await storeMemoryHelpVillage(TEST_NPC_ID, TEST_PLAYER_ID);
      await storeMemoryHelpVillage(TEST_NPC_ID, TEST_PLAYER_ID);

      const count = await getMemoryCount();
      expect(count).toBe(1);
    });
  });

  describe('Exploration Triggers', () => {
    it('should store memory for exploration with importance 1', async () => {
      const memory = await storeMemoryExploration(
        TEST_NPC_ID,
        TEST_PLAYER_ID,
        'northern forest'
      );

      expect(memory.memory).toBe('Player explored northern forest');
      expect(memory.importance).toBe(1);
    });

    it('should store multiple exploration memories', async () => {
      await storeMemoryExploration(TEST_NPC_ID, TEST_PLAYER_ID, 'northern forest');
      await storeMemoryExploration(TEST_NPC_ID, TEST_PLAYER_ID, 'eastern mountains');
      await storeMemoryExploration(TEST_NPC_ID, TEST_PLAYER_ID, 'southern plains');

      const memories = await getMemories(TEST_NPC_ID, TEST_PLAYER_ID);
      expect(memories).toHaveLength(3);
      memories.forEach(m => expect(m.importance).toBe(1));
    });
  });

  describe('Memory Retrieval and Sorting', () => {
    it('should sort memories by importance then date', async () => {
      // Create memories with different importance levels
      await storeMemoryExploration(TEST_NPC_ID, TEST_PLAYER_ID, 'forest'); // importance 1
      await storeMemoryHelpVillage(TEST_NPC_ID, TEST_PLAYER_ID); // importance 2
      await storeMemoryEnemyDefeat(TEST_NPC_ID, TEST_PLAYER_ID, 'wolves', 'Moonvale'); // importance 3
      await storeMemoryQuestCompletion(TEST_NPC_ID, TEST_PLAYER_ID, 'Wolf Hunt'); // importance 4

      const memories = await getMemories(TEST_NPC_ID, TEST_PLAYER_ID);

      expect(memories).toHaveLength(4);
      expect(memories[0].importance).toBe(4); // Quest
      expect(memories[1].importance).toBe(3); // Enemy defeat
      expect(memories[2].importance).toBe(2); // Village help
      expect(memories[3].importance).toBe(1); // Exploration
    });

    it('should retrieve memories with timestamps', async () => {
      const memory = await storeMemory(
        TEST_NPC_ID,
        TEST_PLAYER_ID,
        'Test memory',
        1
      );

      expect(memory.createdAt).toBeDefined();
      expect(new Date(memory.createdAt)).toBeInstanceOf(Date);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle complete player journey', async () => {
      // Player asks about lore
      await storeMemoryLoreQuestion(TEST_NPC_ID, TEST_PLAYER_ID, 'Ember Tower');
      await storeMemoryLoreQuestion(TEST_NPC_ID, TEST_PLAYER_ID, 'wolves');

      // Player explores
      await storeMemoryExploration(TEST_NPC_ID, TEST_PLAYER_ID, 'northern forest');

      // Player defeats enemies
      await storeMemoryEnemyDefeat(TEST_NPC_ID, TEST_PLAYER_ID, 'wolves', 'forest');
      await storeMemoryEnemyDefeat(TEST_NPC_ID, TEST_PLAYER_ID, 'wolves', 'plains');

      // Player completes quest
      await storeMemoryQuestCompletion(TEST_NPC_ID, TEST_PLAYER_ID, 'Wolf Hunt', 5);

      // Player helps village
      await storeMemoryHelpVillage(TEST_NPC_ID, TEST_PLAYER_ID);

      const memories = await getMemories(TEST_NPC_ID, TEST_PLAYER_ID);

      // Should have 7 memories (2 lore + 1 explore + 2 defeats + 1 quest + 1 village)
      expect(memories).toHaveLength(7);

      // Quest should be first (importance 5)
      expect(memories[0].importance).toBe(5);

      // Enemy defeats should be next (importance 3)
      expect(memories[1].importance).toBe(3);
      expect(memories[2].importance).toBe(3);
    });

    it('should maintain separate memories for different NPCs', async () => {
      const NPC_2_ID = '750e8400-e29b-41d4-a716-446655440002';

      await storeMemory(TEST_NPC_ID, TEST_PLAYER_ID, 'Memory for NPC 1');
      await storeMemory(NPC_2_ID, TEST_PLAYER_ID, 'Memory for NPC 2');

      const npc1Memories = await getMemories(TEST_NPC_ID, TEST_PLAYER_ID);
      const npc2Memories = await getMemories(NPC_2_ID, TEST_PLAYER_ID);

      expect(npc1Memories).toHaveLength(1);
      expect(npc2Memories).toHaveLength(1);
      expect(npc1Memories[0].memory).toBe('Memory for NPC 1');
      expect(npc2Memories[0].memory).toBe('Memory for NPC 2');
    });

    it('should validate importance bounds across all trigger types', async () => {
      // These should all succeed with importance in valid range
      const loreMemory = await storeMemoryLoreQuestion(TEST_NPC_ID, TEST_PLAYER_ID, 'test');
      const helpMemory = await storeMemoryNPCHelp(TEST_NPC_ID, TEST_PLAYER_ID, 'test');
      const defeatMemory = await storeMemoryEnemyDefeat(TEST_NPC_ID, TEST_PLAYER_ID, 'test');
      const questMemory = await storeMemoryQuestCompletion(TEST_NPC_ID, TEST_PLAYER_ID, 'test');

      expect(loreMemory.importance).toBeGreaterThanOrEqual(1);
      expect(loreMemory.importance).toBeLessThanOrEqual(10);

      expect(helpMemory.importance).toBeGreaterThanOrEqual(1);
      expect(helpMemory.importance).toBeLessThanOrEqual(10);

      expect(defeatMemory.importance).toBeGreaterThanOrEqual(1);
      expect(defeatMemory.importance).toBeLessThanOrEqual(10);

      expect(questMemory.importance).toBeGreaterThanOrEqual(1);
      expect(questMemory.importance).toBeLessThanOrEqual(10);
    });
  });
});
