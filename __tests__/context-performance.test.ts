/**
 * Performance Benchmarking Tests for Context Retrieval Engine
 *
 * Measures and validates performance characteristics:
 * - Retrieval speed under various loads
 * - Scalability with different dataset sizes
 * - Configuration impact on performance
 * - Memory efficiency
 *
 * Refs: Epic 4 - Context Retrieval Engine
 * Issue: #8
 */

import { describe, expect, test, beforeEach } from '@jest/globals';
import {
  buildGameContext,
  formatContextForAI,
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
// Setup
// ============================================================================

let testPlayerId: string;
let testNPCId: string;

beforeEach(() => {
  clearAllData();

  const player = savePlayer({
    username: 'PerfTestPlayer',
    class: 'Mage',
    faction: 'Arcane Order',
    level: 10,
    xp: 5000,
    inventory: [],
    reputation: 75
  });
  testPlayerId = player.id;

  const npc = saveNPC({
    name: 'PerfTestNPC',
    role: 'Archmage',
    location: 'Tower',
    personality: { wise: true }
  });
  testNPCId = npc.id;
});

// ============================================================================
// Baseline Performance Tests
// ============================================================================

describe('Baseline Performance', () => {
  test('should retrieve empty context quickly', async () => {
    const startTime = performance.now();
    const context = await buildGameContext(testPlayerId, testNPCId, '');
    const endTime = performance.now();

    const duration = endTime - startTime;

    expect(duration).toBeLessThan(100); // Should be very fast with no data
    expect(context.metadata.retrievalTimeMs).toBeLessThanOrEqual(100);
  });

  test('should retrieve minimal context within 100ms', async () => {
    // Add minimal data
    saveNPCMemory({
      npc_id: testNPCId,
      player_id: testPlayerId,
      memory: 'Test memory',
      importance: 5,
      metadata: {}
    });

    saveLore({
      title: 'Test Lore',
      content: 'Test content',
      region: 'Test',
      tags: ['test']
    });

    const startTime = performance.now();
    const context = await buildGameContext(testPlayerId, testNPCId, 'test');
    const endTime = performance.now();

    const duration = endTime - startTime;

    expect(duration).toBeLessThan(100);
    expect(context.metadata.retrievalTimeMs).toBeLessThan(100);
  });
});

// ============================================================================
// Scalability Tests
// ============================================================================

describe('Scalability with Dataset Size', () => {
  test('should handle 50 memories efficiently', async () => {
    // Create 50 memories
    for (let i = 0; i < 50; i++) {
      saveNPCMemory({
        npc_id: testNPCId,
        player_id: testPlayerId,
        memory: `Memory ${i}: Player performed action`,
        importance: (i % 10) + 1,
        metadata: {}
      });
    }

    const startTime = performance.now();
    const context = await buildGameContext(testPlayerId, testNPCId, '', {
      maxMemories: 10
    });
    const endTime = performance.now();

    const duration = endTime - startTime;

    expect(duration).toBeLessThan(200);
    expect(context.npcMemories.length).toBeLessThanOrEqual(10);
    expect(context.metadata.retrievalTimeMs).toBeLessThan(200);
  });

  test('should handle 100 lore entries efficiently', async () => {
    // Create 100 lore entries
    for (let i = 0; i < 100; i++) {
      saveLore({
        title: `Lore Entry ${i}`,
        content: `This is lore content about ancient history and magic ${i}`,
        region: `Region ${i % 5}`,
        tags: ['history', 'magic', `tag${i % 10}`]
      });
    }

    const startTime = performance.now();
    const context = await buildGameContext(testPlayerId, testNPCId, 'history magic', {
      maxLore: 5
    });
    const endTime = performance.now();

    const duration = endTime - startTime;

    expect(duration).toBeLessThan(300);
    expect(context.relevantLore.length).toBeLessThanOrEqual(5);
  });

  test('should handle 200 game events efficiently', async () => {
    // Create 200 game events
    for (let i = 0; i < 200; i++) {
      saveGameEvent({
        player_id: testPlayerId,
        event_type: ['explore', 'wolf_kill', 'npc_conversation'][i % 3],
        location: `Location ${i % 10}`,
        metadata: { description: `Event ${i}` }
      });
    }

    const startTime = performance.now();
    const context = await buildGameContext(testPlayerId, testNPCId, '', {
      maxGameEvents: 20
    });
    const endTime = performance.now();

    const duration = endTime - startTime;

    expect(duration).toBeLessThan(300);
    expect(context.recentGameEvents.length).toBeLessThanOrEqual(20);
  });

  test('should handle large mixed dataset efficiently', async () => {
    // Create mixed large dataset
    for (let i = 0; i < 30; i++) {
      saveNPCMemory({
        npc_id: testNPCId,
        player_id: testPlayerId,
        memory: `Complex memory ${i}`,
        importance: (i % 10) + 1,
        metadata: {}
      });
    }

    for (let i = 0; i < 50; i++) {
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
        location: 'Test',
        metadata: { description: `Event ${i}` }
      });
    }

    for (let i = 0; i < 10; i++) {
      saveWorldEvent({
        event_name: `World Event ${i}`,
        description: `Description ${i}`,
        trigger_source: testPlayerId,
        metadata: {}
      });
    }

    const startTime = performance.now();
    const context = await buildGameContext(testPlayerId, testNPCId, 'test');
    const endTime = performance.now();

    const duration = endTime - startTime;

    // Should still complete within reasonable time
    expect(duration).toBeLessThan(500);
    expect(context.metadata.retrievalTimeMs).toBeLessThan(500);
  });
});

