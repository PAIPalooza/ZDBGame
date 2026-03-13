import { NextResponse } from 'next/server';
import { savePlayer } from '@/lib/zerodb';

/**
 * POST /api/player/create
 *
 * Creates a new player with default attributes.
 *
 * Response Format:
 * {
 *   success: true,
 *   player: {
 *     id: string (UUID),
 *     username: string,
 *     class: string,
 *     faction: string,
 *     level: number,
 *     xp: number,
 *     inventory: array,
 *     reputation: number,
 *     created_at: string (ISO timestamp)
 *   }
 * }
 *
 * Error Response:
 * {
 *   success: false,
 *   error: string,
 *   details?: string
 * }
 *
 * Status Codes:
 * - 201: Player created successfully
 * - 400: Invalid input data
 * - 500: Server error
 *
 * Refs #3
 */
export async function POST() {
  try {
    // Create player with complete profile
    const player = await savePlayer({
      username: 'TobyTheExplorer',
      class: 'Ranger',
      faction: 'Forest Guild',
      level: 1,
      xp: 0,
      inventory: [], // Default empty inventory
      reputation: 0, // Default reputation
    });

    // Return success response with player data
    return NextResponse.json(
      {
        success: true,
        player: player,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create player:', error);

    // Check error type for specific handling
    const errorMessage = error instanceof Error ? error.message : 'Failed to create player';
    const statusCode = errorMessage.includes('Validation') ? 400 : 500;

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create player',
        details: errorMessage,
      },
      { status: statusCode }
    );
  }
}
