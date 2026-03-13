# Migration 001: Add Game Sessions Table

**Epic:** Epic 2 - Game Session Tracking
**GitHub Issue:** #5
**Date:** 2026-03-13
**Status:** Ready for Implementation

## Overview

This migration adds comprehensive game session tracking to the ZDBGame system. Sessions track player login/logout times, enable session-based analytics, and provide better telemetry for player engagement.

## Database Schema Changes

### New Table: `game_sessions`

```sql
CREATE TABLE game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP DEFAULT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'ended', 'timeout')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_game_sessions_player_id ON game_sessions(player_id);
CREATE INDEX idx_game_sessions_status ON game_sessions(status);
CREATE INDEX idx_game_sessions_started_at ON game_sessions(started_at);

-- Composite index for common query patterns
CREATE INDEX idx_game_sessions_player_status ON game_sessions(player_id, status);

-- Prevent multiple active sessions per player
CREATE UNIQUE INDEX idx_game_sessions_player_active
    ON game_sessions(player_id)
    WHERE status = 'active';
```

### Modified Table: `game_events`

```sql
-- Add session_id column to existing game_events table
ALTER TABLE game_events
ADD COLUMN session_id UUID REFERENCES game_sessions(id) ON DELETE SET NULL;

-- Add index for session-based event queries
CREATE INDEX idx_game_events_session_id ON game_events(session_id);

-- Composite index for player + session queries
CREATE INDEX idx_game_events_player_session ON game_events(player_id, session_id);
```

## Field Descriptions

### `game_sessions` Table

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | UUID | No | Unique session identifier |
| `player_id` | UUID | No | Foreign key to players table |
| `started_at` | TIMESTAMP | No | When the session started (ISO 8601) |
| `ended_at` | TIMESTAMP | Yes | When the session ended (null if active) |
| `status` | TEXT | No | Session status: 'active', 'ended', 'timeout' |
| `metadata` | JSONB | No | Optional metadata (device, IP, login method, etc.) |
| `created_at` | TIMESTAMP | No | Record creation timestamp |
| `updated_at` | TIMESTAMP | No | Record last update timestamp |

### Status Values

- **active**: Session is currently active, player is logged in
- **ended**: Session was explicitly ended by player logout
- **timeout**: Session was automatically ended due to inactivity

## Business Logic

### Session Creation
- A new session is created when a player logs in
- Only one active session per player is allowed
- If a player attempts to login with an existing active session, return the existing session or force logout

### Session Termination
- **Manual Logout**: Status set to 'ended', `ended_at` populated
- **Timeout**: Automatic cleanup after 30 minutes of inactivity, status set to 'timeout'
- **Force Logout**: Admin action, status set to 'ended'

### Event Association
- All new game events should include `session_id`
- For backward compatibility, `session_id` is optional
- Events without `session_id` are still valid (for legacy data)

## Data Constraints

1. **One Active Session Rule**: A player can only have one active session at a time
   - Enforced by unique partial index
   - Application layer validates before creation

2. **Foreign Key Integrity**:
   - `player_id` must reference valid player
   - `session_id` in events must reference valid session
   - Cascade delete: Deleting a player deletes their sessions
   - Set null: Deleting a session sets `session_id` to null in events

3. **Status Validation**: Status must be one of: 'active', 'ended', 'timeout'

4. **Temporal Integrity**:
   - `ended_at` must be >= `started_at` (if not null)
   - Active sessions must have `ended_at` as null

## Migration Strategy

### For File-Based Storage (Current Implementation)

The current implementation uses file-based storage. No SQL migration is needed.

#### File Structure
```
.data/
├── session_<uuid>.json     # Session files
├── game_event_<uuid>.json  # Event files (updated to include session_id)
└── ...
```

#### Session File Format
```json
{
  "id": "a50e8400-e29b-41d4-a716-446655440010",
  "playerId": "550e8400-e29b-41d4-a716-446655440000",
  "startedAt": "2024-03-12T10:00:00Z",
  "endedAt": null,
  "status": "active",
  "metadata": {}
}
```

#### Updated Event File Format
```json
{
  "id": "950e8400-e29b-41d4-a716-446655440004",
  "player_id": "550e8400-e29b-41d4-a716-446655440000",
  "session_id": "a50e8400-e29b-41d4-a716-446655440010",
  "event_type": "wolf_kill",
  "location": "Northern Forest",
  "metadata": {},
  "created_at": "2024-03-12T10:35:00Z"
}
```

