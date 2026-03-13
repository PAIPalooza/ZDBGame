import { NextResponse } from 'next/server';
import { createGameplayEvent, checkWolfPackRetreatTrigger } from '@/lib/game-engine';
import { storeActionMemory } from '@/lib/npc';
import { getAllNPCs } from '@/lib/data';

export async function POST(request: Request) {
  try {
    const { playerId, eventType, description, location, metadata } = await request.json();

    if (!playerId || !eventType) {
      return NextResponse.json(
        { error: 'playerId and eventType are required' },
        { status: 400 }
      );
    }

    // Create gameplay event
    const gameEvent = createGameplayEvent(
      playerId,
      eventType,
      description,
      location,
      metadata
    );

    // Store NPC memory of this action (Elarin remembers what the player did)
    const npcs = getAllNPCs();
    const elarin = npcs.find(npc => npc.name === 'Elarin');
    if (elarin) {
      storeActionMemory(elarin.id, playerId, eventType);
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
      message: worldEvent
        ? `Game event created and world event "${worldEvent.name}" triggered!`
        : 'Game event created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create event:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}
