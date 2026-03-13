/**
 * Game Event Creation API with Session Tracking
 *
 * POST /api/event/create-with-session - Create a game event with automatic session tracking
 *
 * This endpoint extends the original event creation with session awareness.
 * If no session_id is provided, it will automatically associate the event with
 * the player's active session.
 *
 * Refs: #5 (Epic 2 - Game Session Tracking)
 */

import { NextResponse } from 'next/server';
import { saveGameEventWithSession } from '@/lib/data-session-extension';
import { getActiveSession } from '@/lib/session';
import { storeActionMemory } from '@/lib/npc';
import { getAllNPCs } from '@/lib/data';
import { checkWolfPackRetreatTrigger } from '@/lib/game-engine';

export async function POST(request: Request) {
  try {
    const { playerId, sessionId, eventType, description, location, metadata } = await request.json();

    if (!playerId || !eventType) {
      return NextResponse.json(
        {
          success: false,
          error: 'playerId and eventType are required',
        },
        { status: 400 }
      );
    }

    // Get or validate session
    let actualSessionId = sessionId;
    if (!actualSessionId) {
      const activeSession = getActiveSession(playerId);
      if (!activeSession) {
        return NextResponse.json(
          {
            success: false,
            error: 'No active session found for player. Please start a session first.',
            hint: 'POST /api/sessions with playerId to create a session',
          },
          { status: 400 }
        );
      }
      actualSessionId = activeSession.id;
    }

    // Create gameplay event with session tracking
    const gameEvent = saveGameEventWithSession({
      player_id: playerId,
      session_id: actualSessionId,
      event_type: eventType,
      location: location || 'Unknown',
      metadata: metadata || {},
    });

    // Store NPC memory of this action (Elarin remembers what the player did)
    const npcs = getAllNPCs();
    const elarin = npcs.find(npc => npc.name === 'Elarin');
    if (elarin) {
      await storeActionMemory(elarin.id, playerId, eventType);
    }

    // Check for world event triggers (only for wolf_kill events)
    let worldEvent = null;
    if (eventType === 'wolf_kill') {
      worldEvent = checkWolfPackRetreatTrigger(playerId);
    }

    return NextResponse.json({
      success: true,
      gameEvent,
      worldEvent,
      sessionId: actualSessionId,
      message: worldEvent
        ? `Game event created and world event "${worldEvent.name}" triggered!`
        : 'Game event created successfully with session tracking',
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create event with session:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create event',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
