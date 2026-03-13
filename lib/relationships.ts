/**
 * NPC Relationship Management System
 *
 * Handles relationship scoring, modification, and integration with game actions.
 * Relationships track four dimensions: trust, respect, fear, and affinity.
 *
 * Design principles:
 * - All scores range from 0-100
 * - Neutral starting values: 50 (trust, respect, affinity), 0 (fear)
 * - Different actions modify different relationship dimensions
 * - Relationships influence NPC dialogue and behavior
 *
 * References:
 * - Issue #7: NPC Relationship Tracking
 * - Data Model: /datamodel.md
 */

import { NPCRelationship as NPCRelationshipType } from './types';
import {
  getNPCPlayerRelationship,
  modifyNPCRelationship,
  updateNPCRelationship,
  getAllNPCRelationships,
  getAllPlayerRelationships
} from './data';

/**
 * Relationship level thresholds for categorization
 */
export const RELATIONSHIP_THRESHOLDS = {
  VERY_LOW: 20,
  LOW: 40,
  NEUTRAL: 60,
  HIGH: 80,
  VERY_HIGH: 100
} as const;

/**
 * Get the current relationship between an NPC and player
 * Creates a new neutral relationship if none exists
 */
export function getRelationship(npcId: string, playerId: string): NPCRelationshipType {
  const dbRelationship = getNPCPlayerRelationship(npcId, playerId);

  // Transform from snake_case to camelCase for API
  return {
    id: dbRelationship.id,
    npcId: dbRelationship.npc_id,
    playerId: dbRelationship.player_id,
    trust: dbRelationship.trust,
    respect: dbRelationship.respect,
    fear: dbRelationship.fear,
    affinity: dbRelationship.affinity,
    lastUpdated: dbRelationship.last_updated,
    createdAt: dbRelationship.created_at
  };
}

/**
 * Update relationship scores based on player actions
 * Actions are categorized by their impact on relationship dimensions
 */
export function updateRelationshipForAction(
  npcId: string,
  playerId: string,
  action: PlayerAction
): NPCRelationshipType {
  const modifier = getActionModifier(action);

  const updatedRelationship = modifyNPCRelationship(npcId, playerId, modifier);

  // Transform to camelCase
  return {
    id: updatedRelationship.id,
    npcId: updatedRelationship.npc_id,
    playerId: updatedRelationship.player_id,
    trust: updatedRelationship.trust,
    respect: updatedRelationship.respect,
    fear: updatedRelationship.fear,
    affinity: updatedRelationship.affinity,
    lastUpdated: updatedRelationship.last_updated,
    createdAt: updatedRelationship.created_at
  };
}

/**
 * Player actions that affect relationships
 */
export type PlayerAction =
  // Helpful actions
  | 'help_village'
  | 'complete_quest'
  | 'share_information'
  | 'gift_item'

  // Exploration and learning
  | 'ask_about_history'
  | 'ask_about_location'
  | 'explore_together'

  // Combat and danger
  | 'wolf_kill'
  | 'protect_npc'
  | 'fight_together'
  | 'defeat_boss'

  // Negative actions
  | 'lie_to_npc'
  | 'steal_from_npc'
  | 'threaten_npc'
  | 'ignore_plea'
  | 'break_promise'

  // Neutral interactions
  | 'casual_greeting'
  | 'trade_items'
  | 'ask_generic_question';

/**
 * Get relationship modifiers for specific player actions
 * Returns delta values to add to current scores
 */
function getActionModifier(action: PlayerAction): {
  trust?: number;
  respect?: number;
  fear?: number;
  affinity?: number;
} {
  const modifiers: Record<PlayerAction, {
    trust?: number;
    respect?: number;
    fear?: number;
    affinity?: number;
  }> = {
    // Helpful actions - build trust and affinity
    'help_village': { trust: 10, respect: 8, affinity: 12 },
    'complete_quest': { trust: 8, respect: 10, affinity: 8 },
    'share_information': { trust: 5, affinity: 5 },
    'gift_item': { trust: 3, affinity: 8 },

    // Exploration and learning - build trust and affinity moderately
    'ask_about_history': { trust: 2, affinity: 3 },
    'ask_about_location': { trust: 1, affinity: 2 },
    'explore_together': { trust: 5, respect: 3, affinity: 6 },

    // Combat actions - build respect and sometimes fear
    'wolf_kill': { respect: 12, fear: 3 },
    'protect_npc': { trust: 15, respect: 10, affinity: 15, fear: -5 },
    'fight_together': { trust: 10, respect: 15, affinity: 8 },
    'defeat_boss': { respect: 20, fear: 8, affinity: 5 },

    // Negative actions - damage trust and affinity, increase fear
    'lie_to_npc': { trust: -15, affinity: -10 },
    'steal_from_npc': { trust: -25, respect: -10, fear: 5, affinity: -20 },
    'threaten_npc': { trust: -20, fear: 20, affinity: -15 },
    'ignore_plea': { trust: -8, affinity: -12 },
    'break_promise': { trust: -20, respect: -15, affinity: -15 },

    // Neutral interactions - small positive effects
    'casual_greeting': { affinity: 1 },
    'trade_items': { trust: 2, affinity: 2 },
    'ask_generic_question': { affinity: 1 }
  };

  return modifiers[action] || {};
}

/**
 * Get a human-readable description of relationship status
 */
