import { NextResponse } from 'next/server';
import { updatePlayer } from '@/lib/data';

export async function PATCH(request: Request) {
  try {
    const { playerId, updates } = await request.json();

    if (!playerId) {
      return NextResponse.json(
        { error: 'playerId is required' },
        { status: 400 }
      );
    }

    const updatedPlayer = updatePlayer(playerId, updates);

    if (!updatedPlayer) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedPlayer, { status: 200 });
  } catch (error) {
    console.error('Failed to update player:', error);
    return NextResponse.json(
      { error: 'Failed to update player' },
      { status: 500 }
    );
  }
}
