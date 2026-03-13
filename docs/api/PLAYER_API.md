# Player API Documentation

## Overview

The Player API provides endpoints for creating and managing player accounts in the ZDBGame system. All player data is stored in ZeroDB with proper validation and error handling.

**Base URL**: `/api/player`

**Version**: 1.0

**Last Updated**: 2026-03-13

---

## Endpoints

### POST /api/player/create

Creates a new player with default attributes and profile.

#### Request

```http
POST /api/player/create
Content-Type: application/json
```

**Body**: None (uses default demo player configuration)

#### Response

**Success (201 Created)**

```json
{
  "success": true,
  "player": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "TobyTheExplorer",
    "class": "Ranger",
    "faction": "Forest Guild",
    "level": 1,
    "xp": 0,
    "inventory": [],
    "reputation": 0,
    "created_at": "2026-03-13T10:30:00.000Z"
  }
}
```

**Error (400 Bad Request) - Validation Error**

```json
{
  "success": false,
  "error": "Failed to create player",
  "details": "Username is required"
}
```

**Error (500 Internal Server Error)**

```json
{
  "success": false,
  "error": "Failed to create player",
  "details": "Database connection error"
}
```

#### Player Object Schema

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `id` | string (UUID) | Unique player identifier | Auto-generated |
| `username` | string | Player's display name | "TobyTheExplorer" |
| `class` | string | Character class (e.g., Ranger, Warrior, Mage) | "Ranger" |
| `faction` | string | Player's faction affiliation | "Forest Guild" |
| `level` | number | Current level (min: 1) | 1 |
| `xp` | number | Experience points (min: 0) | 0 |
| `inventory` | array | List of items (string array) | [] |
| `reputation` | number | Reputation score | 0 |
| `created_at` | string (ISO 8601) | Creation timestamp | Auto-generated |

#### Business Rules

1. **Player Creation**:
   - Each player receives a unique UUID v4 identifier
   - Default profile includes empty inventory and zero reputation
   - Username and class are required fields
   - Level must be at least 1
   - XP cannot be negative

2. **Data Persistence**:
   - All player data is stored in ZeroDB `players` table
   - Creation timestamp is automatically set to current UTC time
   - Inventory is stored as JSONB array

3. **Validation**:
   - Username cannot be empty or whitespace-only
   - Class must be a non-empty string
   - Numeric fields (level, xp, reputation) must be valid integers

#### Example Usage

```javascript
// Create a new player
const response = await fetch('/api/player/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
});

const data = await response.json();

if (data.success) {
  console.log('Player created:', data.player);
  console.log('Player ID:', data.player.id);
} else {
  console.error('Failed to create player:', data.error);
}
```

#### cURL Example

```bash
curl -X POST http://localhost:3000/api/player/create \
  -H "Content-Type: application/json"
```

---

### GET /api/player/current

Retrieves the most recently created player.

#### Request

```http
GET /api/player/current
```

**Query Parameters**: None

#### Response

**Success (200 OK)**

```json
{
  "success": true,
  "player": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "TobyTheExplorer",
    "class": "Ranger",
    "faction": "Forest Guild",
    "level": 1,
    "xp": 0,
    "inventory": [],
    "reputation": 0,
    "created_at": "2026-03-13T10:30:00.000Z"
  }
}
```

**Not Found (404)**

```json
{
  "success": false,
  "error": "No player found",
  "message": "Please create a player first"
}
```

**Error (500 Internal Server Error)**

```json
{
  "success": false,
  "error": "Failed to get current player",
  "details": "Database query failed"
}
```

#### Business Rules

1. **Player Selection**:
   - Returns the player with the most recent `created_at` timestamp
   - If multiple players exist, only the newest is returned
   - If no players exist, returns 404 error

2. **Response Format**:
   - Always includes a `success` boolean field
   - On success, includes complete player object
   - On error, includes error message and details

#### Example Usage

```javascript
// Get the current player
const response = await fetch('/api/player/current');
const data = await response.json();

if (data.success) {
  console.log('Current player:', data.player);
} else if (response.status === 404) {
  console.log('No player exists yet');
} else {
  console.error('Error:', data.error);
}
```

#### cURL Example

```bash
curl http://localhost:3000/api/player/current
```

