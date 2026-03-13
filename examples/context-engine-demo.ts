/**
 * Context Engine Demo
 *
 * This example demonstrates how to use the Context Retrieval Engine
 * to build comprehensive game context for AI consumption.
 *
 * Run with: npx ts-node examples/context-engine-demo.ts
 */

import {
  buildGameContext,
  formatContextForAI,
  quickBuildContext,
  benchmarkContextRetrieval,
  extractSearchQuery
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

async function runDemo() {
  console.log('\n=== Context Engine Demo ===\n');

  // Clean slate
  clearAllData();

  // 1. Setup: Create test data
  console.log('1. Creating test data...');

  const player = savePlayer({
    username: 'BraveAdventurer',
    class: 'Ranger',
    faction: 'Forest Guild',
    level: 7,
    xp: 3500,
    inventory: [],
    reputation: 65
  });

  const npc = saveNPC({
    name: 'Elarin',
    role: 'Village Historian',
    location: 'Moonvale',
    personality: { wise: true, friendly: true }
  });

  // Create NPC memories
  saveNPCMemory({
    npc_id: npc.id,
    player_id: player.id,
    memory: 'Player saved the village from wolf attacks',
    importance: 9,
    metadata: {}
  });

  saveNPCMemory({
    npc_id: npc.id,
    player_id: player.id,
    memory: 'Player asked about the ancient Ember Tower',
    importance: 6,
    metadata: {}
  });

  saveNPCMemory({
    npc_id: npc.id,
    player_id: player.id,
    memory: 'Player showed interest in village history',
    importance: 4,
    metadata: {}
  });

  // Create lore entries
  saveLore({
    title: 'The Fall of Ember Tower',
    content: 'The Ember Tower was once a beacon of magical knowledge, but it collapsed during a catastrophic experiment over a century ago. Its ruins still glow with residual arcane energy.',
    region: 'Northern Valley',
    tags: ['ember tower', 'magic', 'history', 'ruins']
  });

  saveLore({
    title: 'Founding of Moonvale',
    content: 'Moonvale was established by the Forest Guild as a refuge for scholars and guardians of nature. The village maintains ancient traditions of harmony with the forest.',
    region: 'Moonvale',
    tags: ['moonvale', 'founding', 'forest guild', 'history']
  });

  saveLore({
    title: 'The Northern Wolf Packs',
    content: 'Wolf packs have roamed the northern forests for generations. While usually avoiding human settlements, they become aggressive when food is scarce or their territory is threatened.',
    region: 'Northern Forest',
    tags: ['wolves', 'danger', 'forest', 'wildlife']
  });

  // Create game events
  saveGameEvent({
    player_id: player.id,
    event_type: 'wolf_kill',
    location: 'Northern Forest',
    metadata: { description: 'Defeated alpha wolf defending village' }
  });

  saveGameEvent({
    player_id: player.id,
    event_type: 'wolf_kill',
    location: 'Northern Forest',
    metadata: { description: 'Defeated second wolf' }
  });

  saveGameEvent({
    player_id: player.id,
    event_type: 'wolf_kill',
    location: 'Northern Forest',
    metadata: { description: 'Defeated third wolf, pack retreated' }
  });

  saveGameEvent({
    player_id: player.id,
    event_type: 'npc_conversation',
    location: 'Moonvale',
    metadata: { description: 'Spoke with Elarin about village history' }
  });

  // Create world event
  saveWorldEvent({
    event_name: 'Wolf Pack Retreat',
    description: 'The northern wolf pack has mysteriously retreated from the area around Moonvale.',
    trigger_source: player.id,
    metadata: { wolf_kill_count: 3 }
  });

  console.log('✅ Test data created\n');

  // 2. Basic Context Retrieval
  console.log('2. Building basic context...');
  const context = await buildGameContext(
    player.id,
    npc.id,
    'tell me about the ember tower'
  );

  console.log(`✅ Context built in ${context.metadata.retrievalTimeMs}ms`);
  console.log(`   - Memories: ${context.metadata.stats.memoriesFound}`);
  console.log(`   - Lore: ${context.metadata.stats.loreEntriesFound}`);
  console.log(`   - Game Events: ${context.metadata.stats.gameEventsFound}`);
  console.log(`   - World Events: ${context.metadata.stats.worldEventsFound}\n`);

  // 3. Formatted Context for AI
  console.log('3. Formatting context for AI...');
  const formatted = formatContextForAI(context);

  console.log(`✅ Formatted text (${formatted.estimatedTokens} tokens)\n`);
  console.log('--- FORMATTED OUTPUT ---');
  console.log(formatted.formattedText);
  console.log('--- END OUTPUT ---\n');

  // 4. Quick Build (one-call convenience)
  console.log('4. Quick build with default config...');
  const quick = await quickBuildContext(player.id, npc.id, 'wolves');
  console.log(`✅ Quick build complete (${quick.estimatedTokens} tokens)\n`);

  // 5. Custom Configuration
  console.log('5. Custom configuration (high importance only)...');
  const customContext = await buildGameContext(
    player.id,
    npc.id,
    'village history',
    {
      maxMemories: 3,
      maxLore: 2,
      memoryImportanceThreshold: 6, // Only important memories
      recentEventsWindow: 12
    }
  );

  console.log(`✅ Custom context built`);
  console.log(`   - Memories (importance >= 6): ${customContext.metadata.stats.memoriesFound}`);
  console.log(`   - Lore (max 2): ${customContext.metadata.stats.loreEntriesFound}\n`);

  // 6. Search Query Extraction
  console.log('6. Search query extraction...');
  const rawQuery = 'can you please tell me about the ancient ember tower';
  const cleanQuery = extractSearchQuery(rawQuery);
  console.log(`   Raw: "${rawQuery}"`);
  console.log(`   Clean: "${cleanQuery}"\n`);

  // 7. Performance Benchmark
  console.log('7. Running performance benchmark (10 iterations)...');
  const benchmark = await benchmarkContextRetrieval(player.id, npc.id, 10);
  console.log(`✅ Benchmark complete`);
  console.log(`   - Average: ${benchmark.averageMs}ms`);
  console.log(`   - Min: ${benchmark.minMs}ms`);
  console.log(`   - Max: ${benchmark.maxMs}ms\n`);

  // 8. Simulate AI Integration
  console.log('8. Simulating AI integration...');
  const playerMessage = 'What can you tell me about the Ember Tower?';
  const aiContext = await quickBuildContext(player.id, npc.id, playerMessage);

  console.log('--- PROMPT FOR LLM ---');
  console.log(`System: You are ${aiContext.context.npc?.name}, a ${aiContext.context.npc?.role} in ${aiContext.context.npc?.location}.\n`);
  console.log('Context:');
  console.log(aiContext.formattedText);
  console.log(`\nPlayer: "${playerMessage}"\n`);
  console.log('Assistant: [LLM would respond here based on context]');
  console.log('--- END PROMPT ---\n');

  // 9. Summary
  console.log('=== Demo Complete ===\n');
  console.log('Key Takeaways:');
  console.log('✅ Context retrieval is fast (< 50ms typical)');
  console.log('✅ Comprehensive data from 5 sources');
  console.log('✅ Configurable filtering and limits');
  console.log('✅ AI-ready formatted output');
  console.log('✅ Performance monitoring built-in');
  console.log('✅ Easy integration with LLMs\n');

  console.log('Next Steps:');
  console.log('1. Integrate with AIKit (Epic 5)');
  console.log('2. Use context for dynamic NPC dialogue');
  console.log('3. Generate context-aware narratives');
  console.log('4. Build adaptive gameplay systems\n');
}

// Run the demo
runDemo().catch(error => {
  console.error('Demo error:', error);
  process.exit(1);
});
