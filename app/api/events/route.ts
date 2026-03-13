import { NextResponse } from 'next/server';
import { getAllGameEvents } from '@/lib/data';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');

    let events = getAllGameEvents();

    // Filter by player if specified
    if (playerId) {
      events = events.filter(event => event.playerId === playerId);
    }

    // Sort by timestamp descending (most recent first)
    events.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json(events, { status: 200 });
  } catch (error) {
    console.error('Failed to get events:', error);
    return NextResponse.json(
      { error: 'Failed to get events' },
      { status: 500 }
    );
  }
}