export function getRelationshipDescription(relationship: NPCRelationshipType): {
  trust: string;
  respect: string;
  fear: string;
  affinity: string;
  overall: string;
} {
  const getLevel = (score: number): string => {
    if (score >= RELATIONSHIP_THRESHOLDS.VERY_HIGH) return 'very high';
    if (score >= RELATIONSHIP_THRESHOLDS.HIGH) return 'high';
    if (score >= RELATIONSHIP_THRESHOLDS.NEUTRAL) return 'neutral';
    if (score >= RELATIONSHIP_THRESHOLDS.LOW) return 'low';
    return 'very low';
  };

  const trust = getLevel(relationship.trust);
  const respect = getLevel(relationship.respect);
  const fear = getLevel(relationship.fear);
  const affinity = getLevel(relationship.affinity);

  // Calculate overall sentiment
  const positiveScore = relationship.trust + relationship.respect + relationship.affinity;
  const negativeScore = relationship.fear;
  const overallScore = positiveScore / 3 - negativeScore / 2;

  let overall: string;
  if (overallScore >= 70) overall = 'The NPC considers you a trusted friend and ally.';
  else if (overallScore >= 50) overall = 'The NPC views you favorably.';
  else if (overallScore >= 30) overall = 'The NPC is neutral toward you.';
  else if (overallScore >= 10) overall = 'The NPC is wary of you.';
  else overall = 'The NPC distrusts or fears you.';

  return { trust, respect, fear, affinity, overall };
}

/**
 * Generate relationship-aware dialogue context
 * Returns text snippets that should influence NPC responses
 */
export function getRelationshipContext(relationship: NPCRelationshipType): string {
  const { trust, respect, fear, affinity } = relationship;

  // High fear overrides other factors
  if (fear >= RELATIONSHIP_THRESHOLDS.HIGH) {
    return "The NPC seems nervous and keeps their distance from you.";
  }

  // Very positive relationship
  if (trust >= RELATIONSHIP_THRESHOLDS.HIGH && affinity >= RELATIONSHIP_THRESHOLDS.HIGH) {
    return "The NPC greets you warmly as a trusted friend.";
  }

  // High respect from heroic deeds
  if (respect >= RELATIONSHIP_THRESHOLDS.VERY_HIGH) {
    return "The NPC looks at you with admiration and respect.";
  }

  // Positive but not exceptional
  if (trust >= RELATIONSHIP_THRESHOLDS.NEUTRAL && affinity >= RELATIONSHIP_THRESHOLDS.NEUTRAL) {
    return "The NPC acknowledges you with a friendly nod.";
  }

  // Low trust
  if (trust <= RELATIONSHIP_THRESHOLDS.LOW) {
    return "The NPC regards you with suspicion.";
  }

  // Default neutral
  return "The NPC greets you courteously.";
}

/**
 * Check if relationship meets specific thresholds for unlocking content
 */
export function checkRelationshipThreshold(
  relationship: NPCRelationshipType,
  requirements: {
    minTrust?: number;
    minRespect?: number;
    maxFear?: number;
    minAffinity?: number;
  }
): boolean {
  const checks: boolean[] = [];

  if (requirements.minTrust !== undefined) {
    checks.push(relationship.trust >= requirements.minTrust);
  }
  if (requirements.minRespect !== undefined) {
    checks.push(relationship.respect >= requirements.minRespect);
  }
  if (requirements.maxFear !== undefined) {
    checks.push(relationship.fear <= requirements.maxFear);
  }
  if (requirements.minAffinity !== undefined) {
    checks.push(relationship.affinity >= requirements.minAffinity);
  }

  // All requirements must be met
  return checks.length > 0 && checks.every(check => check === true);
}

/**
 * Get all relationships for an NPC
 */
export function getNPCRelationships(npcId: string): NPCRelationshipType[] {
  const relationships = getAllNPCRelationships(npcId);

  return relationships.map(r => ({
    id: r.id,
    npcId: r.npc_id,
    playerId: r.player_id,
    trust: r.trust,
    respect: r.respect,
    fear: r.fear,
    affinity: r.affinity,
    lastUpdated: r.last_updated,
    createdAt: r.created_at
  }));
}

/**
 * Get all relationships for a player
 */
export function getPlayerRelationships(playerId: string): NPCRelationshipType[] {
  const relationships = getAllPlayerRelationships(playerId);

  return relationships.map(r => ({
    id: r.id,
    npcId: r.npc_id,
    playerId: r.player_id,
    trust: r.trust,
    respect: r.respect,
    fear: r.fear,
    affinity: r.affinity,
    lastUpdated: r.last_updated,
    createdAt: r.created_at
  }));
}

/**
 * Manually set relationship scores (for testing or special events)
 */
export function setRelationshipScores(
  npcId: string,
  playerId: string,
  scores: {
    trust?: number;
    respect?: number;
    fear?: number;
    affinity?: number;
  }
): NPCRelationshipType {
  const updatedRelationship = updateNPCRelationship(npcId, playerId, scores);

  return {
    id: updatedRelationship.id,
    npcId: updatedRelationship.npc_id,
    playerId: updatedRelationship.player_id,
    trust: updatedRelationship.trust,
    respect: updatedRelationship.respect,
    fear: updatedRelationship.fear,
    affinity: updatedRelationship.affinity,
    lastUpdated: updatedRelationship.last_updated,
    createdAt: updatedRelationship.created_at
  };
}
