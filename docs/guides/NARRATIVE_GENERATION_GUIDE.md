# AI Game Master Narrative Generation Guide

**Issue #9: Epic 4 - Narrative Generation**

This guide documents the AI-powered narrative generation system for the AI Game Master.

---

## Overview

The narrative generation system uses **Anthropic Claude** (via AIKit) to create dynamic, context-aware narratives in response to player actions. The system:

- Retrieves relevant game context (lore, memories, events)
- Generates structured narrative responses
- Logs all narratives for history tracking
- Provides rich, immersive storytelling

---

## Architecture

### Components

1. **Context Retrieval Engine** (`lib/context-retrieval.ts`)
   - Gathers player data, lore, NPC memories, world events
   - Formats context for AI consumption

2. **AIKit Integration** (`lib/aikit.ts`)
   - Interfaces with Anthropic Claude API
   - Handles prompt engineering
   - Parses structured responses

3. **Narrative Logging** (`lib/narrative-log.ts`)
   - Persists all narrative interactions
   - Enables history tracking and analytics

4. **API Endpoint** (`app/api/gm/action/route.ts`)
   - Orchestrates the narrative generation flow
   - Handles errors gracefully

---

## API Reference

### POST /api/gm/action

Generate an AI narrative response to a player action.

**Request Body:**

```json
{
  "playerId": "550e8400-e29b-41d4-a716-446655440000",
  "action": "Explore the northern forest",
  "location": "Northern Forest"
}
```

**Fields:**

- `playerId` (required): UUID of the player performing the action
- `action` (required): Description of the player's action
- `location` (optional): Current location context

**Response (200 OK):**

```json
{
  "narrative": {
    "locationDescription": "You stand at the edge of the Northern Forest...",
    "actionOutcome": "As you step into the woods, the canopy above...",
    "worldReaction": "The forest seems to watch your every move...",
    "questHooks": [
      "You notice fresh wolf tracks leading deeper into the forest",
      "A faint light glimmers in the distance"
    ],
    "fullNarrative": "Combined narrative text..."
  },
  "narrativeLogId": "c50e8400-e29b-41d4-a716-446655440007",
  "contextUsed": {
    "player": { ... },
    "loreEntries": [ ... ],
    "npcMemories": [ ... ],
    "worldEvents": [ ... ],
    "recentEvents": [ ... ]
  }
}
```

**Error Responses:**

- `400 Bad Request`: Missing required fields
- `500 Internal Server Error`: Context retrieval or AI generation failed

---

## Usage Examples

### Example 1: Basic Action

```typescript
const response = await fetch('/api/gm/action', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    playerId: 'player-uuid',
    action: 'Investigate the old tower',
    location: 'Ember Tower Ruins'
  })
});

const data = await response.json();
console.log(data.narrative.fullNarrative);
```

### Example 2: Combat Action

```typescript
const response = await fetch('/api/gm/action', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    playerId: 'player-uuid',
    action: 'Attack the wolf with my sword',
    location: 'Northern Forest'
  })
});

const data = await response.json();
// AI generates combat narrative with outcome
```

### Example 3: Social Interaction

```typescript
const response = await fetch('/api/gm/action', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    playerId: 'player-uuid',
    action: 'Ask Elarin about the ancient prophecy',
    location: 'Moonvale'
  })
});

const data = await response.json();
// AI references NPC memories and lore
```

---

## Prompt Engineering

### System Prompt

The AI Game Master uses a carefully crafted system prompt that defines:

- **Role**: AI Game Master for Moonvale
- **Narrative Style**: Second person, descriptive, atmospheric
- **Response Format**: Structured JSON with specific fields
- **Constraints**: Grounded in lore, acknowledges memory

See `lib/aikit.ts` for the full system prompt.

### User Prompt Template

For each action, the system constructs a user prompt with:

```
PLAYER: [name], a level [X] [class]
LOCATION: [location]
ACTION: [player action]

WORLD LORE:
[relevant lore entries]

NPC MEMORIES:
[what NPCs remember about this player]

WORLD STATE:
[recent world events]

RECENT PLAYER ACTIONS:
[last 10 actions]
```

This ensures the AI has full context for generating appropriate narratives.

---

## Context Retrieval

The context retrieval engine gathers:

### 1. Player Data
- Username, class, level, XP
- Current state and progression

### 2. Relevant Lore (Max 5 entries)
- Keyword-based search on action + location
- Can be upgraded to semantic vector search

### 3. NPC Memories (Max 10)
- Memories from all NPCs about this player
- Sorted by importance

### 4. World Events (Last 5)
- Recent global events
- Triggered by player actions

### 5. Recent Events (Last 10)
- Player's recent actions
- Provides continuity

---

## Narrative Logging

All narratives are logged to `.data/narrative_log_[id].json`:

```json
{
  "id": "c50e8400-e29b-41d4-a716-446655440007",
  "playerId": "550e8400-e29b-41d4-a716-446655440000",
  "playerAction": "Explore the northern forest",
  "gmResponse": "Full narrative text...",
  "contextUsed": { ... },
  "createdAt": "2024-03-12T11:00:00Z"
}
```

### Retrieval Functions

