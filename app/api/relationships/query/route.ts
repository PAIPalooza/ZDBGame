import { NextResponse } from 'next/server';
import {
  getRelationship,
  getNPCRelationships,
  getPlayerRelationships,
  getRelationshipDescription
} from '@/lib/relationships';

/**
 * GET /api/relationships/query
 *
 * Query NPC-Player relationships
 *
 * Query parameters:
 * - npcId: string (optional) - Get all relationships for this NPC
 * - playerId: string (optional) - Get all relationships for this player
 * - npcId & playerId: Get specific relationship between NPC and player
 * - includeDescription: boolean (optional) - Include human-readable descriptions
 *
 * Response:
 * Single relationship:
 * {
 *   relationship: NPCRelationship,
 *   description?: { trust, respect, fear, affinity, overall }
 * }
 *
 * Multiple relationships:
 * {
 *   relationships: NPCRelationship[],
 *   count: number
 * }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const npcId = searchParams.get('npcId');
    const playerId = searchParams.get('playerId');
    const includeDescription = searchParams.get('includeDescription') === 'true';

    // Case 1: Get specific NPC-Player relationship
    if (npcId && playerId) {
      const relationship = getRelationship(npcId, playerId);

      const response: {
        relationship: typeof relationship;
        description?: ReturnType<typeof getRelationshipDescription>;
      } = { relationship };

      if (includeDescription) {
        response.description = getRelationshipDescription(relationship);
      }

      return NextResponse.json(response, { status: 200 });
    }

    // Case 2: Get all relationships for an NPC
    if (npcId && !playerId) {
      const relationships = getNPCRelationships(npcId);

      return NextResponse.json({
        relationships,
        count: relationships.length
      }, { status: 200 });
    }

    // Case 3: Get all relationships for a player
    if (playerId && !npcId) {
      const relationships = getPlayerRelationships(playerId);

      return NextResponse.json({
        relationships,
        count: relationships.length
      }, { status: 200 });
    }

    // No valid query parameters provided
    return NextResponse.json(
      { error: 'Must provide npcId, playerId, or both' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Failed to query relationships:', error);
    return NextResponse.json(
      { error: 'Failed to query relationships' },
      { status: 500 }
    );
  }
}
