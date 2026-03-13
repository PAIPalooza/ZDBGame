/**
 * AI Game Master Narrative Generation Types
 * For Epic 4: Narrative Generation System
 *
 * This file defines types for AI-powered narrative generation,
 * context retrieval, and narrative logging.
 *
 * References:
 * - Issue: #9
 * - Epic: 4
 * - Backlog: /backlog.md
 */

import {
  Player,
  LoreEntry,
  NPCMemory,
  WorldEvent,
  GameEvent,
} from './types';

/**
 * NarrativeLog stores AI-generated narrative responses
 *
 * @example
 * {
 *   id: "c50e8400-e29b-41d4-a716-446655440007",
 *   playerId: "550e8400-e29b-41d4-a716-446655440000",
 *   playerAction: "Explore the northern forest",
 *   gmResponse: "You venture into the shadowy woods...",
 *   contextUsed: {...},
 *   createdAt: "2024-03-12T11:00:00Z"
 * }
 */
export interface NarrativeLog {
  /** Unique narrative log identifier (UUID v4) */
  id: string;

  /** Reference to the player who performed the action */
  playerId: string;

  /** The player's action input */
  playerAction: string;

  /** The AI-generated narrative response (full narrative) */
  gmResponse: string;

  /** Context used to generate the response */
  contextUsed: GameContext;

  /** ISO 8601 timestamp when the narrative was generated */
  createdAt: string;
}

/**
 * GameContext aggregates all relevant context for AI narrative generation
 * This is the context retrieval engine output (Feature 4.1)
 */
export interface GameContext {
  /** Player information */
  player: Player;

  /** Current location information */
  location?: string;

  /** Relevant lore entries retrieved via semantic search */
  loreEntries: LoreEntry[];

  /** Recent NPC memories about this player */
  npcMemories: NPCMemory[];

  /** Recent world events */
  worldEvents: WorldEvent[];

  /** Recent gameplay events for this player (last 10) */
  recentEvents: GameEvent[];
}

/**
 * NarrativeResponse is the structured AI-generated response
 * The AI generates this structure, which includes multiple sections
 */
export interface NarrativeResponse {
  /** Description of the current location */
  locationDescription: string;

  /** Outcome of the player's action */
  actionOutcome: string;

  /** How the world reacts to the action */
  worldReaction: string;

  /** Potential quest hooks or opportunities */
  questHooks: string[];

  /** Full narrative text combining all sections */
  fullNarrative: string;
}

/**
 * GMActionRequest for the /api/gm/action endpoint
 */
export interface GMActionRequest {
  /** Player ID performing the action */
  playerId: string;

  /** The action the player wants to perform */
  action: string;

  /** Optional location context */
  location?: string;
}

/**
 * GMActionResponse from the /api/gm/action endpoint
 */
export interface GMActionResponse {
  /** The structured narrative response */
  narrative: NarrativeResponse;

  /** ID of the narrative log entry created */
  narrativeLogId: string;

  /** Context that was used to generate the narrative */
  contextUsed: GameContext;
}

/**
 * AIKit Configuration for narrative generation
 */
export interface AIKitConfig {
  /** API URL for AIKit */
  apiUrl: string;

  /** API token for authentication */
  apiToken: string;

  /** Model to use for generation */
  model?: string;

  /** Temperature for generation (0.0 - 1.0) */
  temperature?: number;

  /** Maximum tokens to generate */
  maxTokens?: number;
}

/**
 * Prompt template variables for narrative generation
 */
export interface PromptVariables {
  playerName: string;
  playerClass: string;
  playerLevel: number;
  action: string;
  location: string;
  loreContext: string;
  memoryContext: string;
  worldEventsContext: string;
  recentActionsContext: string;
}