```typescript
import {
  getNarrativeLog,
  getPlayerNarrativeLogs,
  getAllNarrativeLogs,
  getNarrativeLogStats
} from '@/lib/narrative-log';

// Get specific log
const log = getNarrativeLog(narrativeId);

// Get all logs for a player
const playerLogs = getPlayerNarrativeLogs(playerId, 50);

// Get statistics
const stats = getNarrativeLogStats();
```

---

## Testing

### Run Tests

```bash
npm test narrative-generation.test.ts
npm test api/gm-action.test.ts
```

### Test Coverage

The test suite validates:

1. **Context Retrieval**
   - Fetches player data correctly
   - Retrieves relevant lore
   - Includes NPC memories
   - Captures world events

2. **Narrative Logging**
   - Saves logs atomically
   - Retrieves by ID
   - Filters by player
   - Generates statistics

3. **API Endpoint**
   - Validates request structure
   - Handles missing fields
   - Returns correct response format
   - Handles errors gracefully

### Sample Test Narrative

The system includes a `generateTestNarrative()` function for testing without API calls:

```typescript
import { generateTestNarrative } from '@/lib/aikit';

const mockContext = {
  player: { ... },
  location: 'Moonvale',
  loreEntries: [],
  npcMemories: [],
  worldEvents: [],
  recentEvents: []
};

const narrative = generateTestNarrative('explore the ruins', mockContext);
```

---

## Configuration

### Environment Variables

Required in `.env`:

```bash
AINATIVE_API_URL=https://api.ainative.studio/
AINATIVE_API_TOKEN=your-token-here
```

### AIKit Configuration

Default settings in `lib/aikit.ts`:

```typescript
{
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0.7,
  maxTokens: 1000
}
```

Adjust these for different narrative styles:
- Lower temperature (0.3-0.5): More consistent, predictable
- Higher temperature (0.7-0.9): More creative, varied
- More tokens (1500+): Longer, more detailed narratives

---

## Best Practices

### 1. Action Descriptions

**Good:**
- "Search the ruins for magical artifacts"
- "Confront the bandit leader about the stolen goods"
- "Climb the ancient oak tree to scout ahead"

**Bad:**
- "Do something" (too vague)
- "Use my +5 Sword of Ultimate Power to one-shot the dragon" (too specific)

### 2. Location Context

Always provide location when available:
```typescript
{
  action: "Search for clues",
  location: "Ember Tower Ruins"  // Provides better context
}
```

### 3. Error Handling

The system includes graceful fallbacks:
- If AI generation fails, returns a generic narrative
- If logging fails, continues with response
- All errors are logged for debugging

---

## Narrative Response Structure

### Location Description
Brief atmospheric description of the current setting.

**Example:**
> "You stand at the edge of the Northern Forest, where ancient trees tower overhead and shadows dance between gnarled roots."

### Action Outcome
What happens as a direct result of the player's action.

**Example:**
> "As you venture deeper into the woods, your ranger training helps you spot fresh wolf tracks in the soft earth. The tracks are large—larger than any wolf you've seen before."

### World Reaction
How the environment, NPCs, or creatures respond.

**Example:**
> "The forest grows quiet around you. Birds stop chirping, and even the wind seems to hold its breath. Something is watching you from the shadows."

### Quest Hooks
Potential opportunities or leads for future actions.

**Examples:**
```json
[
  "The wolf tracks lead toward an old hunter's cabin",
  "You hear a child's voice calling for help in the distance",
  "A glint of metal catches your eye near a fallen tree"
]
```

---

## Future Enhancements

### Planned Improvements

1. **Vector Search Integration**
   - Upgrade from keyword to semantic lore retrieval
   - Better context matching

2. **Dynamic Quest Generation**
   - AI generates quest objectives from quest hooks
   - Persistent quest tracking

3. **Relationship Tracking**
   - NPC relationships affect narrative tone
   - Trust, fear, respect influence reactions

4. **Multi-turn Conversations**
   - Maintain conversation context
   - Enable deeper NPC interactions

5. **Narrative Analytics**
   - Track popular actions
   - Identify effective quest hooks
   - Measure player engagement

---

## Troubleshooting

### AI Generation Fails

**Issue:** 500 error from `/api/gm/action`

**Solutions:**
1. Check AIKit credentials in `.env`
2. Verify API token is valid
3. Check AIKit API status
4. Review server logs for details

### Context Retrieval Issues

**Issue:** Empty or incorrect context

**Solutions:**
1. Ensure player exists in database
2. Verify lore entries are seeded
3. Check data directory permissions
4. Run data seed script

### Narrative Logging Fails

**Issue:** Logs not being saved

**Solutions:**
1. Check `.data/` directory exists
2. Verify write permissions
3. Check disk space
4. Review file system errors in logs

---

## Related Documentation

- **PRD**: `/prd.md`
- **Data Model**: `/datamodel.md`
- **Backlog**: `/backlog.md` (Epic 4)
- **API Reference**: `/COMPLETE_API_REFERENCE.md`

---

## Support

For issues or questions:
- Create a GitHub issue with label `narrative-generation`
- Include error logs and request/response examples
- Provide context about player state and action

---

**Last Updated:** 2026-03-13
**Issue:** #9
**Status:** ✅ Complete