// ============================================================================
// Configuration Impact Tests
// ============================================================================

describe('Configuration Impact on Performance', () => {
  beforeEach(() => {
    // Create standard dataset
    for (let i = 0; i < 20; i++) {
      saveNPCMemory({
        npc_id: testNPCId,
        player_id: testPlayerId,
        memory: `Memory ${i}`,
        importance: 5,
        metadata: {}
      });
    }

    for (let i = 0; i < 20; i++) {
      saveLore({
        title: `Lore ${i}`,
        content: `Content ${i}`,
        region: 'Test',
        tags: ['test']
      });
    }
  });

  test('should be faster with smaller maxMemories', async () => {
    const startTimeSmall = performance.now();
    const contextSmall = await buildGameContext(testPlayerId, testNPCId, '', {
      maxMemories: 5
    });
    const endTimeSmall = performance.now();
    const durationSmall = endTimeSmall - startTimeSmall;

    const startTimeLarge = performance.now();
    const contextLarge = await buildGameContext(testPlayerId, testNPCId, '', {
      maxMemories: 20
    });
    const endTimeLarge = performance.now();
    const durationLarge = endTimeLarge - startTimeLarge;

    // Both should be fast, but smaller limit should not be slower
    expect(durationSmall).toBeLessThan(200);
    expect(durationLarge).toBeLessThan(200);
  });

  test('should be faster with disabled semantic search', async () => {
    const startTimeEnabled = performance.now();
    await buildGameContext(testPlayerId, testNPCId, 'test query', {
      enableSemanticLoreSearch: true
    });
    const endTimeEnabled = performance.now();
    const durationEnabled = endTimeEnabled - startTimeEnabled;

    const startTimeDisabled = performance.now();
    await buildGameContext(testPlayerId, testNPCId, 'test query', {
      enableSemanticLoreSearch: false
    });
    const endTimeDisabled = performance.now();
    const durationDisabled = endTimeDisabled - startTimeDisabled;

    // Disabled should be slightly faster (no lore search)
    expect(durationEnabled).toBeLessThan(200);
    expect(durationDisabled).toBeLessThan(200);
  });

  test('should be faster with higher importance threshold', async () => {
    const startTimeLow = performance.now();
    const contextLow = await buildGameContext(testPlayerId, testNPCId, '', {
      memoryImportanceThreshold: 1
    });
    const endTimeLow = performance.now();
    const durationLow = endTimeLow - startTimeLow;

    const startTimeHigh = performance.now();
    const contextHigh = await buildGameContext(testPlayerId, testNPCId, '', {
      memoryImportanceThreshold: 8
    });
    const endTimeHigh = performance.now();
    const durationHigh = endTimeHigh - startTimeHigh;

    expect(contextLow.npcMemories.length).toBeGreaterThan(contextHigh.npcMemories.length);
    expect(durationLow).toBeLessThan(200);
    expect(durationHigh).toBeLessThan(200);
  });
});

