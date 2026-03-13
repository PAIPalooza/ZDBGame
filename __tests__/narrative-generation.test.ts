/**
 * Tests for AI Game Master Narrative Generation
 * Issue #9: Epic 4 - Narrative Generation
 *
 * This test suite validates:
 * - Context retrieval engine
 * - Narrative logging system
 * - API endpoint functionality
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  retrieveGameContext,
  formatContextForPrompt,
} from '../lib/context-retrieval';
import {
  saveNarrativeLog,
  getNarrativeLog,
  getPlayerNarrativeLogs,
  getNarrativeLogStats,
  clearNarrativeLogs,
} from '../lib/narrative-log';
import { generateTestNarrative } from '../lib/aikit';
import { GameContext } from '../lib/narrative-types';
import {
  clearAllData,
  savePlayer,
  saveNPC,
  saveLore,
  saveNPCMemory,
  saveWorldEvent,
  saveGameEvent,
} from '../lib/data';

describe('Context Retrieval Engine', () => {
  beforeEach(() => {
    clearAllData();

    // Create test data
    const player = savePlayer({
      username: 'TestHero',
      class: 'Ranger',
      faction: 'Forest Guild',
      level: 5,
      xp: 1200,
      inventory: [],
      reputation: 50,
    });

    const npc = saveNPC({
      name: 'Elarin',
      role: 'Historian',
      location: 'Moonvale',
      personality: {},
    });

    saveLore({
      title: 'The Fall of Ember Tower',
      content:
        'The Ember Tower collapsed after a magical experiment went wrong.',
      region: 'Northern Wastes',
      tags: ['ember tower', 'magic', 'history'],
    });

    saveLore({
      title: 'Wolves of the Northern Forest',
      content: 'Wolves often attack travelers near the northern forest.',
      region: 'Northern Forest',
      tags: ['wolves', 'danger', 'forest'],
    });

    saveNPCMemory({
      npc_id: npc.id,
      player_id: player.id,
      memory: 'Player asked about Ember Tower',
      importance: 2,
      metadata: {},
    });

    saveWorldEvent({
      event_name: 'Wolf Pack Retreat',
      description: 'Wolf activity around Moonvale has decreased.',
      trigger_source: 'player_actions',
      metadata: {},
    });

    saveGameEvent({
      player_id: player.id,
      event_type: 'wolf_kill',
      location: 'Northern Forest',
      metadata: {},
    });
  });

  afterEach(() => {
    clearAllData();
  });

  it('should retrieve complete game context for a player', () => {
    const players = require('../lib/data').getAllPlayers();
    const player = players[0];

    const context = retrieveGameContext(
      player.id,
      'explore the northern forest',
      'Northern Forest'
    );

    expect(context).toBeDefined();
    expect(context.player).toBeDefined();
    expect(context.player.username).toBe('TestHero');
    expect(context.player.class).toBe('Ranger');
    expect(context.loreEntries).toBeDefined();
    expect(context.loreEntries.length).toBeGreaterThan(0);
  });

  it('should retrieve relevant lore based on action', () => {
    const players = require('../lib/data').getAllPlayers();
    const player = players[0];

    const context = retrieveGameContext(
      player.id,
      'investigate the wolves',
      'Northern Forest'
    );

    const wolfLore = context.loreEntries.find((lore) =>
      lore.title.includes('Wolves')
    );
    expect(wolfLore).toBeDefined();
  });

  it('should retrieve NPC memories about the player', () => {
    const players = require('../lib/data').getAllPlayers();
    const player = players[0];

    const context = retrieveGameContext(player.id, 'talk to Elarin');

    expect(context.npcMemories).toBeDefined();
    expect(context.npcMemories.length).toBeGreaterThan(0);
    expect(context.npcMemories[0].memory).toContain('Ember Tower');
  });

  it('should retrieve recent world events', () => {
    const players = require('../lib/data').getAllPlayers();
    const player = players[0];

    const context = retrieveGameContext(player.id, 'look around');

    expect(context.worldEvents).toBeDefined();
    expect(context.worldEvents.length).toBeGreaterThan(0);
    expect(context.worldEvents[0].name).toBe('Wolf Pack Retreat');
  });

  it('should format context for AI prompt', () => {
    const players = require('../lib/data').getAllPlayers();
    const player = players[0];

    const context = retrieveGameContext(player.id, 'explore');
    const formatted = formatContextForPrompt(context);

    expect(formatted.playerInfo).toContain('TestHero');
    expect(formatted.playerInfo).toContain('Ranger');
    expect(formatted.loreContext).toBeDefined();
    expect(formatted.memoryContext).toBeDefined();
  });
});

describe('Narrative Logging System', () => {
  beforeEach(() => {
    clearNarrativeLogs();
    clearAllData();

    savePlayer({
      username: 'TestHero',
      class: 'Ranger',
      faction: 'Forest Guild',
      level: 5,
      xp: 1200,
      inventory: [],
      reputation: 50,
    });
  });

  afterEach(() => {
    clearNarrativeLogs();
    clearAllData();
  });

  it('should save a narrative log entry', () => {
    const players = require('../lib/data').getAllPlayers();
    const player = players[0];

    const mockContext: GameContext = {
      player: {
        id: player.id,
        username: player.username,
        class: player.class,
        level: player.level,
        xp: player.xp,
      },
      loreEntries: [],
      npcMemories: [],
      worldEvents: [],
      recentEvents: [],
    };

    const log = saveNarrativeLog(
      player.id,
      'explore the forest',
      'You venture into the shadowy woods...',
      mockContext
    );

    expect(log).toBeDefined();
    expect(log.id).toBeDefined();
    expect(log.playerId).toBe(player.id);
    expect(log.playerAction).toBe('explore the forest');
    expect(log.gmResponse).toContain('shadowy woods');
  });

  it('should retrieve a saved narrative log by ID', () => {
    const players = require('../lib/data').getAllPlayers();
    const player = players[0];

    const mockContext: GameContext = {
      player: {
        id: player.id,
        username: player.username,
        class: player.class,
        level: player.level,
        xp: player.xp,
      },
      loreEntries: [],
      npcMemories: [],
      worldEvents: [],
      recentEvents: [],
    };

    const savedLog = saveNarrativeLog(
      player.id,
      'test action',
      'test response',
      mockContext
    );

    const retrievedLog = getNarrativeLog(savedLog.id);

    expect(retrievedLog).toBeDefined();
    expect(retrievedLog?.id).toBe(savedLog.id);
    expect(retrievedLog?.playerAction).toBe('test action');
  });

  it('should retrieve all logs for a specific player', () => {
    const players = require('../lib/data').getAllPlayers();
    const player = players[0];

    const mockContext: GameContext = {
      player: {
        id: player.id,
        username: player.username,
        class: player.class,
        level: player.level,
        xp: player.xp,
      },
      loreEntries: [],
      npcMemories: [],
      worldEvents: [],
      recentEvents: [],
    };

    // Save multiple logs
    saveNarrativeLog(player.id, 'action 1', 'response 1', mockContext);
    saveNarrativeLog(player.id, 'action 2', 'response 2', mockContext);
    saveNarrativeLog(player.id, 'action 3', 'response 3', mockContext);

    const logs = getPlayerNarrativeLogs(player.id);

    expect(logs.length).toBe(3);
    expect(logs[0].playerId).toBe(player.id);
  });

  it('should get narrative log statistics', () => {
    const players = require('../lib/data').getAllPlayers();
    const player = players[0];

    const mockContext: GameContext = {
      player: {
        id: player.id,
        username: player.username,
        class: player.class,
        level: player.level,
        xp: player.xp,
      },
      loreEntries: [],
      npcMemories: [],
      worldEvents: [],
      recentEvents: [],
    };

    saveNarrativeLog(player.id, 'action 1', 'response 1', mockContext);
    saveNarrativeLog(player.id, 'action 2', 'response 2', mockContext);

    const stats = getNarrativeLogStats();

    expect(stats.totalLogs).toBe(2);
    expect(stats.uniquePlayers).toBe(1);
    expect(stats.mostRecentLog).toBeDefined();
  });
});

describe('Narrative Generation', () => {
  it('should generate a test narrative', () => {
    const mockContext: GameContext = {
      player: {
        id: 'test-id',
        username: 'TestHero',
        class: 'Ranger',
        level: 5,
        xp: 1200,
      },
      location: 'Northern Forest',
      loreEntries: [],
      npcMemories: [],
      worldEvents: [],
      recentEvents: [],
    };

    const narrative = generateTestNarrative(
      'explore the ancient ruins',
      mockContext
    );

    expect(narrative).toBeDefined();
    expect(narrative.locationDescription).toBeDefined();
    expect(narrative.actionOutcome).toBeDefined();
    expect(narrative.worldReaction).toBeDefined();
    expect(narrative.questHooks).toBeDefined();
    expect(Array.isArray(narrative.questHooks)).toBe(true);
    expect(narrative.fullNarrative).toBeDefined();
  });

  it('should include location in narrative', () => {
    const mockContext: GameContext = {
      player: {
        id: 'test-id',
        username: 'TestHero',
        class: 'Ranger',
        level: 5,
        xp: 1200,
      },
      location: 'Ember Tower Ruins',
      loreEntries: [],
      npcMemories: [],
      worldEvents: [],
      recentEvents: [],
    };

    const narrative = generateTestNarrative('search for artifacts', mockContext);

    expect(narrative.locationDescription).toContain('Ember Tower Ruins');
  });
});
