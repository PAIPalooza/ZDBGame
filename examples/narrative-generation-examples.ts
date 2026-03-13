/**
 * AI Game Master Narrative Generation - Code Examples
 *
 * This file demonstrates how to use the narrative generation system
 * in various scenarios.
 */

import { GMActionRequest, GMActionResponse } from '../lib/narrative-types';

// ============================================================================
// Example 1: Basic Player Action
// ============================================================================

/**
 * Generate a narrative for exploring a location
 */
async function exploreLocation(playerId: string) {
  const request: GMActionRequest = {
    playerId,
    action: 'Explore the northern forest',
    location: 'Northern Forest',
  };

  const response = await fetch('/api/gm/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const data: GMActionResponse = await response.json();

  console.log('=== NARRATIVE ===');
  console.log(data.narrative.fullNarrative);

  if (data.narrative.questHooks.length > 0) {
    console.log('\n=== QUEST HOOKS ===');
    data.narrative.questHooks.forEach((hook, i) => {
      console.log(`${i + 1}. ${hook}`);
    });
  }

  return data;
}

// ============================================================================
// Example 2: Combat Action
// ============================================================================

/**
 * Generate a narrative for combat
 */
async function combatAction(playerId: string) {
  const request: GMActionRequest = {
    playerId,
    action: 'Attack the wolf with my sword',
    location: 'Northern Forest',
  };

  const response = await fetch('/api/gm/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const data: GMActionResponse = await response.json();

  // Display different sections
  console.log('=== COMBAT OUTCOME ===');
  console.log(data.narrative.actionOutcome);
  console.log('\n=== WORLD REACTION ===');
  console.log(data.narrative.worldReaction);

  return data;
}

// ============================================================================
// Example 3: Social Interaction
// ============================================================================

/**
 * Generate a narrative for talking to an NPC
 */
async function talkToNPC(playerId: string, npcName: string, topic: string) {
  const request: GMActionRequest = {
    playerId,
    action: `Ask ${npcName} about ${topic}`,
    location: 'Moonvale',
  };

  const response = await fetch('/api/gm/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const data: GMActionResponse = await response.json();

  // Check what context was used
  console.log('=== CONTEXT USED ===');
  console.log(`Lore entries: ${data.contextUsed.loreEntries.length}`);
  console.log(`NPC memories: ${data.contextUsed.npcMemories.length}`);

  if (data.contextUsed.npcMemories.length > 0) {
    console.log('\nNPC remembers:');
    data.contextUsed.npcMemories.forEach((m) => {
      console.log(`- ${m.memory}`);
    });
  }

  console.log('\n=== NARRATIVE ===');
  console.log(data.narrative.fullNarrative);

  return data;
}

// ============================================================================
// Example 4: Investigation Action
// ============================================================================

/**
 * Generate a narrative for investigating something
 */
async function investigateObject(playerId: string, object: string, location: string) {
  const request: GMActionRequest = {
    playerId,
    action: `Carefully examine the ${object}`,
    location,
  };

  const response = await fetch('/api/gm/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const data: GMActionResponse = await response.json();

  console.log('=== INVESTIGATION ===');
  console.log(data.narrative.fullNarrative);

  // Save narrative log ID for reference
  console.log(`\nNarrative logged: ${data.narrativeLogId}`);

  return data;
}

// ============================================================================
// Example 5: Retrieve Player's Narrative History
// ============================================================================

/**
 * Get all narratives for a player
 */
import { getPlayerNarrativeLogs } from '../lib/narrative-log';

function getPlayerHistory(playerId: string) {
  const logs = getPlayerNarrativeLogs(playerId, 20);

  console.log(`=== PLAYER HISTORY (${logs.length} actions) ===`);

  logs.forEach((log, i) => {
    const date = new Date(log.createdAt);
    console.log(`\n${i + 1}. [${date.toLocaleString()}]`);
    console.log(`Action: ${log.playerAction}`);
    console.log(`Response: ${log.gmResponse.substring(0, 100)}...`);
  });

  return logs;
}

// ============================================================================
// Example 6: Error Handling
// ============================================================================

/**
 * Properly handle errors from the API
 */
async function narrativeWithErrorHandling(playerId: string, action: string) {
  try {
    const request: GMActionRequest = {
      playerId,
      action,
    };

    const response = await fetch('/api/gm/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('API Error:', error);
      return null;
    }

    const data: GMActionResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Network Error:', error);
    return null;
  }
}

// ============================================================================
// Example 7: Building a Simple Game Loop
// ============================================================================

/**
 * Example game loop with narrative generation
 */
async function gameLoop(playerId: string) {
  const actions = [
    { action: 'Look around the village square', location: 'Moonvale' },
    { action: 'Talk to the village elder', location: 'Moonvale' },
    { action: 'Head north toward the forest', location: 'Northern Forest' },
    { action: 'Search for wolf tracks', location: 'Northern Forest' },
  ];

  console.log('=== STARTING GAME SESSION ===\n');

  for (const { action, location } of actions) {
    console.log(`\n>>> PLAYER ACTION: ${action}`);
    console.log(`    Location: ${location}\n`);

    const response = await fetch('/api/gm/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, action, location }),
    });

    const data: GMActionResponse = await response.json();

    console.log(data.narrative.fullNarrative);

    if (data.narrative.questHooks.length > 0) {
      console.log('\n[Quest Hooks]:');
      data.narrative.questHooks.forEach((hook) => console.log(`  - ${hook}`));
    }

    console.log('\n' + '='.repeat(60));

    // Small delay between actions
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log('\n=== SESSION COMPLETE ===');
}

// ============================================================================
// Example 8: Test Narrative (No API Call)
// ============================================================================

/**
 * Generate a test narrative without calling the AI API
 */
import { generateTestNarrative } from '../lib/aikit';
import { retrieveGameContext } from '../lib/context-retrieval';

function testNarrativeGeneration(playerId: string) {
  // Get real game context
  const context = retrieveGameContext(
    playerId,
    'explore ancient ruins',
    'Ember Tower'
  );

  // Generate test narrative
  const narrative = generateTestNarrative('explore ancient ruins', context);

  console.log('=== TEST NARRATIVE ===');
  console.log(narrative.fullNarrative);

  return narrative;
}

// ============================================================================
// Export Examples
// ============================================================================

export {
  exploreLocation,
  combatAction,
  talkToNPC,
  investigateObject,
  getPlayerHistory,
  narrativeWithErrorHandling,
  gameLoop,
  testNarrativeGeneration,
};

// ============================================================================
// Usage in a React Component
// ============================================================================

/**
 * Example React component using the narrative system
 */
/*
import React, { useState } from 'react';

export function GameMasterInterface({ playerId }: { playerId: string }) {
  const [action, setAction] = useState('');
  const [narrative, setNarrative] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/gm/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, action }),
      });

      const data = await response.json();
      setNarrative(data.narrative.fullNarrative);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="What do you do?"
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Generating...' : 'Submit'}
        </button>
      </form>

      {narrative && (
        <div className="narrative">
          <p>{narrative}</p>
        </div>
      )}
    </div>
  );
}
*/

// ============================================================================
// CLI Example
// ============================================================================

/**
 * Command-line interface for testing
 */
/*
async function cliExample() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const playerId = 'test-player-id';

  console.log('AI Game Master - Interactive Mode');
  console.log('Type your actions, or "quit" to exit\n');

  const askAction = () => {
    rl.question('> ', async (action: string) => {
      if (action.toLowerCase() === 'quit') {
        rl.close();
        return;
      }

      const response = await fetch('/api/gm/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, action }),
      });

      const data = await response.json();
      console.log('\n' + data.narrative.fullNarrative + '\n');

      askAction();
    });
  };

  askAction();
}
*/