---

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": "Short error description",
  "details": "Detailed error message (optional)"
}
```

### Common Error Codes

| Status Code | Description | Common Causes |
|-------------|-------------|---------------|
| 200 | Success | Request completed successfully |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input data, validation failure |
| 404 | Not Found | Resource does not exist |
| 500 | Internal Server Error | Database error, system error |

### Error Types

1. **Validation Errors (400)**:
   - Empty or invalid username
   - Invalid class name
   - Negative XP or level < 1
   - Invalid data types

2. **Not Found Errors (404)**:
   - No players exist in database
   - Player ID not found

3. **Server Errors (500)**:
   - Database connection failure
   - Query execution error
   - Unexpected system error

---

## Data Storage

### ZeroDB Schema

```sql
CREATE TABLE players (
    id UUID PRIMARY KEY,
    username TEXT NOT NULL,
    class TEXT,
    faction TEXT,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    inventory JSONB DEFAULT '[]',
    reputation INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Indexes

- Primary key on `id` (UUID)
- Automatic index on `created_at` for sorting

### Data Integrity

- **Foreign Key Constraints**: Player ID referenced by:
  - `game_events.player_id`
  - `npc_memories.player_id`

- **Validation Constraints**:
  - `username` NOT NULL
  - `level` >= 1
  - `xp` >= 0

---

## Testing

### Unit Tests

Location: `/__tests__/api/player.test.ts`

```bash
# Run player API tests
npm test -- __tests__/api/player.test.ts
```

### Test Coverage

- Player creation with valid data
- Player creation with default values
- Unique ID generation
- Data persistence verification
- Current player retrieval
- Error handling for missing players
- All player attributes present in response

### Mock Implementation

For testing and development without ZeroDB configured, the system uses an in-memory mock implementation that:
- Stores data in JavaScript Maps
- Supports all CRUD operations
- Clears data between tests
- Provides consistent behavior

---

## Security Considerations

### Input Validation

1. **SQL Injection Prevention**:
   - All queries use parameterized statements
   - No direct string concatenation in SQL
   - Input sanitization for all user data

2. **Data Validation**:
   - Type checking for all inputs
   - Range validation for numeric fields
   - String length limits enforced

3. **Error Messages**:
   - Generic error messages to clients
   - Detailed errors logged server-side only
   - No sensitive data in error responses

### Authentication

**Current State**: No authentication required (demo mode)

**Future Implementation**:
- Player creation will require authentication
- API keys for rate limiting
- Session-based player access control

---

## Rate Limiting

**Current State**: No rate limiting implemented

**Recommended Limits** (for production):
- Player creation: 1 request per minute per IP
- Player queries: 100 requests per minute per IP

---

## Versioning

**Current Version**: 1.0

**Backward Compatibility**:
- API maintains backward compatibility
- New fields added as optional
- Deprecated fields maintained for 2 versions

**Migration Path**:
- File storage (`lib/data.ts`) → ZeroDB (`lib/zerodb.ts`)
- All existing tests pass with new implementation
- No changes required to client code

---

## Dependencies

### Required Packages

- `next` (^16.1.6): Next.js framework
- `typescript` (^5.9.3): Type safety

### Environment Variables

```bash
# Required for production
AINATIVE_API_URL=https://api.ainative.studio/
AINATIVE_API_TOKEN=your_api_token_here

# Optional
NODE_ENV=development  # Uses mock storage if not 'production'
```

---

## References

- **PRD**: [/prd.md](/prd.md)
- **Data Model**: [/datamodel.md](/datamodel.md)
- **GitHub Issue**: [#3](https://github.com/PAIPalooza/AIGame-Master/issues/3)
- **ZeroDB Schema**: See Data Model documentation

---

## Changelog

### Version 1.0 (2026-03-13)

#### Added
- POST `/api/player/create` endpoint
- GET `/api/player/current` endpoint
- ZeroDB integration
- Input validation and error handling
- Mock storage for testing
- Comprehensive test coverage

#### Changed
- Migrated from file storage to ZeroDB
- Updated response format with `success` field
- Enhanced error messages with details

#### Fixed
- Async/await support for database operations
- Proper error propagation
- Test compatibility with async operations

---

## Support

For questions or issues:
- **GitHub Issues**: https://github.com/PAIPalooza/AIGame-Master/issues
- **Documentation**: See `/docs` directory
- **Tests**: See `/__tests__` directory
