/**
 * Narrative History API Endpoints
 *
 * GET /api/narrative - Get narrative logs for a player with pagination and search
 *
 * Query parameters:
 * - playerId (required): Player ID to get history for
 * - limit (optional): Number of logs per page (default: 20)
 * - offset (optional): Offset for pagination (default: 0)
 * - search (optional): Search term to filter logs
 *
 * Epic 4: Narrative History Storage
 * Issue: #10
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPlayerNarrativeHistory } from '@/lib/narrative';

/**
 * GET /api/narrative
 *
 * Retrieve narrative history for a specific player
 *
 * @example
 * GET /api/narrative?playerId=player-123&limit=10&offset=0
 * GET /api/narrative?playerId=player-123&search=ember tower
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const playerId = searchParams.get('playerId');
        const limitParam = searchParams.get('limit');
        const offsetParam = searchParams.get('offset');
        const searchTerm = searchParams.get('search');

        // Validate required parameters
        if (!playerId) {
            return NextResponse.json(
                { error: 'playerId is required' },
                { status: 400 }
            );
        }

        // Parse pagination parameters
        const limit = limitParam ? parseInt(limitParam, 10) : 20;
        const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

        // Validate pagination parameters
        if (isNaN(limit) || limit < 1 || limit > 100) {
            return NextResponse.json(
                { error: 'limit must be between 1 and 100' },
                { status: 400 }
            );
        }

        if (isNaN(offset) || offset < 0) {
            return NextResponse.json(
                { error: 'offset must be a non-negative number' },
                { status: 400 }
            );
        }

        // Get narrative history
        const history = getPlayerNarrativeHistory({
            playerId,
            limit,
            offset,
            searchTerm: searchTerm || undefined
        });

        return NextResponse.json({
            success: true,
            data: history.logs,
            pagination: {
                total: history.total,
                page: history.page,
                pageSize: history.pageSize,
                hasMore: history.hasMore
            }
        }, { status: 200 });

    } catch (error) {
        console.error('Failed to retrieve narrative history:', error);
        return NextResponse.json(
            {
                error: 'Failed to retrieve narrative history',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
