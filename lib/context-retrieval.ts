/**
 * Context Retrieval Engine for AI Game Master
 * Feature 4.1: Context Retrieval Engine
 *
 * This module retrieves all relevant context for AI narrative generation:
 * - Player data
 * - NPC memories
 * - Lore entries
 * - World events
 * - Recent gameplay events
 *
 * References:
 * - Issue: #9
 * - Epic: 4
 * - Backlog: Feature 4.1
 */

import { GameContext } from './narrative-types';
import { Player, LoreEntry, NPCMemory, WorldEvent, GameEvent } from './types';
import {
  getPlayer,
  getAllLore,
  searchLore,
  getAllNPCMemories,
  getWorldEvents,
  getGameEvents,
} from './data';

/**
 * Retrieve all relevant game context for a player action
 * This is the main function for the context retrieval engine
 *
 * @param playerId - The player performing the action
 * @param action - The action being performed
 * @param location - Optional location context
 * @returns GameContext object with all relevant data
 */
export function retrieveGameContext(
  playerId: string,
  action: string,
  location?: string
): GameContext {
  // Retrieve player data
  const player = getPlayer(playerId);
  if (!player) {
    throw new Error(`Player not found: ${playerId}`);
  }

  // Convert player from data format to types format
  const playerContext: Player = {
    id: player.id,
    username: player.username,
    class: player.class,
    level: player.level,
    xp: player.xp,
  };

  // Retrieve relevant lore using semantic search
  const loreEntries = retrieveRelevantLore(action, location);

  // Retrieve NPC memories about this player
  const npcMemories = retrieveNPCMemories(playerId);

  // Retrieve recent world events
  const worldEvents = retrieveWorldEvents();

  // Retrieve recent gameplay events for this player
  const recentEvents = retrieveRecentEvents(playerId);

  return {
    player: playerContext,
    location,
    loreEntries,
    npcMemories,
    worldEvents,
    recentEvents,
  };
}

/**
 * Retrieve relevant lore based on player action
 * Uses keyword search for now (can be upgraded to vector search later)
 *
 * @param action - The player's action
 * @param location - Optional location context
 * @returns Array of relevant lore entries (max 5)
 */
function retrieveRelevantLore(
  action: string,
  location?: string
): LoreEntry[] {
  // Build search query from action and location
  const searchQuery = location ? `${action} ${location}` : action;

  // Search lore using keyword search
  const foundLore = searchLore(searchQuery);

  // Also get location-specific lore if location is provided
  if (location) {
    const locationLore = searchLore(location);
    foundLore.push(...locationLore);
  }

  // Get all lore if no specific matches found
  const allLore = foundLore.length > 0 ? foundLore : getAllLore();

  // Convert to types format and limit to top 5
  return allLore.slice(0, 5).map((lore) => ({
    id: lore.id,
    title: lore.title,
    content: lore.content,
    tags: lore.tags,
  }));
}

/**
 * Retrieve NPC memories about a specific player
 * Gets memories from all NPCs, sorted by importance
 *
 * @param playerId - The player ID
 * @returns Array of NPC memories (max 10)
 */
function retrieveNPCMemories(playerId: string): NPCMemory[] {
  // Get all NPC memories and filter by player
  const allMemories: NPCMemory[] = [];

  try {
    // Get all NPC memory files
    const memories = getAllNPCMemories();

    // Filter by player and convert to types format
    memories
      .filter((memory) => memory.player_id === playerId)
      .forEach((memory) => {
        allMemories.push({
          id: memory.id,
          npcId: memory.npc_id,
          playerId: memory.player_id,
          memory: memory.memory,
          importance: memory.importance,
          createdAt: memory.created_at,
        });
      });
  } catch (error) {
    console.error('Error retrieving NPC memories:', error);
  }

  // Return top 10 most important memories
  return allMemories
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 10);
}

/**
 * Retrieve recent world events
 * Gets the last 5 world events
 *
 * @returns Array of recent world events
 */
function retrieveWorldEvents(): WorldEvent[] {
  const events = getWorldEvents();

  // Convert to types format
  return events.slice(0, 5).map((event) => ({
    id: event.id,
    name: event.event_name,
    description: event.description,
    timestamp: event.created_at,
  }));
}

/**
 * Retrieve recent gameplay events for a player
 * Gets the last 10 events for context
 *
 * @param playerId - The player ID
 * @returns Array of recent game events
 */
function retrieveRecentEvents(playerId: string): GameEvent[] {
  const events = getGameEvents(playerId);

  // Convert to types format and limit to last 10
  return events.slice(0, 10).map((event) => ({
    id: event.id,
    playerId: event.player_id,
    type: event.event_type,
    description: `${event.event_type} at ${event.location}`,
    timestamp: event.created_at,
  }));
}

/**
 * Format game context into a readable string for AI prompts
 * This converts the structured GameContext into natural language
 *
 * @param context - The game context object
 * @returns Formatted context string
 */
export function formatContextForPrompt(context: GameContext): {
  playerInfo: string;
  loreContext: string;
  memoryContext: string;
  worldEventsContext: string;
  recentActionsContext: string;
} {
  // Format player information
  const playerInfo = `${context.player.username}, a level ${context.player.level} ${context.player.class}`;

  // Format lore context
  const loreContext =
    context.loreEntries.length > 0
      ? context.loreEntries
          .map((lore) => `${lore.title}: ${lore.content}`)
          .join('\n')
      : 'No specific lore available.';

  // Format NPC memory context
  const memoryContext =
    context.npcMemories.length > 0
      ? 'NPCs remember: ' +
        context.npcMemories.map((m) => m.memory).join(', ')
      : 'NPCs have no specific memories of this player.';

  // Format world events context
  const worldEventsContext =
    context.worldEvents.length > 0
      ? 'Recent world events: ' +
        context.worldEvents.map((e) => e.description).join(', ')
      : 'No recent world events.';

  // Format recent actions context
  const recentActionsContext =
    context.recentEvents.length > 0
      ? 'Recent actions: ' +
        context.recentEvents.map((e) => e.type).join(', ')
      : 'No recent actions.';

  return {
    playerInfo,
    loreContext,
    memoryContext,
    worldEventsContext,
    recentActionsContext,
  };
}
