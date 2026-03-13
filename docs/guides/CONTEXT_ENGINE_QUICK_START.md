# Context Engine Quick Start Guide

## TL;DR

The Context Retrieval Engine gathers all relevant game data for AI consumption in < 50ms.

```typescript
import { quickBuildContext } from '@/lib/context-engine';

const result = await quickBuildContext(playerId, npcId, playerMessage);
console.log(result.formattedText); // Ready for LLM
```

## Installation

No installation needed - already integrated into the codebase.

## 5-Minute Quick Start

### 1. Basic Usage (TypeScript)

```typescript
import { buildGameContext } from '@/lib/context-engine';

const context = await buildGameContext(
  'player-id',
  'npc-id',
  'player message or search query'
);

// Access context data
console.log(context.player);          // Player stats
console.log(context.npc);             // NPC info
console.log(context.npcMemories);     // NPC's memories about player
console.log(context.relevantLore);    // Matching lore entries
console.log(context.recentGameEvents);// Recent player actions
console.log(context.recentWorldEvents); // World events
```

### 2. Format for AI

```typescript
import { formatContextForAI } from '@/lib/context-engine';

const formatted = formatContextForAI(context);

// Use in LLM prompt
const prompt = `
You are an NPC in a game.

${formatted.formattedText}

Player says: "Hello"
Respond in character:
`;
```

### 3. API Usage

```bash
# POST with JSON
curl -X POST http://localhost:3000/api/context/build \
  -H "Content-Type: application/json" \
  -d '{"playerId":"id","npcId":"id","query":"test","format":"text"}'

# GET with query params
curl "http://localhost:3000/api/context/build?playerId=id&npcId=id&query=test"
```

## Common Use Cases

### Use Case 1: NPC Dialogue

```typescript
// Player talks to NPC
const playerMessage = "Tell me about the tower";

// Build context
const ctx = await quickBuildContext(playerId, npcId, playerMessage);

// Send to LLM
const response = await callLLM({
  system: `You are ${ctx.context.npc?.name}`,
  context: ctx.formattedText,
  message: playerMessage
});
```

### Use Case 2: Narrative Generation

```typescript
// Generate narrative based on context
const ctx = await buildGameContext(playerId, npcId, '', {
  maxMemories: 10,
  maxGameEvents: 20
});

const narrative = await generateNarrative(ctx);
```

### Use Case 3: Dynamic Quest Generation

```typescript
// Build rich context for quest generation
const ctx = await buildGameContext(playerId, npcId, 'quest', {
  maxLore: 10,
  memoryImportanceThreshold: 5
});

const quest = await generateQuest(ctx);
```

## Configuration Examples

### Minimal Context (Fast)

```typescript
const ctx = await buildGameContext(playerId, npcId, query, {
  maxMemories: 3,
  maxLore: 2,
  maxGameEvents: 5,
  maxWorldEvents: 2
});
```

### Rich Context (Detailed)

```typescript
const ctx = await buildGameContext(playerId, npcId, query, {
  maxMemories: 20,
  maxLore: 10,
  maxGameEvents: 50,
  maxWorldEvents: 10,
  memoryImportanceThreshold: 1
});
```

### Recent Events Only

```typescript
const ctx = await buildGameContext(playerId, npcId, query, {
  recentEventsWindow: 1 // Last hour only
});
```

### Important Memories Only

```typescript
const ctx = await buildGameContext(playerId, npcId, query, {
  memoryImportanceThreshold: 7 // High importance only
});
```

## Performance Tips

1. **Use Limits**: Restrict data retrieval with max* config options
2. **Filter by Importance**: Use memoryImportanceThreshold for critical memories
3. **Narrow Time Windows**: Reduce recentEventsWindow for recent context only
4. **Monitor Performance**: Check context.metadata.retrievalTimeMs

## Integration Patterns

### Pattern 1: Direct LLM Integration

```typescript
const ctx = await quickBuildContext(playerId, npcId, playerMsg);

const llmResponse = await openai.chat.completions.create({
  messages: [
    { role: 'system', content: `You are ${ctx.context.npc?.name}` },
    { role: 'system', content: ctx.formattedText },
    { role: 'user', content: playerMsg }
  ]
});
```

### Pattern 2: Token Management

```typescript
const ctx = await quickBuildContext(playerId, npcId, playerMsg);

if (ctx.estimatedTokens > 2000) {
  // Reduce context size
  const smallerCtx = await buildGameContext(playerId, npcId, playerMsg, {
    maxMemories: 3,
    maxLore: 2
  });
}
```

### Pattern 3: Cached Context

```typescript
const cacheKey = `context-${playerId}-${npcId}`;
let ctx = cache.get(cacheKey);

if (!ctx) {
  ctx = await buildGameContext(playerId, npcId, '');
  cache.set(cacheKey, ctx, 300); // 5 min TTL
}
```

## API Response Examples

### JSON Response (format: 'json')

```json
{
  "success": true,
  "context": {
    "player": {...},
    "npc": {...},
    "npcMemories": [...],
    "relevantLore": [...],
    "recentGameEvents": [...],
    "recentWorldEvents": [...],
    "metadata": {
      "timestamp": "2026-03-13T10:30:00Z",
      "retrievalTimeMs": 45,
      "stats": {...}
    }
  }
}
```

### Text Response (format: 'text')

```json
{
  "success": true,
  "context": {...},
  "formattedText": "=== GAME CONTEXT ===\n...",
  "estimatedTokens": 487
}
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Slow retrieval | Reduce max* limits |
| Missing data | Check player/NPC exist |
| Too many tokens | Lower limits, filter by importance |
| Wrong lore | Improve search query |
| Old events | Increase recentEventsWindow |

## Testing

```bash
# Run all context tests
npm test -- __tests__/context

# Specific tests
npm test -- __tests__/context-engine.test.ts
npm test -- __tests__/api/context-build.test.ts
npm test -- __tests__/context-performance.test.ts
```

## Performance Expectations

| Dataset | Expected Time |
|---------|---------------|
| Empty | < 10ms |
| Small | < 50ms |
| Medium | < 100ms |
| Large | < 200ms |

## Next Steps

1. **Try the demo**: `npx ts-node examples/context-engine-demo.ts`
2. **Read full docs**: See `docs/CONTEXT_ENGINE.md`
3. **Integrate with AI**: Use context in LLM prompts
4. **Customize config**: Tune for your use case

## Quick Reference

| Function | Purpose |
|----------|---------|
| `buildGameContext()` | Build complete context |
| `formatContextForAI()` | Format for LLM |
| `quickBuildContext()` | Build + format in one call |
| `extractSearchQuery()` | Clean search query |
| `validateConfig()` | Validate configuration |
| `benchmarkContextRetrieval()` | Performance testing |

## Support

- Full docs: `docs/CONTEXT_ENGINE.md`
- API reference: `app/api/context/build/route.ts`
- Examples: `examples/context-engine-demo.ts`
- Tests: `__tests__/context-*.test.ts`

---

**Ready to use in production!** ✅
