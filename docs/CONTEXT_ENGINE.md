# Context Retrieval Engine

## Overview

The Context Retrieval Engine is a comprehensive system for gathering and formatting all relevant game data for AI consumption. It serves as the foundation for AI-powered NPC interactions, narrative generation, and dynamic gameplay.

**Epic 4 - Context Retrieval Engine** | **Issue #8**

## Architecture

### Core Components

1. **Context Builder** (`lib/context-engine.ts`)
   - Parallel data retrieval for optimal performance
   - Configurable filtering and limits
   - Type-safe TypeScript implementation
   - Performance benchmarking utilities

2. **API Endpoint** (`/api/context/build`)
   - REST API for context generation
   - Both POST and GET methods supported
   - JSON and formatted text output

3. **Data Sources**
   - Player stats and state
   - NPC memories about player
   - Lore entries (semantic search)
   - World events
   - Recent gameplay events

## Features

### Comprehensive Data Retrieval

The engine queries multiple data sources in parallel:

- **Player Data**: Current stats, level, class, faction, reputation
- **NPC Memories**: Memories sorted by importance and recency
- **Lore Entries**: Semantic keyword search for relevant lore
- **Game Events**: Recent player actions (explore, combat, conversations)
- **World Events**: Global events affecting the game world

### Configurable Filtering

```typescript
interface ContextRetrievalConfig {
  maxMemories?: number;              // Max memories to retrieve (default: 10)
  maxLore?: number;                  // Max lore entries (default: 5)
  maxGameEvents?: number;            // Max game events (default: 20)
  maxWorldEvents?: number;           // Max world events (default: 5)
  recentEventsWindow?: number;       // Hours to look back (default: 24)
  enableSemanticLoreSearch?: boolean; // Enable lore search (default: true)
  memoryImportanceThreshold?: number; // Min importance 1-10 (default: 1)
}
```

### Performance Optimization

- **Parallel Retrieval**: All data sources queried concurrently
- **Smart Filtering**: Importance-based and time-based filtering
- **Efficient Limits**: Configurable limits prevent over-retrieval
- **Performance Tracking**: Built-in timing and benchmarking

Average retrieval time: **< 50ms** for typical datasets

## Usage

### Basic Usage (TypeScript)

```typescript
import { buildGameContext, formatContextForAI } from '@/lib/context-engine';

// Build context
const context = await buildGameContext(
  'player-123',
  'npc-456',
  'tell me about ember tower'
);

// Format for AI
const formatted = formatContextForAI(context);
console.log(formatted.formattedText);
console.log(`Estimated tokens: ${formatted.estimatedTokens}`);
```

### Quick Build

```typescript
import { quickBuildContext } from '@/lib/context-engine';

// Build and format in one call
const result = await quickBuildContext(
  'player-123',
  'npc-456',
  'ember tower'
);
```

### Custom Configuration

```typescript
const context = await buildGameContext(
  playerId,
  npcId,
  query,
  {
    maxMemories: 5,
    maxLore: 3,
    memoryImportanceThreshold: 5,
    recentEventsWindow: 12 // Last 12 hours
  }
);
```

### API Usage

**POST /api/context/build**

```bash
curl -X POST http://localhost:3000/api/context/build \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "player-123",
    "npcId": "npc-456",
    "query": "tell me about ember tower",
    "format": "text",
    "config": {
      "maxMemories": 5,
      "maxLore": 3
    }
  }'
```

**GET /api/context/build**

```bash
curl "http://localhost:3000/api/context/build?playerId=player-123&npcId=npc-456&query=ember+tower"
```

## Response Format

### JSON Response

```json
{
  "success": true,
  "context": {
    "player": {
      "id": "player-123",
      "username": "Adventurer",
      "class": "Ranger",
      "level": 5,
      "xp": 1000
    },
    "npc": {
      "id": "npc-456",
      "name": "Elarin",
      "role": "Historian",
      "location": "Moonvale"
    },
    "npcMemories": [...],
    "relevantLore": [...],
    "recentGameEvents": [...],
    "recentWorldEvents": [...],
    "metadata": {
      "timestamp": "2026-03-13T10:30:00Z",
      "retrievalTimeMs": 45,
      "config": {...},
      "stats": {
        "memoriesFound": 3,
        "loreEntriesFound": 2,
        "gameEventsFound": 10,
        "worldEventsFound": 1
      }
    }
  }
}
```

### Formatted Text Response

```
=== GAME CONTEXT ===
Retrieved: 2026-03-13T10:30:00Z

--- PLAYER ---
ID: player-123
Name: Adventurer
Class: Ranger
Level: 5 (1000 XP)

--- NPC ---
ID: npc-456
Name: Elarin
Role: Historian
Location: Moonvale

--- NPC MEMORIES ABOUT PLAYER ---
1. [Importance: 8] Player defeated wolves near village (2026-03-13T09:00:00Z)
2. [Importance: 5] Player asked about Ember Tower (2026-03-13T08:30:00Z)

--- RELEVANT LORE ---
1. The Fall of Ember Tower
   The Ember Tower collapsed after a magical experiment went wrong...
   Tags: ember tower, magic, history

--- RECENT PLAYER EVENTS ---
1. [wolf_kill] Defeated wolf pack (2026-03-13T09:00:00Z)
2. [explore] Explored northern forest (2026-03-13T08:45:00Z)

--- WORLD EVENTS ---
1. Wolf Pack Retreat: Wolves have retreated from Moonvale (2026-03-13T09:05:00Z)

--- CONTEXT STATISTICS ---
Memories: 2
Lore Entries: 1
Game Events: 2
World Events: 1
Retrieval Time: 45ms
```

