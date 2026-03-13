/**
 * AIKit Integration for Narrative Generation
 * Anthropic Claude Integration via AIKit API
 *
 * This module provides AI-powered narrative generation using
 * the AIKit API (Anthropic Claude).
 *
 * References:
 * - Issue: #9
 * - Epic: 4
 * - AIKit Docs: https://api.ainative.studio/
 */

import { AIKitConfig, NarrativeResponse, GameContext } from './narrative-types';
import { formatContextForPrompt } from './context-retrieval';

/**
 * Get AIKit configuration from environment variables
 */
function getAIKitConfig(): AIKitConfig {
  const apiUrl = process.env.AINATIVE_API_URL;
  const apiToken = process.env.AINATIVE_API_TOKEN;

  if (!apiUrl || !apiToken) {
    throw new Error(
      'AIKit credentials not found. Set AINATIVE_API_URL and AINATIVE_API_TOKEN environment variables.'
    );
  }

  return {
    apiUrl,
    apiToken,
    model: 'claude-3-5-sonnet-20241022', // Latest Sonnet model
    temperature: 0.7, // Creative but coherent
    maxTokens: 1000, // Sufficient for narrative responses
  };
}

/**
 * Build the system prompt for the AI Game Master
 * This defines the AI's role and behavior
 */
function buildSystemPrompt(): string {
  return `You are an AI Game Master for the fantasy world of Moonvale. Your role is to narrate the outcomes of player actions in a rich, immersive way.

NARRATIVE STYLE:
- Write in second person ("You...")
- Be descriptive and atmospheric
- Keep responses concise (2-4 paragraphs)
- Match the tone to the action (serious for combat, whimsical for exploration)
- Reference world lore when relevant
- Acknowledge NPC memories and player history

RESPONSE STRUCTURE:
You must respond with valid JSON in this exact format:
{
  "locationDescription": "A brief description of where the player is",
  "actionOutcome": "What happens as a result of the player's action",
  "worldReaction": "How NPCs, creatures, or the environment react",
  "questHooks": ["Optional quest hook 1", "Optional quest hook 2"]
}

IMPORTANT:
- Always return valid JSON
- questHooks should be an array (can be empty: [])
- Be creative but stay grounded in the provided lore and context
- If the action is dangerous, make outcomes realistic
- If NPCs remember the player, reference that in your narration`;
}

/**
 * Build the user prompt with player action and context
 */
function buildUserPrompt(action: string, context: GameContext): string {
  const {
    playerInfo,
    loreContext,
    memoryContext,
    worldEventsContext,
    recentActionsContext,
  } = formatContextForPrompt(context);

  const location = context.location || 'Moonvale';

  return `PLAYER: ${playerInfo}
LOCATION: ${location}
ACTION: ${action}

WORLD LORE:
${loreContext}

NPC MEMORIES:
${memoryContext}

WORLD STATE:
${worldEventsContext}

RECENT PLAYER ACTIONS:
${recentActionsContext}

Generate a narrative response for this action. Remember to respond with valid JSON only.`;
}

/**
 * Parse the AI response and validate structure
 */
function parseAIResponse(responseText: string): NarrativeResponse {
  try {
    // Try to extract JSON from response
    // Sometimes the AI includes markdown code blocks
    let jsonText = responseText.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonText);

    // Validate required fields
    if (
      !parsed.locationDescription ||
      !parsed.actionOutcome ||
      !parsed.worldReaction
    ) {
      throw new Error('Missing required fields in AI response');
    }

    // Ensure questHooks is an array
    const questHooks = Array.isArray(parsed.questHooks)
      ? parsed.questHooks
      : [];

    // Build full narrative by combining all sections
    const fullNarrative = `${parsed.locationDescription}\n\n${parsed.actionOutcome}\n\n${parsed.worldReaction}`;

    return {
      locationDescription: parsed.locationDescription,
      actionOutcome: parsed.actionOutcome,
      worldReaction: parsed.worldReaction,
      questHooks,
      fullNarrative,
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    console.error('Raw response:', responseText);
    throw new Error(`Failed to parse AI response: ${error}`);
  }
}

/**
 * Generate narrative using AIKit (Anthropic Claude)
 * This is the main function for AI narrative generation
 *
 * @param action - The player's action
 * @param context - Game context retrieved from context engine
 * @returns Structured narrative response
 */
export async function generateNarrative(
  action: string,
  context: GameContext
): Promise<NarrativeResponse> {
  const config = getAIKitConfig();

  // Build prompts
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(action, context);

  // Call AIKit API (Anthropic Claude Messages API)
  try {
    const response = await fetch(
      `${config.apiUrl}v1/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiToken,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: config.maxTokens,
          temperature: config.temperature,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userPrompt,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AIKit API error:', errorText);
      throw new Error(
        `AIKit API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    // Extract text from Claude response
    if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
      throw new Error('Invalid response format from AIKit');
    }

    const aiText = data.content[0].text;

    // Parse and validate the response
    return parseAIResponse(aiText);
  } catch (error) {
    console.error('Error generating narrative:', error);

    // Return fallback narrative if AI generation fails
    return {
      locationDescription: context.location
        ? `You are in ${context.location}.`
        : 'You are in Moonvale.',
      actionOutcome: `You attempt to ${action}. The outcome is uncertain.`,
      worldReaction:
        'The world around you continues its ancient rhythms, indifferent to your actions.',
      questHooks: [],
      fullNarrative: `You are in ${
        context.location || 'Moonvale'
      }. You attempt to ${action}. The outcome is uncertain. The world around you continues its ancient rhythms.`,
    };
  }
}

/**
 * Generate a simple test narrative (for testing without API calls)
 */
export function generateTestNarrative(
  action: string,
  context: GameContext
): NarrativeResponse {
  const location = context.location || 'Moonvale';

  return {
    locationDescription: `You stand in ${location}, a place steeped in ancient history.`,
    actionOutcome: `As you ${action}, the world responds to your presence.`,
    worldReaction:
      'The wind carries whispers of old tales, and you feel the weight of countless eyes upon you.',
    questHooks: [
      'You notice something glinting in the distance',
      'A mysterious figure watches from the shadows',
    ],
    fullNarrative: `You stand in ${location}, a place steeped in ancient history. As you ${action}, the world responds to your presence. The wind carries whispers of old tales, and you feel the weight of countless eyes upon you.`,
  };
}
