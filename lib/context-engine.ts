/**
 * Context Retrieval Engine for AI-Native Game World
 *
 * This engine gathers all relevant context data for AI consumption:
 * - Player stats and current state
 * - NPC memories about the player
 * - Lore entries (semantic search via keywords)
 * - World events that affect gameplay
 * - Recent gameplay events
 *
 * Optimized for performance with configurable limits and caching.
 * Designed to prepare context for future AI integration (AIKit).
 *
 * Refs: Epic 4 - Context Retrieval Engine
 * Issue: #8
 */

import {
  Player,
  NPC,
  NPCMemory,
  LoreEntry,
  GameEvent,
  WorldEvent
} from './types';

import {
  getPlayer,
  getNPC,
  getNPCMemories,
  searchLore as searchLoreData,
  getGameEvents,
  getWorldEvents
} from './data';

import { searchLore as searchLoreLib } from './lore';

// ============================================================================
// Configuration & Types
// ============================================================================

/**
 * Configuration options for context retrieval
 */
export interface ContextRetrievalConfig {
  /** Maximum number of memories to retrieve */
  maxMemories?: number;
  /** Maximum number of lore entries to retrieve */
  maxLore?: number;
  /** Maximum number of recent game events */
  maxGameEvents?: number;
  /** Maximum number of recent world events */
  maxWorldEvents?: number;
  /** Time window for recent events in hours (default: 24) */
  recentEventsWindow?: number;
  /** Enable semantic lore search (default: true) */
  enableSemanticLoreSearch?: boolean;
  /** Minimum importance threshold for memories (1-10) */
  memoryImportanceThreshold?: number;
}

/**
 * Default configuration for context retrieval
 */
const DEFAULT_CONFIG: Required<ContextRetrievalConfig> = {
  maxMemories: 10,
  maxLore: 5,
  maxGameEvents: 20,
  maxWorldEvents: 5,
  recentEventsWindow: 24,
  enableSemanticLoreSearch: true,
  memoryImportanceThreshold: 1
};

/**
 * Complete context package for AI consumption
 */
export interface GameContext {
  /** Current player information */
  player: Player | null;
  /** Target NPC information */
  npc: NPC | null;
  /** NPC memories about this player (sorted by importance) */
  npcMemories: NPCMemory[];
  /** Relevant lore entries (keyword/semantic matched) */
  relevantLore: LoreEntry[];
  /** Recent gameplay events for this player */
  recentGameEvents: GameEvent[];
  /** Recent world events affecting the game */
  recentWorldEvents: WorldEvent[];
  /** Context metadata */
  metadata: ContextMetadata;
}

/**
 * Metadata about context retrieval
 */
export interface ContextMetadata {
  /** When this context was generated */
  timestamp: string;
  /** Time taken to retrieve context (ms) */
  retrievalTimeMs: number;
  /** Configuration used for retrieval */
  config: Required<ContextRetrievalConfig>;
  /** Data source statistics */
  stats: {
    memoriesFound: number;
    loreEntriesFound: number;
    gameEventsFound: number;
    worldEventsFound: number;
  };
}

/**
 * Formatted context string for AI prompts
 */
export interface FormattedContext {
  /** Raw context data */
  context: GameContext;
  /** Formatted text ready for AI consumption */
  formattedText: string;
  /** Token count estimate (rough approximation) */
  estimatedTokens: number;
}

// ============================================================================
// Core Context Retrieval Functions
// ============================================================================

/**
 * Retrieve player context data
 */
async function retrievePlayerContext(playerId: string): Promise<Player | null> {
  return getPlayer(playerId);
}

/**
 * Retrieve NPC context data
 */
async function retrieveNPCContext(npcId: string): Promise<NPC | null> {
  return getNPC(npcId);
}

/**
 * Retrieve NPC memories about a player
 * Sorted by importance (descending) and recency
 */
async function retrieveNPCMemories(
  npcId: string,
  playerId: string,
  config: Required<ContextRetrievalConfig>
): Promise<NPCMemory[]> {
  const allMemories = getNPCMemories(npcId, playerId);

  // Filter by importance threshold
  const filteredMemories = allMemories.filter(
    m => m.importance >= config.memoryImportanceThreshold
  );

  // Already sorted by importance and date in data.ts
  // Take top N memories
  return filteredMemories.slice(0, config.maxMemories).map(m => ({
    id: m.id,
    npcId: m.npc_id,
    playerId: m.player_id,
    memory: m.memory,
    importance: m.importance,
    createdAt: m.created_at
  }));
}

/**
 * Retrieve relevant lore entries based on query or context
 * Uses semantic search (keyword-based for now, ready for vector search)
 */
