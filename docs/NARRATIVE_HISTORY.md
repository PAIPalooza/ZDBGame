# Narrative History Storage System

**Epic 4: Narrative History Storage**
**Issue: #10**

## Overview

The Narrative History Storage System provides comprehensive tracking of all player-GM interactions in the AI-Native Game World demo. It stores player inputs, GM responses, and rich context metadata including lore retrieval and memory usage.

## Architecture

### Components

1. **Data Layer** (`lib/data.ts`)
   - File-based storage with indexed filenames for performance
   - CRUD operations for narrative logs
   - Optimized querying by player ID and NPC ID

2. **Service Layer** (`lib/narrative.ts`)
   - High-level API for narrative logging
   - Statistics and analytics functions
   - Story export functionality

3. **API Endpoints** (`app/api/narrative/`)
   - RESTful endpoints for narrative history retrieval
   - Pagination support
   - Search functionality

4. **Type Definitions** (`lib/types.ts`)
   - TypeScript interfaces for type safety
   - Runtime type guards

## Data Model

### NarrativeLog Interface

```typescript
interface NarrativeLog {
  id: string;                          // UUID v4
  playerId: string;                    // Player who made the input
  npcId?: string;                      // NPC involved (optional)
  playerInput: string;                 // Player's message
  gmResponse: string;                  // GM/NPC's response
  contextMetadata: NarrativeContextMetadata;
  createdAt: string;                   // ISO 8601 timestamp
}
```

### Context Metadata

```typescript
interface NarrativeContextMetadata {
  loreRetrieved: string[];            // IDs of lore entries used
  memoriesUsed: string[];             // IDs of memories referenced
  responseTime?: number;              // Response time in milliseconds
  npcName?: string;                   // NPC name for display
  location?: string;                  // Location of interaction
  additional?: Record<string, any>;   // Arbitrary metadata
}
```

## File Storage

### Indexed Filename Pattern

For optimal performance, narrative logs use indexed filenames:

```
narrative_log_{playerId}_{npcId}_{timestamp}_{id}.json
```

**Example:**
```
narrative_log_player-123_npc-456_1640995200000_uuid-here.json
```

### Benefits

- **Filesystem-level filtering**: Filter by player/NPC without loading files
- **Backward compatible**: Falls back to legacy format if needed
- **Performance**: Reduces I/O operations for large datasets

## API Reference

### Endpoints

#### GET /api/narrative

Get narrative logs for a player with pagination and search.

**Query Parameters:**
- `playerId` (required): Player ID
- `limit` (optional, default: 20): Logs per page (max: 100)
- `offset` (optional, default: 0): Pagination offset
- `search` (optional): Search term for filtering

**Example:**
```bash
GET /api/narrative?playerId=player-123&limit=10&offset=0
GET /api/narrative?playerId=player-123&search=ember tower
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "playerId": "player-123",
      "npcId": "npc-456",
      "playerInput": "Tell me about Ember Tower",
      "gmResponse": "The tower collapsed long ago...",
      "contextMetadata": {
        "loreRetrieved": ["lore-1"],
        "memoriesUsed": [],
        "responseTime": 45,
        "npcName": "Elarin",
        "location": "Moonvale"
      },
      "createdAt": "2024-03-12T10:45:00Z"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "pageSize": 10,
    "hasMore": true
  }
}
```

#### GET /api/narrative/conversation

Get conversation history between NPC and player.

**Query Parameters:**
- `playerId` (required): Player ID
- `npcId` (required): NPC ID
- `limit` (optional, default: 20): Number of messages (max: 100)

**Example:**
```bash
GET /api/narrative/conversation?playerId=player-123&npcId=npc-456&limit=10
```

#### GET /api/narrative/stats

Get narrative statistics for a player.

**Query Parameters:**
- `playerId` (required): Player ID

**Response:**
```json
{
  "success": true,
  "data": {
    "playerId": "player-123",
    "totalInteractions": 42,
    "uniqueNPCsInteracted": 3,
    "uniqueNPCsList": ["npc-1", "npc-2", "npc-3"],
    "totalLoreRetrieved": 15,
    "averageResponseTime": 125
  }
}
```

#### GET /api/narrative/export

Export complete player story.

**Query Parameters:**
- `playerId` (required): Player ID

**Response:**
```json
{
  "success": true,
  "data": {
    "playerId": "player-123",
    "totalInteractions": 42,
    "logs": [
      {
        "timestamp": "2024-03-12T10:45:00Z",
        "playerInput": "Tell me about Ember Tower",
        "gmResponse": "The tower collapsed long ago...",
        "npcName": "Elarin",
        "location": "Moonvale"
      }
    ]
  }
}
```

## Service Layer Functions

### logNarrativeInteraction

Log a narrative interaction with full context.

```typescript
import { logNarrativeInteraction } from '@/lib/narrative';

const log = logNarrativeInteraction({
  playerId: 'player-123',
  npcId: 'npc-456',
  playerInput: 'Hello',
  gmResponse: 'Greetings, traveler!',
  loreUsed: [emberTowerLore],
  memoriesReferenced: [memory1],
  responseTime: 100,
  npcName: 'Elarin',
  location: 'Moonvale'
});
```

### getPlayerNarrativeHistory

Get paginated narrative history for a player.

