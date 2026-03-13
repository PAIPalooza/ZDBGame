import { NextResponse } from 'next/server';
import { getAllPlayers } from '@/lib/zerodb';

/**
 * GET /api/player/current
 *
 * Retrieves the most recently created player.
 *
 * Response Format (success):
 * {
 *   success: true,
 *   player: {
 *     id: string,
 *     username: string,
 *     class: string,
 *     faction: string,
 *     level: number,
 *     xp: number,
 *     inventory: array,
 *     reputation: number,
 *     created_at: string
 *   }
 * }
 *
 * Response Format (no player):
 * {
 *   success: false,
 *   error: string,
 *   message: string
 * }
 *
 * Status Codes:
 * - 200: Player found
 * - 404: No player exists
 * - 500: Server error
 *
 * Refs #3
 */
export async function GET() {
  try {
    const players = await getAllPlayers();

    if (players.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No player found',
          message: 'Please create a player first',
        },
        { status: 404 }
      );
    }

    // Return the most recently created player
    const currentPlayer = players[players.length - 1];
    return NextResponse.json(
      {
        success: true,
        player: currentPlayer,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to get current player:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get current player',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
