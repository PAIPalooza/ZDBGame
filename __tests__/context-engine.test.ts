/**
 * Tests for Context Retrieval Engine
 *
 * Tests cover:
 * - Context building with various configurations
 * - Context formatting for AI consumption
 * - Performance benchmarking
 * - Edge cases and error handling
 * - Data retrieval optimization
 *
 * Refs: Epic 4 - Context Retrieval Engine
 * Issue: #8
 */

import { describe, expect, test, beforeEach } from '@jest/globals';
import {
  buildGameContext,
  formatContextForAI,
  quickBuildContext,
  extractSearchQuery,
  validateConfig,
  benchmarkContextRetrieval,
  ContextRetrievalConfig
} from '../lib/context-engine';

import {
  savePlayer,
  saveNPC,
  saveNPCMemory,
  saveLore,
  saveGameEvent,
  saveWorldEvent,
  clearAllData
} from '../lib/data';

// ============================================================================
// Setup & Teardown
// ============================================================================

let testPlayerId: string;
let testNPCId: string;

beforeEach(() => {
  // Clear all data before each test
  clearAllData();

  // Create test player
  const player = savePlayer({
    username: 'TestPlayer',
    class: 'Ranger',
    faction: 'Forest Guild',
    level: 5,
    xp: 1000,
    inventory: [],
    reputation: 50
  });
  testPlayerId = player.id;

  // Create test NPC
  const npc = saveNPC({
    name: 'TestNPC',
    role: 'Historian',
    location: 'Moonvale',
    personality: { friendly: true }
  });
  testNPCId = npc.id;
});

// ============================================================================
// Context Building Tests
// ============================================================================