### For ZeroDB (Future Implementation)

When migrating to ZeroDB, execute the SQL schema above.

#### Migration Steps

1. **Create Sessions Table**
   ```sql
   -- Run schema creation scripts above
   ```

2. **Update Events Table**
   ```sql
   ALTER TABLE game_events ADD COLUMN session_id UUID;
   CREATE INDEX idx_game_events_session_id ON game_events(session_id);
   ```

3. **Data Backfill (Optional)**
   - For existing events, session_id can remain null
   - Or create synthetic sessions based on event timestamps

4. **Add Constraints**
   ```sql
   ALTER TABLE game_events
   ADD CONSTRAINT fk_game_events_session
   FOREIGN KEY (session_id)
   REFERENCES game_sessions(id)
   ON DELETE SET NULL;
   ```

## Rollback Plan

### File-Based Storage
- Remove session files: `rm .data/session_*.json`
- Remove session_id from events (optional, backward compatible)

### ZeroDB
```sql
-- Remove foreign key
ALTER TABLE game_events DROP CONSTRAINT fk_game_events_session;

-- Remove column
ALTER TABLE game_events DROP COLUMN session_id;

-- Drop session table
DROP TABLE game_sessions;
```

## Testing Requirements

### Unit Tests
- ✅ Session creation
- ✅ Session retrieval
- ✅ Active session detection
- ✅ Session termination
- ✅ Timeout detection
- ✅ Multi-player sessions
- ✅ Session statistics

### Integration Tests
- API endpoint testing (create, get, end sessions)
- Event creation with session tracking
- Session timeout cleanup job

### Performance Tests
- Query performance with sessions table
- Index effectiveness
- Concurrent session creation

## API Impact

### New Endpoints

```
POST   /api/sessions              # Create session
GET    /api/sessions              # List sessions (with filters)
GET    /api/sessions/:id          # Get session details
PUT    /api/sessions/:id          # End session
DELETE /api/sessions/:id          # Delete session (admin)
POST   /api/sessions/timeout      # Timeout cleanup job
```

### Modified Endpoints

```
POST   /api/event/create-with-session   # Event creation with session tracking
```

## Security Considerations

1. **Session Hijacking Prevention**
   - Store session metadata (IP, user agent)
   - Validate session ownership before operations

2. **Timeout Configuration**
   - Default: 30 minutes
   - Configurable via environment variable

3. **Admin Operations**
   - Session deletion should be restricted to admins
   - Audit log for session terminations

## Monitoring and Analytics

### Key Metrics to Track
- Average session duration
- Sessions per player
- Timeout rate
- Concurrent active sessions
- Events per session

### Queries for Analytics

```sql
-- Average session duration
SELECT AVG(EXTRACT(EPOCH FROM (ended_at - started_at))) as avg_duration_seconds
FROM game_sessions
WHERE ended_at IS NOT NULL;

-- Active sessions count
SELECT COUNT(*) FROM game_sessions WHERE status = 'active';

-- Sessions by player
SELECT player_id, COUNT(*) as session_count
FROM game_sessions
GROUP BY player_id
ORDER BY session_count DESC;

-- Events per session
SELECT s.id, COUNT(e.id) as event_count
FROM game_sessions s
LEFT JOIN game_events e ON e.session_id = s.id
GROUP BY s.id;
```

## Implementation Checklist

- [x] Create session types and interfaces
- [x] Implement session management functions
- [x] Update GameEvent interface with session_id
- [x] Create session API endpoints
- [x] Create event creation endpoint with session tracking
- [x] Write comprehensive tests
- [x] Write migration documentation
- [ ] Deploy to staging environment
- [ ] Run integration tests
- [ ] Deploy to production
- [ ] Monitor session metrics

## References

- **PRD**: `/prd.md`
- **Data Model**: `/datamodel.md`
- **GitHub Issue**: https://github.com/PAIPalooza/AIGame-Master/issues/5
- **Sprint Plan**: `/sprintplan.md`

## Notes

This migration maintains backward compatibility by making `session_id` optional in game events. Existing events without sessions will continue to function normally.

For production deployment, consider:
- Session cleanup cron job (runs every 15 minutes)
- Session analytics dashboard
- Alert thresholds for unusual session patterns
- Session replay/debugging tools
