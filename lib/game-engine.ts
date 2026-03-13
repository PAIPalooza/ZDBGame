/**
 * Game Engine for ZDBGame - Moonvale Demo
 * Handles gameplay event tracking and world event triggering
 *
 * CRITICAL: Wolf Pack Retreat triggers at EXACTLY 3 wolf_kill events, only once per player
 *
 * Refs #8
 */

import {
    GameEvent,
    WorldEvent,
    saveGameEvent,
    getGameEvents,
    countGameEvents,
    saveWorldEvent,
    getWorldEvents,
} from './data';

// World event constants
const WOLF_PACK_RETREAT_EVENT = 'Wolf Pack Retreat';
const WOLF_PACK_RETREAT_DESCRIPTION = 'Wolf activity around Moonvale has suddenly decreased.';
const WOLF_KILL_THRESHOLD = 3;
const WOLF_KILL_EVENT_TYPE = 'wolf_kill';

/**
 * Valid event types for the game
 * - explore: Player explores new areas
 * - combat: Player engages in combat (replaces wolf_kill for generic combat)
 * - conversation: Player talks with NPCs (replaces npc_conversation)
 * - quest: Player completes quest objectives (replaces help_village)
 * - discovery: Player discovers new lore, items, or secrets
 */
export type GameEventType = 'explore' | 'combat' | 'conversation' | 'quest' | 'discovery';

/**
 * Legacy event type mapping for backward compatibility
 * Maps old event types to new standardized types
 */
const LEGACY_EVENT_TYPE_MAP: Record<string, GameEventType> = {
    'wolf_kill': 'combat',
    'npc_conversation': 'conversation',
    'help_village': 'quest',
};

/**
 * Create a gameplay event
 * Tracks player actions: explore, combat, conversation, quest, discovery
 */
export function createGameplayEvent(
    playerId: string,
    eventType: GameEventType | 'wolf_kill' | 'npc_conversation' | 'help_village',
    description: string,
    location: string = 'Moonvale',
    metadata: Record<string, any> = {}
): GameEvent {
    // Convert legacy event types to new standardized types
    const normalizedEventType = (LEGACY_EVENT_TYPE_MAP[eventType] || eventType) as GameEventType;

    const event = saveGameEvent({
        player_id: playerId,
        event_type: normalizedEventType,
        location,
        metadata: {
            ...metadata,
            description,
            // Preserve legacy type for backward compatibility
            ...(eventType !== normalizedEventType ? { legacyEventType: eventType } : {}),
        },
    });

    return event;
}

/**
 * Count wolf_kill events for a specific player
 * Now counts combat events where metadata.legacyEventType === 'wolf_kill'
 * or metadata.combatType === 'wolf'
 */
export function countWolfKillsForPlayer(playerId: string): number {
    const combatEvents = getGameEvents(playerId, 'combat');
    return combatEvents.filter(event =>
        event.metadata?.legacyEventType === 'wolf_kill' ||
        event.metadata?.combatType === 'wolf' ||
        event.metadata?.enemyType === 'wolf'
    ).length;
}

/**
 * Check if Wolf Pack Retreat world event already exists for a player
 */
function worldEventExistsForPlayer(eventName: string, playerId: string): boolean {
    const allWorldEvents = getWorldEvents();
    return allWorldEvents.some(
        e => e.event_name === eventName && e.trigger_source === playerId
    );
}

/**
 * Check if Wolf Pack Retreat should be triggered
 * Returns null if already triggered or threshold not met
 */
export function checkWolfPackRetreatTrigger(playerId: string): WorldEvent | null {
    // Check if already triggered for this player
    if (worldEventExistsForPlayer(WOLF_PACK_RETREAT_EVENT, playerId)) {
        return null;
    }

    // Count wolf kills
    const wolfKillCount = countWolfKillsForPlayer(playerId);

    // Trigger at exactly 3 wolf kills
    if (wolfKillCount === WOLF_KILL_THRESHOLD) {
        const worldEvent = saveWorldEvent({
            event_name: WOLF_PACK_RETREAT_EVENT,
            description: WOLF_PACK_RETREAT_DESCRIPTION,
            trigger_source: playerId,
            metadata: {
                wolf_kill_count: wolfKillCount,
                threshold: WOLF_KILL_THRESHOLD,
            },
        });

        return worldEvent;
    }

    return null;
}

/**
 * Process a gameplay event and check for triggered world events
 * This is the main entry point for event processing
 */
export function processGameplayEvent(
    playerId: string,
    eventType: GameEventType | 'wolf_kill' | 'npc_conversation' | 'help_village',
    description: string,
    location: string = 'Moonvale',
    metadata: Record<string, any> = {}
): { gameEvent: GameEvent; worldEvent?: WorldEvent } {
    // Create the gameplay event
    const gameEvent = createGameplayEvent(playerId, eventType, description, location, metadata);

    // Check if this event triggers a world event
    let worldEvent: WorldEvent | undefined;

    // Check for wolf_kill (legacy) or combat events with wolf as enemy
    const isWolfCombat = eventType === 'wolf_kill' ||
        (eventType === 'combat' && (
            metadata?.legacyEventType === 'wolf_kill' ||
            metadata?.combatType === 'wolf' ||
            metadata?.enemyType === 'wolf'
        ));

    if (isWolfCombat) {
        const triggered = checkWolfPackRetreatTrigger(playerId);
        if (triggered) {
            worldEvent = triggered;
        }
    }

    return { gameEvent, worldEvent };
}

/**
 * Get wolf kill progress for a player
 * Returns count and whether threshold is reached
 */
export function getWolfKillProgress(playerId: string): {
    count: number;
    threshold: number;
    isComplete: boolean;
    eventTriggered: boolean;
} {
    const count = countWolfKillsForPlayer(playerId);
    const eventTriggered = worldEventExistsForPlayer(WOLF_PACK_RETREAT_EVENT, playerId);

    return {
        count,
        threshold: WOLF_KILL_THRESHOLD,
        isComplete: count >= WOLF_KILL_THRESHOLD,
        eventTriggered,
    };
}

/**
 * Validate event type
 * Accepts both new standardized types and legacy types for backward compatibility
 */
export function isValidEventType(eventType: string): boolean {
    const validTypes: string[] = [
        // New standardized event types
        'explore',
        'combat',
        'conversation',
        'quest',
        'discovery',
        // Legacy event types for backward compatibility
        'wolf_kill',
        'help_village',
        'npc_conversation'
    ];
    return validTypes.includes(eventType);
}

/**
 * Get all world events
 */
export function getAllWorldEvents(): WorldEvent[] {
    return getWorldEvents();
}

/**
 * Get all game events for a player
 */
export function getPlayerGameEvents(playerId: string): GameEvent[] {
    return getGameEvents(playerId);
}
