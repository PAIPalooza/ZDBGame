/**
 * Session Management API - List and Create Sessions
 *
 * GET /api/sessions - List all sessions (admin) or player sessions
 * POST /api/sessions - Create a new session
 *
 * Refs: #5 (Epic 2 - Game Session Tracking)
 */

import { NextResponse } from 'next/server';
import {
  createSession,
  getAllSessions,
  getPlayerSessions,
  getPlayerSessionStats,
} from '@/lib/session';

/**
 * GET /api/sessions
 * List sessions with optional filtering
 *
 * Query params:
 * - playerId: Filter sessions by player ID
 * - includeEnded: Include ended sessions (default: true)
 * - stats: Include player statistics (default: false)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const includeEnded = searchParams.get('includeEnded') !== 'false';
    const includeStats = searchParams.get('stats') === 'true';

    if (playerId) {
      const sessions = getPlayerSessions(playerId, includeEnded);
      const stats = includeStats ? getPlayerSessionStats(playerId) : undefined;

      return NextResponse.json({
        success: true,
        sessions,
        stats,
        count: sessions.length,
      });
    }

    // Admin: Get all sessions
    const sessions = getAllSessions();

    return NextResponse.json({
      success: true,
      sessions,
      count: sessions.length,
    });
  } catch (error) {
    console.error('Failed to get sessions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get sessions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sessions
 * Create a new game session
 *
 * Body:
 * {
 *   "playerId": "uuid",
 *   "metadata": { ... } (optional)
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { playerId, metadata } = body;

    if (!playerId) {
      return NextResponse.json(
        {
          success: false,
          error: 'playerId is required',
        },
        { status: 400 }
      );
    }

    const session = createSession(playerId, metadata);

    return NextResponse.json(
      {
        success: true,
        session,
        message: 'Session created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create session:', error);

    // Check if error is due to existing active session
    if (error instanceof Error && error.message.includes('already has an active session')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Player already has an active session',
          details: error.message,
        },
        { status: 409 } // Conflict
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