async function retrieveRelevantLore(
  query: string,
  config: Required<ContextRetrievalConfig>
): Promise<LoreEntry[]> {
  if (!config.enableSemanticLoreSearch || !query.trim()) {
    return [];
  }

  // Use both data.ts and lore.ts search for comprehensive results
  const dataLore = searchLoreData(query);
  const libLore = searchLoreLib(query);

  // Combine and deduplicate by ID
  const loreMap = new Map<string, LoreEntry>();

  dataLore.forEach(lore => {
    loreMap.set(lore.id, {
      id: lore.id,
      title: lore.title,
      content: lore.content,
      tags: lore.tags
    });
  });

  libLore.forEach(lore => {
    if (!loreMap.has(lore.id)) {
      loreMap.set(lore.id, lore);
    }
  });

  const uniqueLore = Array.from(loreMap.values());

  // Return top N results
  return uniqueLore.slice(0, config.maxLore);
}

/**
 * Retrieve recent gameplay events for a player
 * Filters by time window
 */
async function retrieveRecentGameEvents(
  playerId: string,
  config: Required<ContextRetrievalConfig>
): Promise<GameEvent[]> {
  const allEvents = getGameEvents(playerId);

  // Calculate time threshold
  const now = new Date();
  const thresholdTime = new Date(
    now.getTime() - config.recentEventsWindow * 60 * 60 * 1000
  );

  // Filter by time window
  const recentEvents = allEvents.filter(event => {
    const eventTime = new Date(event.created_at);
    return eventTime >= thresholdTime;
  });

  // Take top N most recent events and convert to camelCase
  return recentEvents.slice(0, config.maxGameEvents).map(e => ({
    id: e.id,
    playerId: e.player_id,
    type: e.event_type,
    description: e.metadata?.description || e.event_type,
    timestamp: e.created_at
  }));
}

/**
 * Retrieve recent world events
 * Affects entire game world, not player-specific
 */
async function retrieveRecentWorldEvents(
  config: Required<ContextRetrievalConfig>
): Promise<WorldEvent[]> {
  const allWorldEvents = getWorldEvents();

  // Calculate time threshold
  const now = new Date();
  const thresholdTime = new Date(
    now.getTime() - config.recentEventsWindow * 60 * 60 * 1000
  );

  // Filter by time window
  const recentEvents = allWorldEvents.filter(event => {
    const eventTime = new Date(event.created_at);
    return eventTime >= thresholdTime;
  });

  // Return top N most recent
  return recentEvents.slice(0, config.maxWorldEvents).map(e => ({
    id: e.id,
    name: e.event_name,
    description: e.description,
    timestamp: e.created_at
  }));
}

// ============================================================================
// Main Context Building Function
// ============================================================================

/**
 * Build complete game context for AI consumption
 *
 * @param playerId - Player ID to build context for
 * @param npcId - NPC ID for NPC-specific context
 * @param query - Search query for lore retrieval (e.g., player message)
 * @param config - Configuration options for context retrieval
 * @returns Complete game context package
 *
 * @example
 * const context = await buildGameContext(
 *   'player-123',
 *   'npc-456',
 *   'tell me about ember tower',
 *   { maxMemories: 5, maxLore: 3 }
 * );
 */
export async function buildGameContext(
  playerId: string,
  npcId: string,
  query: string = '',
  config: Partial<ContextRetrievalConfig> = {}
): Promise<GameContext> {
  const startTime = performance.now();

  // Merge with default config
  const finalConfig: Required<ContextRetrievalConfig> = {
    ...DEFAULT_CONFIG,
    ...config
  };

  // Retrieve all context data in parallel for performance
  const [
    player,
    npc,
    npcMemories,
    relevantLore,
    recentGameEvents,
    recentWorldEvents
  ] = await Promise.all([
    retrievePlayerContext(playerId),
    retrieveNPCContext(npcId),
    retrieveNPCMemories(npcId, playerId, finalConfig),
    retrieveRelevantLore(query, finalConfig),
    retrieveRecentGameEvents(playerId, finalConfig),
    retrieveRecentWorldEvents(finalConfig)
  ]);

  const endTime = performance.now();
  const retrievalTimeMs = Math.round(endTime - startTime);

  return {
    player,
    npc,
    npcMemories,
    relevantLore,
    recentGameEvents,
    recentWorldEvents,
    metadata: {
      timestamp: new Date().toISOString(),
      retrievalTimeMs,
      config: finalConfig,
      stats: {
        memoriesFound: npcMemories.length,
        loreEntriesFound: relevantLore.length,
        gameEventsFound: recentGameEvents.length,
        worldEventsFound: recentWorldEvents.length
      }
    }
  };
}

// ============================================================================
// Context Formatting for AI Consumption
// ============================================================================

/**
 * Format game context into structured text for AI consumption
 * Optimized for LLM prompts with clear sections and relevant details
 *
 * @param context - Game context to format
 * @returns Formatted context with text and token estimate
 */