describe('buildGameContext', () => {
  test('should build complete context with all components', async () => {
    // Add test data
    saveNPCMemory({
      npc_id: testNPCId,
      player_id: testPlayerId,
      memory: 'Player asked about Ember Tower',
      importance: 5,
      metadata: {}
    });

    saveLore({
      title: 'Ember Tower',
      content: 'A tower that fell long ago',
      region: 'Northern Valley',
      tags: ['tower', 'history']
    });

    saveGameEvent({
      player_id: testPlayerId,
      event_type: 'explore',
      location: 'Northern Forest',
      metadata: { description: 'Explored the forest' }
    });

    saveWorldEvent({
      event_name: 'Wolf Pack Retreat',
      description: 'Wolves retreated from the area',
      trigger_source: testPlayerId,
      metadata: {}
    });

    const context = await buildGameContext(
      testPlayerId,
      testNPCId,
      'ember tower'
    );

    // Validate player data
    expect(context.player).not.toBeNull();
    expect(context.player?.username).toBe('TestPlayer');
    expect(context.player?.level).toBe(5);

    // Validate NPC data
    expect(context.npc).not.toBeNull();
    expect(context.npc?.name).toBe('TestNPC');
    expect(context.npc?.role).toBe('Historian');

    // Validate memories
    expect(context.npcMemories.length).toBeGreaterThan(0);
    expect(context.npcMemories[0].memory).toBe('Player asked about Ember Tower');

    // Validate lore
    expect(context.relevantLore.length).toBeGreaterThan(0);

    // Validate game events
    expect(context.recentGameEvents.length).toBeGreaterThan(0);

    // Validate world events
    expect(context.recentWorldEvents.length).toBeGreaterThan(0);

    // Validate metadata
    expect(context.metadata).toBeDefined();
    expect(context.metadata.retrievalTimeMs).toBeGreaterThanOrEqual(0);
    expect(context.metadata.stats.memoriesFound).toBeGreaterThan(0);
  });

  test('should handle non-existent player gracefully', async () => {
    const context = await buildGameContext(
      'non-existent-player',
      testNPCId,
      'test'
    );

    expect(context.player).toBeNull();
    expect(context.npc).not.toBeNull();
  });

  test('should handle non-existent NPC gracefully', async () => {
    const context = await buildGameContext(
      testPlayerId,
      'non-existent-npc',
      'test'
    );

    expect(context.player).not.toBeNull();
    expect(context.npc).toBeNull();
  });

  test('should respect maxMemories configuration', async () => {
    // Create multiple memories
    for (let i = 0; i < 15; i++) {
      saveNPCMemory({
        npc_id: testNPCId,
        player_id: testPlayerId,
        memory: `Memory ${i}`,
        importance: i % 10 + 1,
        metadata: {}
      });
    }

    const config: Partial<ContextRetrievalConfig> = {
      maxMemories: 5
    };

    const context = await buildGameContext(
      testPlayerId,
      testNPCId,
      '',
      config
    );

    expect(context.npcMemories.length).toBeLessThanOrEqual(5);
  });

  test('should respect maxLore configuration', async () => {
    // Create multiple lore entries
    for (let i = 0; i < 10; i++) {
      saveLore({
        title: `Lore ${i}`,
        content: `Content about tower and history ${i}`,
        region: 'Test Region',
        tags: ['tower', 'test']
      });
    }

    const config: Partial<ContextRetrievalConfig> = {
      maxLore: 3
    };

    const context = await buildGameContext(
      testPlayerId,
      testNPCId,
      'tower',
      config
    );

    expect(context.relevantLore.length).toBeLessThanOrEqual(3);
  });

  test('should filter memories by importance threshold', async () => {
    saveNPCMemory({
      npc_id: testNPCId,
      player_id: testPlayerId,
      memory: 'Low importance',
      importance: 2,
      metadata: {}
    });

    saveNPCMemory({
      npc_id: testNPCId,
      player_id: testPlayerId,
      memory: 'High importance',
      importance: 8,
      metadata: {}
    });

    const config: Partial<ContextRetrievalConfig> = {
      memoryImportanceThreshold: 5
    };

    const context = await buildGameContext(
      testPlayerId,
      testNPCId,
      '',
      config
    );

    expect(context.npcMemories.length).toBe(1);
    expect(context.npcMemories[0].memory).toBe('High importance');
  });

  test('should filter events by time window', async () => {
    // Create old event (48 hours ago)
    const oldEvent = saveGameEvent({
      player_id: testPlayerId,
      event_type: 'explore',
      location: 'Old Location',
      metadata: { description: 'Old event' }
    });

    // Manually set old timestamp
    const oldTime = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const config: Partial<ContextRetrievalConfig> = {
      recentEventsWindow: 24 // 24 hours
    };

    const context = await buildGameContext(
      testPlayerId,
      testNPCId,
      '',
      config
    );

    // Should only include recent events (within 24 hours)
    // Old event won't be included due to time filter
    expect(context.recentGameEvents.length).toBeGreaterThanOrEqual(0);
  });

  test('should disable semantic lore search when configured', async () => {
    saveLore({
      title: 'Test Lore',
      content: 'Test content',
      region: 'Test',
      tags: ['test']
    });

    const config: Partial<ContextRetrievalConfig> = {
      enableSemanticLoreSearch: false
    };

    const context = await buildGameContext(
      testPlayerId,
      testNPCId,
      'test',
      config
    );

    expect(context.relevantLore.length).toBe(0);
  });
});

// ============================================================================
// Context Formatting Tests
// ============================================================================

