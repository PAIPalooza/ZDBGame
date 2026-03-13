/**
 * Session Management API - Individual Session Operations
 *
 * GET /api/sessions/[sessionId] - Get session details
 * PUT /api/sessions/[sessionId] - End a session
 * DELETE /api/sessions/[sessionId] - Delete a session (admin)
 *
 * Refs: #5 (Epic 2 - Game Session Tracking)
 */

import { NextResponse } from 'next/server';
import {
  getSession,
  getSessionWithStats,
  endSession,
  deleteSession,
} from '@/lib/session';

interface RouteParams {
  params: Promise<{
    sessionId: string;
  }>;
}

/**
 * GET /api/sessions/[sessionId]
 * Get session details with optional statistics
 *
 * Query params:
 * - stats: Include statistics (default: false)
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('stats') === 'true';

    if (includeStats) {
      const sessionWithStats = getSessionWithStats(sessionId);

      if (!sessionWithStats) {
        return NextResponse.json(
          {
            success: false,
            error: 'Session not found',
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        session: sessionWithStats,
      });
    }

    const session = getSession(sessionId);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error('Failed to get session:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/sessions/[sessionId]
 * End a session
 *
 * Body:
 * {
 *   "reason": "ended" | "timeout" (optional, default: "ended")
 * }
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const reason = body.reason === 'timeout' ? 'timeout' : 'ended';

    const updatedSession = endSession(sessionId, reason);

    if (!updatedSession) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session: updatedSession,
      message: `Session ended (${reason})`,
    });
  } catch (error) {
    console.error('Failed to end session:', error);

    // Check if session is already ended
    if (error instanceof Error && error.message.includes('already')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session is already ended',
          details: error.message,
        },
        { status: 409 } // Conflict
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to end session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sessions/[sessionId]
 * Delete a session (admin operation)
 * Use with caution - this permanently removes session data
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { sessionId } = await params;

    const deleted = deleteSession(sessionId);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete session:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