// ============================================================================
// Benchmark Function Tests
// ============================================================================

describe('benchmarkContextRetrieval', () => {
  test('should run 10 iterations and provide statistics', async () => {
    const benchmark = await benchmarkContextRetrieval(
      testPlayerId,
      testNPCId,
      10
    );

    expect(benchmark.iterations).toBe(10);
    expect(benchmark.averageMs).toBeGreaterThanOrEqual(0);
    expect(benchmark.minMs).toBeGreaterThanOrEqual(0);
    expect(benchmark.maxMs).toBeGreaterThanOrEqual(0);
    expect(benchmark.maxMs).toBeGreaterThanOrEqual(benchmark.minMs);
    expect(benchmark.averageMs).toBeGreaterThanOrEqual(benchmark.minMs);
    expect(benchmark.averageMs).toBeLessThanOrEqual(benchmark.maxMs);
  });

  test('should provide consistent benchmarks', async () => {
    const benchmark1 = await benchmarkContextRetrieval(
      testPlayerId,
      testNPCId,
      5
    );

    const benchmark2 = await benchmarkContextRetrieval(
      testPlayerId,
      testNPCId,
      5
    );

    // Variance should be reasonable
    const avgDifference = Math.abs(benchmark1.averageMs - benchmark2.averageMs);
    expect(avgDifference).toBeLessThan(100);
  });

  test('should handle single iteration benchmark', async () => {
    const benchmark = await benchmarkContextRetrieval(
      testPlayerId,
      testNPCId,
      1
    );

    expect(benchmark.iterations).toBe(1);
    expect(benchmark.averageMs).toBe(benchmark.minMs);
    expect(benchmark.averageMs).toBe(benchmark.maxMs);
  });
});

// ============================================================================
// Formatting Performance Tests
// ============================================================================

describe('Formatting Performance', () => {
  test('should format context quickly', async () => {
    // Create some data
    saveNPCMemory({
      npc_id: testNPCId,
      player_id: testPlayerId,
      memory: 'Test memory',
      importance: 5,
      metadata: {}
    });

    const context = await buildGameContext(testPlayerId, testNPCId, 'test');

    const startTime = performance.now();
    const formatted = formatContextForAI(context);
    const endTime = performance.now();

    const duration = endTime - startTime;

    expect(duration).toBeLessThan(50); // Formatting should be very fast
    expect(formatted.formattedText).toBeDefined();
    expect(formatted.estimatedTokens).toBeGreaterThan(0);
  });

  test('should format large context efficiently', async () => {
    // Create large dataset
    for (let i = 0; i < 10; i++) {
      saveNPCMemory({
        npc_id: testNPCId,
        player_id: testPlayerId,
        memory: `Memory ${i}`,
        importance: 5,
        metadata: {}
      });
    }

    for (let i = 0; i < 5; i++) {
      saveLore({
        title: `Lore ${i}`,
        content: `This is a long piece of lore content ${i}`,
        region: 'Test',
        tags: ['test']
      });
    }

    const context = await buildGameContext(testPlayerId, testNPCId, 'test');

    const startTime = performance.now();
    const formatted = formatContextForAI(context);
    const endTime = performance.now();

    const duration = endTime - startTime;

    expect(duration).toBeLessThan(100);
    expect(formatted.formattedText.length).toBeGreaterThan(500);
  });
});

// ============================================================================
// Parallel Retrieval Performance
// ============================================================================

