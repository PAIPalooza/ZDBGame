/**
 * Session Timeout API - Cleanup Inactive Sessions
 *
 * POST /api/sessions/timeout - Check and timeout inactive sessions
 *
 * This endpoint should be called periodically (e.g., via cron job)
 * to automatically timeout sessions that have been inactive for too long.
 *
 * Refs: #5 (Epic 2 - Game Session Tracking)
 */

import { NextResponse } from 'next/server';
import { timeoutInactiveSessions } from '@/lib/session';

/**
 * POST /api/sessions/timeout
 * Check all active sessions and timeout those that have exceeded the timeout period
 *
 * Returns:
 * {
 *   "success": true,
 *   "timedOutSessions": ["session-id-1", "session-id-2"],
 *   "count": 2
 * }
 */
export async function POST(request: Request) {
  try {
    const timedOutSessions = timeoutInactiveSessions();

    return NextResponse.json({
      success: true,
      timedOutSessions,
      count: timedOutSessions.length,
      message: `${timedOutSessions.length} session(s) timed out`,
    });
  } catch (error) {
    console.error('Failed to timeout sessions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to timeout sessions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