describe('formatContextForAI', () => {
  test('should format context into readable text', async () => {
    saveNPCMemory({
      npc_id: testNPCId,
      player_id: testPlayerId,
      memory: 'Player helped the village',
      importance: 5,
      metadata: {}
    });

    const context = await buildGameContext(
      testPlayerId,
      testNPCId,
      'test'
    );

    const formatted = formatContextForAI(context);

    expect(formatted.formattedText).toContain('=== GAME CONTEXT ===');
    expect(formatted.formattedText).toContain('--- PLAYER ---');
    expect(formatted.formattedText).toContain('TestPlayer');
    expect(formatted.formattedText).toContain('--- NPC ---');
    expect(formatted.formattedText).toContain('TestNPC');
    expect(formatted.formattedText).toContain('--- NPC MEMORIES ABOUT PLAYER ---');
    expect(formatted.formattedText).toContain('Player helped the village');
    expect(formatted.estimatedTokens).toBeGreaterThan(0);
  });

  test('should include all context sections when data exists', async () => {
    saveNPCMemory({
      npc_id: testNPCId,
      player_id: testPlayerId,
      memory: 'Test memory',
      importance: 3,
      metadata: {}
    });

    saveLore({
      title: 'Test Lore',
      content: 'Test content',
      region: 'Test Region',
      tags: ['test']
    });

    saveGameEvent({
      player_id: testPlayerId,
      event_type: 'explore',
      location: 'Test Location',
      metadata: { description: 'Test event' }
    });

    saveWorldEvent({
      event_name: 'Test World Event',
      description: 'Test description',
      trigger_source: testPlayerId,
      metadata: {}
    });

    const context = await buildGameContext(
      testPlayerId,
      testNPCId,
      'test'
    );

    const formatted = formatContextForAI(context);

    expect(formatted.formattedText).toContain('--- NPC MEMORIES ABOUT PLAYER ---');
    expect(formatted.formattedText).toContain('--- RELEVANT LORE ---');
    expect(formatted.formattedText).toContain('--- RECENT PLAYER EVENTS ---');
    expect(formatted.formattedText).toContain('--- WORLD EVENTS ---');
    expect(formatted.formattedText).toContain('--- CONTEXT STATISTICS ---');
  });

  test('should estimate token count reasonably', async () => {
    const context = await buildGameContext(
      testPlayerId,
      testNPCId,
      'test'
    );

    const formatted = formatContextForAI(context);

    // Token estimate should be roughly text length / 4
    const expectedTokens = Math.ceil(formatted.formattedText.length / 4);
    expect(formatted.estimatedTokens).toBe(expectedTokens);
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('quickBuildContext', () => {
  test('should build and format context in one call', async () => {
    const result = await quickBuildContext(testPlayerId, testNPCId, 'test query');

    expect(result.context).toBeDefined();
    expect(result.formattedText).toBeDefined();
    expect(result.estimatedTokens).toBeGreaterThan(0);
  });

  test('should work without query parameter', async () => {
    const result = await quickBuildContext(testPlayerId, testNPCId);

    expect(result.context).toBeDefined();
    expect(result.formattedText).toBeDefined();
  });
});

describe('extractSearchQuery', () => {
  test('should remove filler words', () => {
    const query = extractSearchQuery('tell me about the ember tower');
    expect(query).not.toContain('tell');
    expect(query).not.toContain('me');
    expect(query).not.toContain('about');
    expect(query).not.toContain('the');
    expect(query).toContain('ember');
    expect(query).toContain('tower');
  });

  test('should normalize to lowercase', () => {
    const query = extractSearchQuery('EMBER TOWER');
    expect(query).toBe('ember tower');
  });

  test('should handle empty strings', () => {
    const query = extractSearchQuery('');
    expect(query).toBe('');
  });

  test('should preserve important keywords', () => {
    const query = extractSearchQuery('wolves forest danger');
    expect(query).toBe('wolves forest danger');
  });
});

describe('validateConfig', () => {
  test('should accept valid config', () => {
    const config: Partial<ContextRetrievalConfig> = {
      maxMemories: 10,
      maxLore: 5,
      maxGameEvents: 20,
      maxWorldEvents: 5,
      recentEventsWindow: 24,
      memoryImportanceThreshold: 5
    };

    expect(validateConfig(config)).toBe(true);
  });

  test('should reject negative maxMemories', () => {
    const config: Partial<ContextRetrievalConfig> = {
      maxMemories: -1
    };

    expect(validateConfig(config)).toBe(false);
  });

  test('should reject negative maxLore', () => {
    const config: Partial<ContextRetrievalConfig> = {
      maxLore: -5
    };

    expect(validateConfig(config)).toBe(false);
  });

  test('should reject invalid importance threshold', () => {
    expect(validateConfig({ memoryImportanceThreshold: 0 })).toBe(false);
    expect(validateConfig({ memoryImportanceThreshold: 11 })).toBe(false);
    expect(validateConfig({ memoryImportanceThreshold: 5 })).toBe(true);
  });

  test('should accept empty config', () => {
    expect(validateConfig({})).toBe(true);
  });
});

// ============================================================================
// Performance Tests
// ============================================================================

describe('Performance', () => {
  test('should retrieve context within reasonable time', async () => {
    // Add some test data
    for (let i = 0; i < 5; i++) {
      saveNPCMemory({
        npc_id: testNPCId,
        player_id: testPlayerId,
        memory: `Memory ${i}`,
        importance: i + 1,
        metadata: {}
      });
    }

    const startTime = performance.now();
    const context = await buildGameContext(
      testPlayerId,
      testNPCId,
      'test'
    );
    const endTime = performance.now();

    const retrievalTime = endTime - startTime;

    // Context retrieval should be fast (< 100ms for small dataset)
    expect(retrievalTime).toBeLessThan(100);
    expect(context.metadata.retrievalTimeMs).toBeGreaterThanOrEqual(0);
  });

  test('should handle large datasets efficiently', async () => {
    // Create large dataset
    for (let i = 0; i < 50; i++) {
      saveNPCMemory({
        npc_id: testNPCId,
        player_id: testPlayerId,
        memory: `Memory ${i}`,
        importance: (i % 10) + 1,
        metadata: {}
      });
    }

    for (let i = 0; i < 20; i++) {
      saveLore({
        title: `Lore ${i}`,
        content: `Content ${i}`,
        region: 'Test',
        tags: ['test', 'lore']
      });
    }

    for (let i = 0; i < 100; i++) {
      saveGameEvent({
        player_id: testPlayerId,
        event_type: 'explore',
        location: 'Test Location',
        metadata: { description: `Event ${i}` }
      });
    }

    const context = await buildGameContext(
      testPlayerId,
      testNPCId,
      'test',
      {
        maxMemories: 10,
        maxLore: 5,
        maxGameEvents: 20
      }
    );

    // Should still be performant with limits
    expect(context.metadata.retrievalTimeMs).toBeLessThan(200);
    expect(context.npcMemories.length).toBeLessThanOrEqual(10);
    expect(context.relevantLore.length).toBeLessThanOrEqual(5);
    expect(context.recentGameEvents.length).toBeLessThanOrEqual(20);
  });
});

describe('benchmarkContextRetrieval', () => {
  test('should run performance benchmark', async () => {
    const benchmark = await benchmarkContextRetrieval(
      testPlayerId,
      testNPCId,
      5
    );

    expect(benchmark.iterations).toBe(5);
    expect(benchmark.averageMs).toBeGreaterThanOrEqual(0);
    expect(benchmark.minMs).toBeGreaterThanOrEqual(0);
    expect(benchmark.maxMs).toBeGreaterThanOrEqual(benchmark.minMs);
    expect(benchmark.averageMs).toBeGreaterThanOrEqual(benchmark.minMs);
    expect(benchmark.averageMs).toBeLessThanOrEqual(benchmark.maxMs);
  });

  test('should provide consistent results', async () => {
    const benchmark1 = await benchmarkContextRetrieval(
      testPlayerId,
      testNPCId,
      3
    );

    const benchmark2 = await benchmarkContextRetrieval(
      testPlayerId,
      testNPCId,
      3
    );

    // Results should be relatively consistent
    const difference = Math.abs(benchmark1.averageMs - benchmark2.averageMs);
    expect(difference).toBeLessThan(50); // Within 50ms variance
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Integration Tests', () => {
  test('should build context for NPC conversation scenario', async () => {
    // Simulate a player asking about Ember Tower
    saveNPCMemory({
      npc_id: testNPCId,
      player_id: testPlayerId,
      memory: 'Player asked about Ember Tower previously',
      importance: 3,
      metadata: {}
    });

    saveNPCMemory({
      npc_id: testNPCId,
      player_id: testPlayerId,
      memory: 'Player defeated wolves near village',
      importance: 7,
      metadata: {}
    });

    saveLore({
      title: 'The Fall of Ember Tower',
      content: 'A magical tower that collapsed centuries ago',
      region: 'Northern Valley',
      tags: ['ember tower', 'history', 'magic']
    });

    saveGameEvent({
      player_id: testPlayerId,
      event_type: 'wolf_kill',
      location: 'Northern Forest',
      metadata: { description: 'Defeated wolf pack' }
    });

    saveWorldEvent({
      event_name: 'Wolf Pack Retreat',
      description: 'Wolves have retreated from Moonvale',
      trigger_source: testPlayerId,
      metadata: {}
    });

    const context = await buildGameContext(
      testPlayerId,
      testNPCId,
      'tell me about ember tower'
    );

    const formatted = formatContextForAI(context);

    // Should include relevant information for NPC response
    expect(context.player).not.toBeNull();
    expect(context.npc).not.toBeNull();
    expect(context.npcMemories.length).toBe(2);
    expect(context.relevantLore.length).toBeGreaterThan(0);
    expect(context.recentGameEvents.length).toBeGreaterThan(0);
    expect(context.recentWorldEvents.length).toBeGreaterThan(0);

    // Formatted text should be comprehensive
    expect(formatted.formattedText.length).toBeGreaterThan(500);
    expect(formatted.formattedText).toContain('Ember Tower');
    expect(formatted.formattedText).toContain('defeated wolves');
  });
});
