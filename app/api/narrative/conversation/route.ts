/**
 * NPC Conversation History API Endpoint
 *
 * GET /api/narrative/conversation - Get conversation history between NPC and player
 *
 * Query parameters:
 * - playerId (required): Player ID
 * - npcId (required): NPC ID
 * - limit (optional): Number of messages to retrieve (default: 20)
 *
 * Epic 4: Narrative History Storage
 * Issue: #10
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNPCConversationHistory } from '@/lib/narrative';

/**
 * GET /api/narrative/conversation
 *
 * Retrieve conversation history between a specific NPC and player
 *
 * @example
 * GET /api/narrative/conversation?playerId=player-123&npcId=npc-456&limit=10
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const playerId = searchParams.get('playerId');
        const npcId = searchParams.get('npcId');
        const limitParam = searchParams.get('limit');

        // Validate required parameters
        if (!playerId) {
            return NextResponse.json(
                { error: 'playerId is required' },
                { status: 400 }
            );
        }

        if (!npcId) {
            return NextResponse.json(
                { error: 'npcId is required' },
                { status: 400 }
            );
        }

        // Parse limit parameter
        const limit = limitParam ? parseInt(limitParam, 10) : 20;

        // Validate limit
        if (isNaN(limit) || limit < 1 || limit > 100) {
            return NextResponse.json(
                { error: 'limit must be between 1 and 100' },
                { status: 400 }
            );
        }

        // Get conversation history
        const conversation = getNPCConversationHistory(npcId, playerId, limit);

        return NextResponse.json({
            success: true,
            data: {
                playerId,
                npcId,
                conversationCount: conversation.length,
                messages: conversation
            }
        }, { status: 200 });

    } catch (error) {
        console.error('Failed to retrieve conversation history:', error);
        return NextResponse.json(
            {
                error: 'Failed to retrieve conversation history',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
