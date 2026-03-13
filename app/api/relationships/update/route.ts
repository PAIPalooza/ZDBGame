import { NextResponse } from 'next/server';
import { updateRelationshipForAction, type PlayerAction } from '@/lib/relationships';

/**
 * POST /api/relationships/update
 *
 * Update NPC-Player relationship based on player actions
 *
 * Request body:
 * {
 *   npcId: string,
 *   playerId: string,
 *   action: PlayerAction
 * }
 *
 * Response:
 * {
 *   relationship: NPCRelationship,
 *   message: string
 * }
 */
export async function POST(request: Request) {
  try {
    const { npcId, playerId, action } = await request.json();

    // Validate required fields
    if (!npcId || !playerId || !action) {
      return NextResponse.json(
        { error: 'npcId, playerId, and action are required' },
        { status: 400 }
      );
    }

    // Validate action is a valid PlayerAction
    const validActions: PlayerAction[] = [
      'help_village', 'complete_quest', 'share_information', 'gift_item',
      'ask_about_history', 'ask_about_location', 'explore_together',
      'wolf_kill', 'protect_npc', 'fight_together', 'defeat_boss',
      'lie_to_npc', 'steal_from_npc', 'threaten_npc', 'ignore_plea', 'break_promise',
      'casual_greeting', 'trade_items', 'ask_generic_question'
    ];

    if (!validActions.includes(action as PlayerAction)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // Update relationship based on action
    const updatedRelationship = updateRelationshipForAction(
      npcId,
      playerId,
      action as PlayerAction
    );

    return NextResponse.json({
      relationship: updatedRelationship,
      message: `Relationship updated for action: ${action}`
    }, { status: 200 });

  } catch (error) {
    console.error('Failed to update relationship:', error);
    return NextResponse.json(
      { error: 'Failed to update relationship' },
      { status: 500 }
    );
  }
}