```typescript
import { getPlayerNarrativeHistory } from '@/lib/narrative';

const history = getPlayerNarrativeHistory({
  playerId: 'player-123',
  limit: 20,
  offset: 0,
  searchTerm: 'ember tower' // Optional
});
```

### getNPCConversationHistory

Get conversation history between NPC and player.

```typescript
import { getNPCConversationHistory } from '@/lib/narrative';

const conversation = getNPCConversationHistory(
  'npc-456',
  'player-123',
  10
);
```

### getRecentNarrativeContext

Get recent interactions for context.

```typescript
import { getRecentNarrativeContext } from '@/lib/narrative';

const recentContext = getRecentNarrativeContext('player-123', 5);
```

### getNarrativeStats

Get narrative statistics for a player.

```typescript
import { getNarrativeStats } from '@/lib/narrative';

const stats = getNarrativeStats('player-123');
// Returns: totalInteractions, uniqueNPCs, totalLoreRetrieved, averageResponseTime
```

### exportPlayerStory

Export complete player story.

```typescript
import { exportPlayerStory } from '@/lib/narrative';

const story = exportPlayerStory('player-123');
```

## Data Layer Functions

### saveNarrativeLog

Save a narrative log with indexed filename.

```typescript
import { saveNarrativeLog } from '@/lib/data';

const log = saveNarrativeLog({
  player_id: 'player-123',
  npc_id: 'npc-456',
  player_input: 'Hello',
  gm_response: 'Greetings!',
  context_metadata: {
    lore_retrieved: ['lore-1'],
    memories_used: ['mem-1'],
    response_time: 100,
    npc_name: 'Elarin',
    location: 'Moonvale'
  }
});
```

### getNarrativeLogsByPlayer

Get all logs for a player with pagination.

```typescript
import { getNarrativeLogsByPlayer } from '@/lib/data';

const logs = getNarrativeLogsByPlayer('player-123', 20, 0);
```

### searchNarrativeLogs

Search logs by content.

```typescript
import { searchNarrativeLogs } from '@/lib/data';

const results = searchNarrativeLogs('player-123', 'ember tower', 10);
```

## Performance Optimization

### Indexed Filenames

The system uses indexed filenames to optimize queries:

1. **Filesystem-level filtering**: Filter files by pattern before loading JSON
2. **Reduced I/O**: Only load relevant files
3. **Backward compatibility**: Falls back to content-based filtering for old files

### Performance Metrics

Based on testing with 100 concurrent log creations:
- All logs created successfully
- Unique IDs guaranteed
- No data corruption
- Handles large histories efficiently

### Pagination

- Default page size: 20 logs
- Maximum page size: 100 logs
- Offset-based pagination supported

## Integration with NPC Talk Endpoint

The NPC talk endpoint automatically logs all interactions:

```typescript
// app/api/npc/talk/route.ts
import { logNarrativeInteraction } from '@/lib/narrative';

export async function POST(request: Request) {
  const startTime = Date.now();

  // ... generate NPC response ...

  const responseTime = Date.now() - startTime;

  // Automatic narrative logging
  logNarrativeInteraction({
    playerId,
    npcId: elarin.id,
    playerInput: message,
    gmResponse: response.response,
    loreUsed: response.loreUsed,
    memoriesReferenced: response.memoriesReferenced,
    responseTime,
    npcName: 'Elarin',
    location: 'Moonvale'
  });

  return NextResponse.json({ response });
}
```

## Testing

### Test Coverage

- **33 tests** covering all functionality
- **100% pass rate**
- Coverage includes:
  - CRUD operations
  - Pagination
  - Search functionality
  - Statistics calculation
  - Edge cases and error handling
  - Performance scenarios

### Running Tests

```bash
npm test -- narrative.test.ts
```

### Test Categories

1. **Storage Tests**: Save, retrieve, update operations
2. **Query Tests**: Filtering, pagination, search
3. **Service Tests**: High-level API functions
4. **Performance Tests**: Concurrent operations, large datasets
5. **Edge Cases**: Empty data, special characters, long inputs

## Security Considerations

1. **Input Validation**: All API endpoints validate parameters
2. **SQL Injection**: N/A (file-based storage)
3. **XSS Prevention**: Client should sanitize output
4. **Rate Limiting**: Recommended for production
5. **Access Control**: Implement player-based authorization

## Future Enhancements

1. **Vector Search**: Semantic search across narrative history
2. **Analytics Dashboard**: Visualize narrative patterns
3. **Compression**: Archive old narrative logs
4. **Real-time Updates**: WebSocket support for live updates
5. **Export Formats**: PDF, Markdown, JSON exports

## Troubleshooting

### Common Issues

**Issue**: Logs not appearing in queries
- **Solution**: Check player ID matches exactly (case-sensitive)

**Issue**: Slow queries with many logs
- **Solution**: Use pagination with smaller page sizes

**Issue**: Duplicate logs
- **Solution**: Ensure unique log IDs (handled automatically)

## References

- Epic 4: Narrative History Storage
- GitHub Issue: #10
- Data Model: `/datamodel.md`
- PRD: `/prd.md`

## Change Log

### v1.0.0 (2024-03-13)
- Initial implementation
- File-based storage with indexed filenames
- API endpoints for retrieval
- Comprehensive test suite
- Performance optimizations
- Integration with NPC talk endpoint
