/**
 * API Endpoint: POST /api/context/build
 *
 * Build comprehensive game context for AI consumption
 *
 * Request Body:
 * {
 *   playerId: string;
 *   npcId: string;
 *   query?: string;
 *   config?: ContextRetrievalConfig;
 *   format?: 'json' | 'text';
 * }
 *
 * Response:
 * {
 *   success: true,
 *   context: GameContext,
 *   formattedText?: string,
 *   estimatedTokens?: number
 * }
 *
 * Refs: Epic 4 - Context Retrieval Engine
 * Issue: #8
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  buildGameContext,
  formatContextForAI,
  validateConfig,
  ContextRetrievalConfig
} from '@/lib/context-engine';

interface BuildContextRequest {
  playerId: string;
  npcId: string;
  query?: string;
  config?: Partial<ContextRetrievalConfig>;
  format?: 'json' | 'text';
}

export async function POST(request: NextRequest) {
  try {
    const body: BuildContextRequest = await request.json();

    // Validate required fields
    if (!body.playerId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: playerId'
        },
        { status: 400 }
      );
    }

    if (!body.npcId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: npcId'
        },
        { status: 400 }
      );
    }

    // Validate config if provided
    if (body.config && !validateConfig(body.config)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid configuration parameters'
        },
        { status: 400 }
      );
    }

    // Build game context
    const context = await buildGameContext(
      body.playerId,
      body.npcId,
      body.query || '',
      body.config || {}
    );

    // Check if player or NPC exists
    if (!context.player) {
      return NextResponse.json(
        {
          success: false,
          error: `Player not found: ${body.playerId}`
        },
        { status: 404 }
      );
    }

    if (!context.npc) {
      return NextResponse.json(
        {
          success: false,
          error: `NPC not found: ${body.npcId}`
        },
        { status: 404 }
      );
    }

    // Format response based on requested format
    const format = body.format || 'json';

    if (format === 'text') {
      const formatted = formatContextForAI(context);
      return NextResponse.json({
        success: true,
        context,
        formattedText: formatted.formattedText,
        estimatedTokens: formatted.estimatedTokens
      });
    }

    // Default JSON format
    return NextResponse.json({
      success: true,
      context
    });

  } catch (error) {
    console.error('Error building context:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for quick testing
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const playerId = searchParams.get('playerId');
  const npcId = searchParams.get('npcId');
  const query = searchParams.get('query') || '';

  if (!playerId || !npcId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing required query parameters: playerId and npcId'
      },
      { status: 400 }
    );
  }

  try {
    const context = await buildGameContext(playerId, npcId, query);

    if (!context.player) {
      return NextResponse.json(
        {
          success: false,
          error: `Player not found: ${playerId}`
        },
        { status: 404 }
      );
    }

    if (!context.npc) {
      return NextResponse.json(
        {
          success: false,
          error: `NPC not found: ${npcId}`
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      context
    });

  } catch (error) {
    console.error('Error building context:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