export function formatContextForAI(context: GameContext): FormattedContext {
  const sections: string[] = [];

  // Header
  sections.push('=== GAME CONTEXT ===');
  sections.push(`Retrieved: ${context.metadata.timestamp}`);
  sections.push('');

  // Player Section
  if (context.player) {
    sections.push('--- PLAYER ---');
    sections.push(`ID: ${context.player.id}`);
    sections.push(`Name: ${context.player.username}`);
    sections.push(`Class: ${context.player.class}`);
    sections.push(`Level: ${context.player.level} (${context.player.xp} XP)`);
    if ('faction' in context.player) {
      sections.push(`Faction: ${context.player.faction || 'None'}`);
    }
    if ('reputation' in context.player) {
      sections.push(`Reputation: ${context.player.reputation || 0}`);
    }
    sections.push('');
  }

  // NPC Section
  if (context.npc) {
    sections.push('--- NPC ---');
    sections.push(`ID: ${context.npc.id}`);
    sections.push(`Name: ${context.npc.name}`);
    sections.push(`Role: ${context.npc.role}`);
    sections.push(`Location: ${context.npc.location}`);
    sections.push('');
  }

  // NPC Memories Section
  if (context.npcMemories.length > 0) {
    sections.push('--- NPC MEMORIES ABOUT PLAYER ---');
    context.npcMemories.forEach((memory, idx) => {
      sections.push(
        `${idx + 1}. [Importance: ${memory.importance}] ${memory.memory} (${memory.createdAt})`
      );
    });
    sections.push('');
  }

  // Lore Section
  if (context.relevantLore.length > 0) {
    sections.push('--- RELEVANT LORE ---');
    context.relevantLore.forEach((lore, idx) => {
      sections.push(`${idx + 1}. ${lore.title}`);
      sections.push(`   ${lore.content}`);
      sections.push(`   Tags: ${lore.tags.join(', ')}`);
    });
    sections.push('');
  }

  // Recent Game Events Section
  if (context.recentGameEvents.length > 0) {
    sections.push('--- RECENT PLAYER EVENTS ---');
    context.recentGameEvents.forEach((event, idx) => {
      sections.push(
        `${idx + 1}. [${event.type}] ${event.description} (${event.timestamp})`
      );
    });
    sections.push('');
  }

  // World Events Section
  if (context.recentWorldEvents.length > 0) {
    sections.push('--- WORLD EVENTS ---');
    context.recentWorldEvents.forEach((event, idx) => {
      sections.push(
        `${idx + 1}. ${event.name}: ${event.description} (${event.timestamp})`
      );
    });
    sections.push('');
  }

  // Statistics Section
  sections.push('--- CONTEXT STATISTICS ---');
  sections.push(`Memories: ${context.metadata.stats.memoriesFound}`);
  sections.push(`Lore Entries: ${context.metadata.stats.loreEntriesFound}`);
  sections.push(`Game Events: ${context.metadata.stats.gameEventsFound}`);
  sections.push(`World Events: ${context.metadata.stats.worldEventsFound}`);
  sections.push(`Retrieval Time: ${context.metadata.retrievalTimeMs}ms`);
  sections.push('');

  const formattedText = sections.join('\n');

  // Rough token estimate (avg 4 chars per token)
  const estimatedTokens = Math.ceil(formattedText.length / 4);

  return {
    context,
    formattedText,
    estimatedTokens
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Quick context builder for simple use cases
 * Uses default configuration
 */
export async function quickBuildContext(
  playerId: string,
  npcId: string,
  query?: string
): Promise<FormattedContext> {
  const context = await buildGameContext(playerId, npcId, query || '');
  return formatContextForAI(context);
}

/**
 * Extract search query from player message
 * Helper for lore retrieval
 */
export function extractSearchQuery(playerMessage: string): string {
  // Remove common filler words and normalize
  const normalized = playerMessage.toLowerCase().trim();

  const fillerWords = [
    'tell', 'me', 'about', 'what', 'is', 'the', 'a', 'an',
    'can', 'you', 'please', 'help', 'explain', 'describe'
  ];

  const words = normalized.split(/\s+/);
  const filtered = words.filter(word => !fillerWords.includes(word));

  return filtered.join(' ');
}

/**
 * Validate context retrieval config
 */
export function validateConfig(config: Partial<ContextRetrievalConfig>): boolean {
  if (config.maxMemories !== undefined && config.maxMemories < 0) {
    return false;
  }
  if (config.maxLore !== undefined && config.maxLore < 0) {
    return false;
  }
  if (config.maxGameEvents !== undefined && config.maxGameEvents < 0) {
    return false;
  }
  if (config.maxWorldEvents !== undefined && config.maxWorldEvents < 0) {
    return false;
  }
  if (config.recentEventsWindow !== undefined && config.recentEventsWindow < 0) {
    return false;
  }
  if (
    config.memoryImportanceThreshold !== undefined &&
    (config.memoryImportanceThreshold < 1 || config.memoryImportanceThreshold > 10)
  ) {
    return false;
  }
  return true;
}

/**
 * Get performance benchmark for context retrieval
 */
export async function benchmarkContextRetrieval(
  playerId: string,
  npcId: string,
  iterations: number = 10
): Promise<{
  averageMs: number;
  minMs: number;
  maxMs: number;
  iterations: number;
}> {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const context = await buildGameContext(playerId, npcId, 'test query');
    times.push(context.metadata.retrievalTimeMs);
  }

  return {
    averageMs: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
    minMs: Math.min(...times),
    maxMs: Math.max(...times),
    iterations
  };
}
