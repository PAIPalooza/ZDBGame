import { NextResponse } from 'next/server';
import {
  createGameplayEvent,
  checkWolfPackRetreatTrigger,
  isValidEventType,
  type GameEventType
} from '@/lib/game-engine';
import { storeActionMemory } from '@/lib/npc';
import { getAllNPCs } from '@/lib/data';

/**
 * POST /api/event/create
 *
 * Create a gameplay event with support for all event types:
 * - explore: Player explores new areas
 * - combat: Player engages in combat
 * - conversation: Player talks with NPCs
 * - quest: Player completes quest objectives
 * - discovery: Player discovers new lore, items, or secrets
 *
 * Also supports legacy event types for backward compatibility:
 * - wolf_kill (mapped to combat)
 * - npc_conversation (mapped to conversation)
 * - help_village (mapped to quest)
 *
 * Refs #4 (Epic 2: Gameplay Event Logging)
 */
export async function POST(request: Request) {
  try {
    const { playerId, eventType, description, location, metadata } = await request.json();

    // Validate required fields
    if (!playerId || !eventType) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: 'playerId and eventType are required'
        },
        { status: 400 }
      );
    }

    // Validate event type
    if (!isValidEventType(eventType)) {
      return NextResponse.json(
        {
          error: 'Invalid event type',
          details: `eventType must be one of: explore, combat, conversation, quest, discovery (or legacy: wolf_kill, npc_conversation, help_village)`,
          received: eventType
        },
        { status: 400 }
      );
    }

    // Validate playerId format (basic UUID check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(playerId)) {
      return NextResponse.json(
        {
          error: 'Invalid playerId format',
          details: 'playerId must be a valid UUID'
        },
        { status: 400 }
      );
    }

    // Create gameplay event
    const gameEvent = createGameplayEvent(
      playerId,
      eventType,
      description || `${eventType} event`,
      location,
      metadata
    );

    // Store NPC memory of this action (Elarin remembers what the player did)
    const npcs = getAllNPCs();
    const elarin = npcs.find(npc => npc.name === 'Elarin');
    if (elarin) {
      await storeActionMemory(elarin.id, playerId, eventType);
    }

    // Check for world event triggers
    // Supports both legacy 'wolf_kill' and new combat events with wolf enemy
    let worldEvent = null;
    const isWolfCombat = eventType === 'wolf_kill' ||
      (eventType === 'combat' && (
        metadata?.combatType === 'wolf' ||
        metadata?.enemyType === 'wolf' ||
        metadata?.legacyEventType === 'wolf_kill'
      ));

    if (isWolfCombat) {
      worldEvent = checkWolfPackRetreatTrigger(playerId);
    }

    return NextResponse.json({
      success: true,
      gameEvent,
      worldEvent,
      message: worldEvent
        ? `Game event created and world event "${worldEvent.event_name}" triggered!`
        : 'Game event created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create event:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Failed to create event'
      },
      { status: 500 }
    );
  }
}