## Performance Benchmarking

### Run Benchmarks

```typescript
import { benchmarkContextRetrieval } from '@/lib/context-engine';

const results = await benchmarkContextRetrieval(
  playerId,
  npcId,
  10 // iterations
);

console.log(`Average: ${results.averageMs}ms`);
console.log(`Min: ${results.minMs}ms`);
console.log(`Max: ${results.maxMs}ms`);
```

### Performance Targets

| Dataset Size | Target Time |
|--------------|-------------|
| Empty | < 10ms |
| Small (< 10 items) | < 50ms |
| Medium (10-50 items) | < 100ms |
| Large (50-200 items) | < 200ms |

## Integration with AI Systems

### Preparing Context for LLM Prompts

```typescript
const formatted = await quickBuildContext(playerId, npcId, playerMessage);

const prompt = `
You are ${formatted.context.npc?.name}, a ${formatted.context.npc?.role}.

${formatted.formattedText}

Player says: "${playerMessage}"

Respond in character, using the context provided above.
`;

// Send to LLM API (e.g., OpenAI, Anthropic)
```

### Token Optimization

The engine provides token estimates to help manage LLM costs:

```typescript
const formatted = formatContextForAI(context);

if (formatted.estimatedTokens > 2000) {
  // Reduce context size
  context = await buildGameContext(playerId, npcId, query, {
    maxMemories: 3,
    maxLore: 2,
    maxGameEvents: 10
  });
}
```

## Testing

### Run Tests

```bash
# All context engine tests
npm test -- __tests__/context

# Specific test files
npm test -- __tests__/context-engine.test.ts
npm test -- __tests__/context-performance.test.ts
npm test -- __tests__/api/context-build.test.ts
```

### Test Coverage

- ✅ Context building with all data sources
- ✅ Custom configuration
- ✅ Filtering (importance, time window)
- ✅ Context formatting
- ✅ API endpoints (POST/GET)
- ✅ Error handling
- ✅ Performance benchmarks
- ✅ Integration scenarios

**Current Coverage**: 97.7% statements, 81% branches

## Utility Functions

### Extract Search Query

```typescript
import { extractSearchQuery } from '@/lib/context-engine';

const query = extractSearchQuery('tell me about the ember tower');
// Returns: "ember tower" (filler words removed)
```

### Validate Configuration

```typescript
import { validateConfig } from '@/lib/context-engine';

const isValid = validateConfig({
  maxMemories: 10,
  memoryImportanceThreshold: 5
});
```

## Future Enhancements

### Planned Features

1. **Vector Embeddings**: Replace keyword search with true semantic search
2. **Context Caching**: Cache frequently accessed contexts
3. **Smart Context Pruning**: ML-based relevance scoring
4. **Multi-NPC Context**: Build context for multiple NPCs simultaneously
5. **Context Versioning**: Track context changes over time
6. **Real-time Updates**: WebSocket support for live context updates

### Integration Roadmap

- [ ] **Epic 5**: Integrate with AIKit for LLM generation
- [ ] **Epic 6**: Context-aware narrative system
- [ ] **Epic 7**: Dynamic quest generation from context
- [ ] **Epic 8**: Player behavior prediction

## Best Practices

### 1. Use Appropriate Limits

```typescript
// For quick responses
const quickContext = await buildGameContext(playerId, npcId, query, {
  maxMemories: 3,
  maxLore: 2
});

// For detailed narrative
const detailedContext = await buildGameContext(playerId, npcId, query, {
  maxMemories: 10,
  maxLore: 5,
  maxGameEvents: 30
});
```

### 2. Filter by Importance

```typescript
// Only retrieve important memories
const context = await buildGameContext(playerId, npcId, query, {
  memoryImportanceThreshold: 7
});
```

### 3. Adjust Time Windows

```typescript
// Recent context (last hour)
const recentContext = await buildGameContext(playerId, npcId, query, {
  recentEventsWindow: 1
});

// Extended context (last week)
const extendedContext = await buildGameContext(playerId, npcId, query, {
  recentEventsWindow: 168
});
```

### 4. Monitor Performance

```typescript
const context = await buildGameContext(playerId, npcId, query);

if (context.metadata.retrievalTimeMs > 100) {
  console.warn('Slow context retrieval:', context.metadata.retrievalTimeMs);
}
```

## Troubleshooting

### Slow Retrieval

- Reduce `maxMemories`, `maxLore`, `maxGameEvents`
- Increase `memoryImportanceThreshold`
- Decrease `recentEventsWindow`

### Missing Data

- Check if player/NPC exists
- Verify data has been created in the system
- Ensure semantic search is enabled for lore

### High Token Counts

- Reduce max limits in configuration
- Use importance filtering for memories
- Shorten time windows for events

## API Reference

See [API Documentation](./API.md) for complete endpoint reference.

## Contributing

When extending the context engine:

1. Add new data sources to `buildGameContext()`
2. Update `GameContext` interface in `lib/types.ts`
3. Add formatting logic to `formatContextForAI()`
4. Write comprehensive tests
5. Update this documentation

## License

ISC License - See LICENSE file for details

---

**Last Updated**: 2026-03-13
**Version**: 1.0.0
**Maintainer**: AI Product Architecture Team
