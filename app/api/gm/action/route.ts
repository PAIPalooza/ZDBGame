/**
 * AI Game Master Action Endpoint
 * POST /api/gm/action
 *
 * This endpoint generates AI-powered narrative responses to player actions.
 *
 * Flow:
 * 1. Validate request (playerId, action)
 * 2. Retrieve game context (lore, memories, events)
 * 3. Generate narrative using AIKit (Anthropic Claude)
 * 4. Log narrative response
 * 5. Return structured narrative
 *
 * References:
 * - Issue: #9
 * - Epic: 4
 * - Feature: 4.2 (Narrative Generation)
 */

import { NextResponse } from 'next/server';
import { GMActionRequest, GMActionResponse } from '@/lib/narrative-types';
import { retrieveGameContext } from '@/lib/context-retrieval';
import { generateNarrative } from '@/lib/aikit';
import { saveNarrativeLog } from '@/lib/narrative-log';

export async function POST(request: Request) {
  try {
    // Parse and validate request
    const body: GMActionRequest = await request.json();

    if (!body.playerId || !body.action) {
      return NextResponse.json(
        { error: 'playerId and action are required' },
        { status: 400 }
      );
    }

    const { playerId, action, location } = body;

    // Step 1: Retrieve game context
    let gameContext;
    try {
      gameContext = retrieveGameContext(playerId, action, location);
    } catch (error) {
      console.error('Failed to retrieve game context:', error);
      return NextResponse.json(
        {
          error: 'Failed to retrieve game context',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    // Step 2: Generate narrative using AIKit
    let narrative;
    try {
      narrative = await generateNarrative(action, gameContext);
    } catch (error) {
      console.error('Failed to generate narrative:', error);
      return NextResponse.json(
        {
          error: 'Failed to generate narrative',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    // Step 3: Log the narrative response
    let narrativeLog;
    try {
      narrativeLog = saveNarrativeLog(
        playerId,
        action,
        narrative.fullNarrative,
        gameContext
      );
    } catch (error) {
      console.error('Failed to save narrative log:', error);
      // Continue even if logging fails
      narrativeLog = { id: 'error-logging-failed' };
    }

    // Step 4: Build and return response
    const response: GMActionResponse = {
      narrative,
      narrativeLogId: narrativeLog.id,
      contextUsed: gameContext,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in /api/gm/action:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check API status
 */
export async function GET() {
  return NextResponse.json(
    {
      endpoint: '/api/gm/action',
      status: 'active',
      description: 'AI Game Master narrative generation endpoint',
      usage: {
        method: 'POST',
        body: {
          playerId: 'string (required)',
          action: 'string (required)',
          location: 'string (optional)',
        },
      },
    },
    { status: 200 }
  );
}
