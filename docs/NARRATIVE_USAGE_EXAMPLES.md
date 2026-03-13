# Narrative History Storage - Usage Examples

This document provides practical examples for using the Narrative History Storage system.

## Table of Contents

1. [Basic Logging](#basic-logging)
2. [Retrieving History](#retrieving-history)
3. [Search and Filtering](#search-and-filtering)
4. [Statistics and Analytics](#statistics-and-analytics)
5. [API Usage](#api-usage)
6. [Advanced Scenarios](#advanced-scenarios)

## Basic Logging

### Log a Simple Interaction

```typescript
import { logNarrativeInteraction } from '@/lib/narrative';

// Log a player-NPC conversation
const log = logNarrativeInteraction({
  playerId: 'player-123',
  npcId: 'npc-elarin',
  playerInput: 'Hello, Elarin!',
  gmResponse: 'Greetings, traveler. Welcome to Moonvale.',
  npcName: 'Elarin',
  location: 'Moonvale Village Square'
});

console.log('Logged interaction:', log.id);
```

### Log with Context Metadata

```typescript
import { logNarrativeInteraction } from '@/lib/narrative';

// Log with lore and memory context
const log = logNarrativeInteraction({
  playerId: 'player-123',
  npcId: 'npc-elarin',
  playerInput: 'Tell me about the Ember Tower',
  gmResponse: 'Ah, the Ember Tower... It collapsed centuries ago after a magical experiment went wrong.',
  loreUsed: [
    { id: 'lore-ember-tower', title: 'Fall of Ember Tower', content: '...', tags: ['history', 'magic'] }
  ],
  memoriesReferenced: [
    {
      id: 'mem-123',
      npcId: 'npc-elarin',
      playerId: 'player-123',
      memory: 'Player asked about Ember Tower',
      importance: 2,
      createdAt: '2024-03-12T10:30:00Z'
    }
  ],
  responseTime: 45,
  npcName: 'Elarin',
  location: 'Moonvale',
  additionalMetadata: {
    questRelated: true,
    questId: 'quest-tower-mystery'
  }
});
```

### Log System Messages

```typescript
import { logNarrativeInteraction } from '@/lib/narrative';

// Log system-generated events (no NPC)
const log = logNarrativeInteraction({
  playerId: 'player-123',
  playerInput: 'Level up!',
  gmResponse: 'You have reached level 5! New abilities unlocked.',
  additionalMetadata: {
    eventType: 'level_up',
    newLevel: 5
  }
});
```

## Retrieving History

### Get Recent Player History

```typescript
import { getPlayerNarrativeHistory } from '@/lib/narrative';

// Get last 20 interactions
const history = getPlayerNarrativeHistory({
  playerId: 'player-123',
  limit: 20,
  offset: 0
});

console.log(`Found ${history.total} total interactions`);
console.log(`Showing ${history.logs.length} on page ${history.page}`);
console.log(`Has more: ${history.hasMore}`);

history.logs.forEach(log => {
  console.log(`[${log.createdAt}] ${log.playerInput} -> ${log.gmResponse}`);
});
```

### Get Specific NPC Conversation

```typescript
import { getNPCConversationHistory } from '@/lib/narrative';

// Get conversation with Elarin
const conversation = getNPCConversationHistory(
  'npc-elarin',
  'player-123',
  10 // last 10 messages
);

console.log(`Conversation with Elarin (${conversation.length} messages):`);
conversation.forEach((msg, i) => {
  console.log(`${i + 1}. Player: ${msg.playerInput}`);
  console.log(`   Elarin: ${msg.gmResponse}`);
});
```

### Get Recent Context for AI

```typescript
import { getRecentNarrativeContext } from '@/lib/narrative';

// Get last 5 interactions for context
const recentContext = getRecentNarrativeContext('player-123', 5);

// Use in AI prompt
const contextSummary = recentContext.map(log =>
  `Player said: "${log.playerInput}"\nGM responded: "${log.gmResponse}"`
).join('\n\n');

console.log('Recent conversation context:\n', contextSummary);
```

## Search and Filtering

### Search by Keyword

```typescript
import { getPlayerNarrativeHistory } from '@/lib/narrative';

// Search for logs containing "ember tower"
const results = getPlayerNarrativeHistory({
  playerId: 'player-123',
  searchTerm: 'ember tower',
  limit: 10
});

console.log(`Found ${results.logs.length} logs mentioning "ember tower"`);
```

### Paginate Through Large History

```typescript
import { getPlayerNarrativeHistory } from '@/lib/narrative';

async function displayAllHistory(playerId: string) {
  const pageSize = 20;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const history = getPlayerNarrativeHistory({
      playerId,
      limit: pageSize,
      offset: page * pageSize
    });

    console.log(`\n--- Page ${page + 1} ---`);
    history.logs.forEach(log => {
      console.log(`${log.playerInput} -> ${log.gmResponse}`);
    });

    hasMore = history.hasMore;
    page++;
  }
}
```

## Statistics and Analytics

### Get Player Narrative Stats

```typescript
import { getNarrativeStats } from '@/lib/narrative';

const stats = getNarrativeStats('player-123');

console.log('Player Narrative Statistics:');
console.log('- Total Interactions:', stats.totalInteractions);
console.log('- Unique NPCs Met:', stats.uniqueNPCs.size);
console.log('- NPCs:', Array.from(stats.uniqueNPCs).join(', '));
console.log('- Total Lore Retrieved:', stats.totalLoreRetrieved);
console.log('- Avg Response Time:', Math.round(stats.averageResponseTime), 'ms');
```

### Export Player Story

```typescript
import { exportPlayerStory } from '@/lib/narrative';

const story = exportPlayerStory('player-123');

console.log(`Player ${story.playerId} Story`);
console.log(`Total Interactions: ${story.totalInteractions}\n`);

story.logs.forEach((log, i) => {
  const timestamp = new Date(log.timestamp).toLocaleString();
  console.log(`\n[${timestamp}] ${log.npcName || 'System'} at ${log.location || 'Unknown'}`);
  console.log(`Player: ${log.playerInput}`);
  console.log(`GM: ${log.gmResponse}`);
});

// Export to JSON file
import fs from 'fs';
fs.writeFileSync(
  `player-${story.playerId}-story.json`,
  JSON.stringify(story, null, 2)
);
```

## API Usage

### Fetch History via API

```javascript
// Client-side JavaScript
async function fetchPlayerHistory(playerId, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;

  const response = await fetch(
    `/api/narrative?playerId=${playerId}&limit=${pageSize}&offset=${offset}`
  );

  const data = await response.json();

  if (data.success) {
    console.log('Logs:', data.data);
    console.log('Pagination:', data.pagination);
    return data;
  } else {
    console.error('Error:', data.error);
  }
}

// Usage
fetchPlayerHistory('player-123', 1, 20);
```

### Search via API

```javascript
async function searchNarrative(playerId, searchTerm) {
  const response = await fetch(
    `/api/narrative?playerId=${playerId}&search=${encodeURIComponent(searchTerm)}`
  );

  const data = await response.json();

  if (data.success) {
    console.log(`Found ${data.data.length} matching logs`);
    return data.data;
  }
}

// Usage
searchNarrative('player-123', 'ember tower');
```

### Get NPC Conversation via API

```javascript
async function fetchNPCConversation(playerId, npcId, limit = 10) {
  const response = await fetch(
    `/api/narrative/conversation?playerId=${playerId}&npcId=${npcId}&limit=${limit}`
  );

  const data = await response.json();

  if (data.success) {
    console.log(`Conversation count: ${data.data.conversationCount}`);
    data.data.messages.forEach(msg => {
      console.log(`Player: ${msg.playerInput}`);
      console.log(`NPC: ${msg.gmResponse}`);
    });
    return data.data.messages;
  }
}

// Usage
fetchNPCConversation('player-123', 'npc-elarin', 10);
```

### Get Statistics via API

```javascript
async function fetchPlayerStats(playerId) {
  const response = await fetch(`/api/narrative/stats?playerId=${playerId}`);
  const data = await response.json();

  if (data.success) {
    const stats = data.data;
    console.log('Player Stats:');
    console.log('- Total Interactions:', stats.totalInteractions);
    console.log('- Unique NPCs:', stats.uniqueNPCsInteracted);
    console.log('- Lore Retrieved:', stats.totalLoreRetrieved);
    console.log('- Avg Response Time:', stats.averageResponseTime, 'ms');
    return stats;
  }
}

// Usage
fetchPlayerStats('player-123');
```

### Export Story via API

```javascript
async function exportStory(playerId) {
  const response = await fetch(`/api/narrative/export?playerId=${playerId}`);
  const data = await response.json();

  if (data.success) {
    // Download as JSON
    const blob = new Blob([JSON.stringify(data.data, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `player-${playerId}-story.json`;
    a.click();

    return data.data;
  }
}

// Usage
exportStory('player-123');
```

## Advanced Scenarios

### Build AI Context from Recent History

```typescript
import { getRecentNarrativeContext } from '@/lib/narrative';
import { getLore } from '@/lib/data';

function buildAIContext(playerId: string, maxTokens: number = 2000) {
  const recentLogs = getRecentNarrativeContext(playerId, 10);

  // Build context string
  let context = 'Recent conversation history:\n\n';
  let estimatedTokens = 50; // Base overhead

  for (const log of recentLogs) {
    const entry = `Player: ${log.player_input}\nGM: ${log.gm_response}\n\n`;
    const entryTokens = Math.ceil(entry.length / 4); // Rough estimate

    if (estimatedTokens + entryTokens > maxTokens) {
      break; // Stop if we exceed token limit
    }

    context += entry;
    estimatedTokens += entryTokens;
  }

  return {
    context,
    estimatedTokens,
    logsIncluded: recentLogs.length
  };
}

const aiContext = buildAIContext('player-123', 2000);
console.log('AI Context:', aiContext);
```

### Track Player Journey

```typescript
import { exportPlayerStory, getNarrativeStats } from '@/lib/narrative';

function analyzePlayerJourney(playerId: string) {
  const story = exportPlayerStory(playerId);
  const stats = getNarrativeStats(playerId);

  // Analyze journey
  const locations = new Set(story.logs.map(log => log.location).filter(Boolean));
  const npcs = Array.from(stats.uniqueNPCs);

  // Timeline
  const firstInteraction = story.logs[story.logs.length - 1];
  const lastInteraction = story.logs[0];

  return {
    playerId,
    totalInteractions: stats.totalInteractions,
    locationsVisited: Array.from(locations),
    npcsEncountered: npcs.length,
    loreDiscovered: stats.totalLoreRetrieved,
    journeyStart: firstInteraction?.timestamp,
    lastActivity: lastInteraction?.timestamp,
    averageResponseTime: stats.averageResponseTime
  };
}

const journey = analyzePlayerJourney('player-123');
console.log('Player Journey Analysis:', journey);
```

### Monitor NPC Effectiveness

```typescript
import { getNPCConversationHistory, getNarrativeStats } from '@/lib/narrative';

function analyzeNPCPerformance(npcId: string, playerId: string) {
  const conversation = getNPCConversationHistory(npcId, playerId);

  // Calculate metrics
  const totalInteractions = conversation.length;
  const avgResponseTime = conversation.reduce((sum, log) =>
    sum + (log.context_metadata.response_time || 0), 0
  ) / totalInteractions;

  const loreUsage = conversation.reduce((sum, log) =>
    sum + log.context_metadata.lore_retrieved.length, 0
  );

  const memoryUsage = conversation.reduce((sum, log) =>
    sum + log.context_metadata.memories_used.length, 0
  );

  return {
    npcId,
    playerId,
    totalInteractions,
    averageResponseTime: Math.round(avgResponseTime),
    totalLoreUsed: loreUsage,
    totalMemoriesUsed: memoryUsage,
    avgLorePerInteraction: (loreUsage / totalInteractions).toFixed(2),
    avgMemoriesPerInteraction: (memoryUsage / totalInteractions).toFixed(2)
  };
}

const npcPerformance = analyzeNPCPerformance('npc-elarin', 'player-123');
console.log('NPC Performance:', npcPerformance);
```

### Create Narrative Report

```typescript
import { exportPlayerStory, getNarrativeStats } from '@/lib/narrative';

function generateNarrativeReport(playerId: string) {
  const story = exportPlayerStory(playerId);
  const stats = getNarrativeStats(playerId);

  const report = {
    summary: {
      playerId,
      totalInteractions: stats.totalInteractions,
      uniqueNPCsInteracted: stats.uniqueNPCs.size,
      totalLoreDiscovered: stats.totalLoreRetrieved,
      averageResponseTime: Math.round(stats.averageResponseTime)
    },
    timeline: story.logs.map(log => ({
      timestamp: log.timestamp,
      location: log.location,
      npcName: log.npcName,
      playerInput: log.playerInput,
      gmResponse: log.gmResponse
    })),
    insights: {
      mostActiveLocation: getMostFrequent(story.logs.map(l => l.location)),
      mostInteractedNPC: getMostFrequent(story.logs.map(l => l.npcName)),
      averageInteractionLength: calculateAvgLength(story.logs)
    }
  };

  return report;
}

function getMostFrequent(arr: (string | undefined)[]): string {
  const counts = arr.filter(Boolean).reduce((acc, val) => {
    acc[val!] = (acc[val!] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
}

function calculateAvgLength(logs: any[]): number {
  const totalChars = logs.reduce((sum, log) =>
    sum + log.playerInput.length + log.gmResponse.length, 0
  );
  return Math.round(totalChars / logs.length);
}

const report = generateNarrativeReport('player-123');
console.log('Narrative Report:', JSON.stringify(report, null, 2));
```

## Error Handling

### Robust API Calls

```typescript
async function safelyFetchHistory(playerId: string) {
  try {
    const response = await fetch(`/api/narrative?playerId=${playerId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Unknown error');
    }

    return data.data;
  } catch (error) {
    console.error('Failed to fetch narrative history:', error);
    return [];
  }
}
```

### Validate Data Before Logging

```typescript
import { logNarrativeInteraction } from '@/lib/narrative';

function safelyLogInteraction(params: any) {
  // Validate required fields
  if (!params.playerId) {
    throw new Error('playerId is required');
  }

  if (!params.playerInput || !params.gmResponse) {
    throw new Error('playerInput and gmResponse are required');
  }

  // Sanitize input
  const sanitized = {
    ...params,
    playerInput: params.playerInput.trim(),
    gmResponse: params.gmResponse.trim(),
    loreUsed: params.loreUsed || [],
    memoriesReferenced: params.memoriesReferenced || []
  };

  try {
    return logNarrativeInteraction(sanitized);
  } catch (error) {
    console.error('Failed to log interaction:', error);
    throw error;
  }
}
```

## Best Practices

1. **Always log interactions**: Ensure every player-GM interaction is logged for continuity
2. **Include context metadata**: Track lore and memories used for better AI context
3. **Use pagination**: For large histories, always use pagination to avoid loading too much data
4. **Monitor response times**: Track response times to identify performance issues
5. **Regular exports**: Periodically export player stories for backup
6. **Search optimization**: Use specific search terms for better performance
7. **Clean up old data**: Implement archival strategy for very old narrative logs
8. **Error handling**: Always handle errors gracefully in production code

## Conclusion

The Narrative History Storage system provides a comprehensive solution for tracking and analyzing player-GM interactions. Use these examples as a starting point for your specific use cases.

For more information, see:
- [Full Documentation](/docs/NARRATIVE_HISTORY.md)
- [API Reference](/docs/NARRATIVE_HISTORY.md#api-reference)
- [Implementation Summary](/EPIC4_IMPLEMENTATION_SUMMARY.md)