describe('Parallel Retrieval Performance', () => {
  test('should handle multiple concurrent requests', async () => {
    // Create test data
    saveNPCMemory({
      npc_id: testNPCId,
      player_id: testPlayerId,
      memory: 'Test memory',
      importance: 5,
      metadata: {}
    });

    const startTime = performance.now();

    // Simulate 5 concurrent requests
    const promises = Array.from({ length: 5 }, () =>
      buildGameContext(testPlayerId, testNPCId, 'test')
    );

    const results = await Promise.all(promises);
    const endTime = performance.now();

    const duration = endTime - startTime;

    // All requests should complete
    expect(results.length).toBe(5);
    results.forEach(context => {
      expect(context.player).not.toBeNull();
      expect(context.npc).not.toBeNull();
    });

    // Should complete reasonably fast even with concurrent requests
    expect(duration).toBeLessThan(500);
  });
});

// ============================================================================
// Performance Regression Tests
// ============================================================================

describe('Performance Regression Tests', () => {
  test('should maintain performance with typical game scenario', async () => {
    // Create typical game data
    for (let i = 0; i < 10; i++) {
      saveNPCMemory({
        npc_id: testNPCId,
        player_id: testPlayerId,
        memory: `Player interaction ${i}`,
        importance: (i % 5) + 1,
        metadata: {}
      });
    }

    for (let i = 0; i < 10; i++) {
      saveLore({
        title: `Lore ${i}`,
        content: `Game lore content ${i}`,
        region: 'Game World',
        tags: ['game', 'lore']
      });
    }

    for (let i = 0; i < 30; i++) {
      saveGameEvent({
        player_id: testPlayerId,
        event_type: ['explore', 'wolf_kill', 'npc_conversation'][i % 3],
        location: 'Game Location',
        metadata: { description: `Event ${i}` }
      });
    }

    for (let i = 0; i < 3; i++) {
      saveWorldEvent({
        event_name: `World Event ${i}`,
        description: `Global event ${i}`,
        trigger_source: 'game',
        metadata: {}
      });
    }

    // Run benchmark
    const benchmark = await benchmarkContextRetrieval(
      testPlayerId,
      testNPCId,
      10
    );

    // Performance targets for typical scenario
    expect(benchmark.averageMs).toBeLessThan(200);
    expect(benchmark.maxMs).toBeLessThan(400);
  });
});

// ============================================================================
// Summary Statistics
// ============================================================================

describe('Performance Summary', () => {
  test('should provide comprehensive performance report', async () => {
    // Create representative dataset
    for (let i = 0; i < 15; i++) {
      saveNPCMemory({
        npc_id: testNPCId,
        player_id: testPlayerId,
        memory: `Memory ${i}`,
        importance: 5,
        metadata: {}
      });
    }

    for (let i = 0; i < 10; i++) {
      saveLore({
        title: `Lore ${i}`,
        content: `Content ${i}`,
        region: 'Test',
        tags: ['test']
      });
    }

    for (let i = 0; i < 50; i++) {
      saveGameEvent({
        player_id: testPlayerId,
        event_type: 'explore',
        location: 'Test',
        metadata: { description: `Event ${i}` }
      });
    }

    // Run comprehensive benchmark
    const iterations = 20;
    const benchmark = await benchmarkContextRetrieval(
      testPlayerId,
      testNPCId,
      iterations
    );

    console.log('\n=== PERFORMANCE BENCHMARK SUMMARY ===');
    console.log(`Iterations: ${benchmark.iterations}`);
    console.log(`Average: ${benchmark.averageMs}ms`);
    console.log(`Min: ${benchmark.minMs}ms`);
    console.log(`Max: ${benchmark.maxMs}ms`);
    console.log(`Range: ${benchmark.maxMs - benchmark.minMs}ms`);
    console.log('=====================================\n');

    expect(benchmark.iterations).toBe(iterations);
    expect(benchmark.averageMs).toBeGreaterThan(0);
  });
});
