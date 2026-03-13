import { NextResponse } from 'next/server';
import { generateNPCResponse } from '@/lib/npc';
import { getAllNPCs } from '@/lib/data';
import { logNarrativeInteraction } from '@/lib/narrative';

export async function POST(request: Request) {
  try {
    const startTime = Date.now();
    const { playerId, message } = await request.json();

    if (!playerId || !message) {
      return NextResponse.json(
        { error: 'playerId and message are required' },
        { status: 400 }
      );
    }

    // Get Elarin (the only NPC)
    const npcs = getAllNPCs();
    const elarin = npcs.find(npc => npc.name === 'Elarin');

    if (!elarin) {
      return NextResponse.json(
        { error: 'NPC not found' },
        { status: 404 }
      );
    }

    // Generate NPC response
    const response = await generateNPCResponse(elarin.id, playerId, message);

    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Log narrative interaction (Epic 4: Narrative History Storage)
    logNarrativeInteraction({
      playerId,
      npcId: elarin.id,
      playerInput: message,
      gmResponse: response.response,
      loreUsed: response.loreUsed,
      memoriesReferenced: response.memoriesReferenced,
      responseTime,
      npcName: 'Elarin',
      location: 'Moonvale'
    });

    return NextResponse.json({
      npcName: 'Elarin',
      response
    }, { status: 200 });
  } catch (error) {
    console.error('Failed to process NPC conversation:', error);
    return NextResponse.json(
      { error: 'Failed to process NPC conversation' },
      { status: 500 }
    );
  }
}
