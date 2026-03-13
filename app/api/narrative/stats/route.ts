/**
 * Narrative Statistics API Endpoint
 *
 * GET /api/narrative/stats - Get narrative statistics for a player
 *
 * Query parameters:
 * - playerId (required): Player ID
 *
 * Epic 4: Narrative History Storage
 * Issue: #10
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNarrativeStats } from '@/lib/narrative';

/**
 * GET /api/narrative/stats
 *
 * Retrieve narrative statistics for a specific player
 *
 * @example
 * GET /api/narrative/stats?playerId=player-123
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const playerId = searchParams.get('playerId');

        // Validate required parameters
        if (!playerId) {
            return NextResponse.json(
                { error: 'playerId is required' },
                { status: 400 }
            );
        }

        // Get narrative statistics
        const stats = getNarrativeStats(playerId);

        return NextResponse.json({
            success: true,
            data: {
                playerId,
                totalInteractions: stats.totalInteractions,
                uniqueNPCsInteracted: stats.uniqueNPCs.size,
                uniqueNPCsList: Array.from(stats.uniqueNPCs),
                totalLoreRetrieved: stats.totalLoreRetrieved,
                averageResponseTime: Math.round(stats.averageResponseTime)
            }
        }, { status: 200 });

    } catch (error) {
        console.error('Failed to retrieve narrative statistics:', error);
        return NextResponse.json(
            {
                error: 'Failed to retrieve narrative statistics',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
