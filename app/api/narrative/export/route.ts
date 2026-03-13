/**
 * Narrative Story Export API Endpoint
 *
 * GET /api/narrative/export - Export complete player story
 *
 * Query parameters:
 * - playerId (required): Player ID
 *
 * Epic 4: Narrative History Storage
 * Issue: #10
 */

import { NextRequest, NextResponse } from 'next/server';
import { exportPlayerStory } from '@/lib/narrative';

/**
 * GET /api/narrative/export
 *
 * Export complete narrative history for a player in a formatted structure
 *
 * @example
 * GET /api/narrative/export?playerId=player-123
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

        // Export player story
        const story = exportPlayerStory(playerId);

        return NextResponse.json({
            success: true,
            data: story
        }, { status: 200 });

    } catch (error) {
        console.error('Failed to export player story:', error);
        return NextResponse.json(
            {
                error: 'Failed to export player story',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
