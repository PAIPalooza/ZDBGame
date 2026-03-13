# ZeroDB Database Migration Guide

Complete guide for setting up and managing the ZeroDB database schema for the AI-Native Game World Demo (Moonvale).

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Migration Files](#migration-files)
5. [Running Migrations](#running-migrations)
6. [Schema Documentation](#schema-documentation)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Overview

This migration system provides:

- **Idempotent migrations**: Safe to run multiple times
- **Automatic tracking**: Records all applied migrations
- **Performance optimized**: Comprehensive indexing strategy
- **Vector search support**: pgvector extension for AI-powered lore retrieval
- **Type-safe**: Aligned with TypeScript types in `/lib/types.ts`

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Application Layer                    │
│            (Next.js API Routes + Types)              │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                  ZeroDB Database                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐      │
│  │ players  │  │   npcs   │  │ npc_memories │      │
│  └──────────┘  └──────────┘  └──────────────┘      │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐      │
│  │   lore   │  │ game_events  │  │  world   │      │
│  │(pgvector)│  └──────────────┘  │ _events  │      │
│  └──────────┘                    └──────────┘      │
└─────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Required Software

1. **PostgreSQL 14+** (or ZeroDB-compatible database)
2. **psql** command-line client
3. **Node.js 18+** (for Node.js migration runner)

### Required Extensions

The migration automatically installs these PostgreSQL extensions:

- `vector` - pgvector for semantic search (1536-dimensional embeddings)
- `uuid-ossp` - UUID generation support

### Environment Configuration

Set your database connection string:

```bash
# For local development
export DATABASE_URL='postgresql://localhost:5432/zdbgame'

# For ZeroDB cloud
export DATABASE_URL='postgresql://user:password@your-zerodb-instance.com:5432/database'
```

**Security Note**: Never commit DATABASE_URL to version control. Use `.env.local` for local development.

---

## Quick Start

### Option 1: Using Bash Script (Recommended for Unix/Linux/macOS)

```bash
# Navigate to migrations directory
cd scripts/migrations

# Make script executable (first time only)
chmod +x run-migration.sh

# Run all migrations
./run-migration.sh

# Or run a specific migration
./run-migration.sh 001_initial_schema.sql
```

### Option 2: Using Node.js Script (Cross-platform)

```bash
# From project root
node scripts/migrations/run-migration.js

# Or run a specific migration
node scripts/migrations/run-migration.js 001_initial_schema.sql
```

### Option 3: Direct psql (Manual)

```bash
# Set DATABASE_URL first
export DATABASE_URL='postgresql://localhost:5432/zdbgame'

# Run migration
psql "${DATABASE_URL}" -f scripts/migrations/001_initial_schema.sql
```

---

## Migration Files

### Current Migrations

| File | Description | Tables Created |
|------|-------------|----------------|
| `001_initial_schema.sql` | Initial database schema | players, npcs, npc_memories, lore, game_events, world_events, player_feedback, assets |

### Migration Naming Convention

```
<number>_<description>.sql

Examples:
001_initial_schema.sql
002_add_player_achievements.sql
003_add_npc_dialogue_cache.sql
```

Migrations are executed in numerical order.

---

## Running Migrations

### First-Time Setup

1. **Start your PostgreSQL/ZeroDB instance**:
   ```bash
   # Local PostgreSQL
   brew services start postgresql@14  # macOS
   sudo systemctl start postgresql    # Linux

   # Or use Docker
   docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:14
   ```

2. **Create database** (if needed):
   ```bash
   createdb zdbgame
   ```

3. **Set environment variable**:
   ```bash
   export DATABASE_URL='postgresql://localhost:5432/zdbgame'
   ```

4. **Run migrations**:
   ```bash
   cd scripts/migrations
   ./run-migration.sh
   ```

### Verify Migration Success

Check the migrations table:

```sql
SELECT * FROM schema_migrations ORDER BY applied_at DESC;
```

Expected output:
```
 migration_file        | applied_at              | execution_time
-----------------------+-------------------------+----------------
 001_initial_schema.sql| 2026-03-13 10:30:00+00 | 245ms
```

### Check Table Creation

```sql
-- List all tables
\dt

-- Expected tables:
--   players
--   npcs
--   npc_memories
--   lore
--   game_events
--   world_events
--   player_feedback
--   assets
--   schema_migrations
```

---

## Schema Documentation

### Core Tables

#### 1. `players`

Stores persistent player character data.

```sql
CREATE TABLE players (
    id UUID PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    class TEXT,
    faction TEXT,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    inventory JSONB DEFAULT '[]',
    reputation INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

**Indexes**:
- `idx_players_username` - Fast username lookups
- `idx_players_class` - Filter by character class
- `idx_players_faction` - Filter by faction

#### 2. `npcs`

Non-player characters in the game world.

```sql
CREATE TABLE npcs (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    location TEXT,
    personality JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

**Indexes**:
- `idx_npcs_name` - Fast NPC name lookups
- `idx_npcs_location` - Query NPCs by location
- `idx_npcs_role` - Filter by NPC role

#### 3. `npc_memories`

**Core AI-native feature**: NPCs remember player interactions.

```sql
CREATE TABLE npc_memories (
    id UUID PRIMARY KEY,
    npc_id UUID REFERENCES npcs(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    memory TEXT NOT NULL,
    importance INTEGER CHECK (importance BETWEEN 1 AND 10),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE
);
```

**Indexes**:
- `idx_npc_memories_npc_player` - Composite index for NPC-Player lookups
- `idx_npc_memories_importance` - Query by importance (for memory retrieval)

**Usage Example**:
```sql
-- Store a memory: Player asked about Ember Tower
INSERT INTO npc_memories (npc_id, player_id, memory, importance)
VALUES (
    'elarin-uuid',
    'player-uuid',
    'Player asked about the Fall of Ember Tower',
    5
);
```

#### 4. `lore`

Vector-searchable game world knowledge.

```sql
CREATE TABLE lore (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    region TEXT,
    tags TEXT[],
    embedding VECTOR(1536),  -- OpenAI ada-002 compatible
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

**Indexes**:
- `idx_lore_embedding` - **IVFFlat vector index** for semantic search
- `idx_lore_tags` - GIN index for tag queries
- `idx_lore_region` - Filter by region

**Vector Search Example**:
```sql
-- Find similar lore entries (semantic search)
SELECT title, content
FROM lore
ORDER BY embedding <-> '[0.1, 0.2, ...]'::vector
LIMIT 5;
```

#### 5. `game_events`

Telemetry for all gameplay actions.

```sql
CREATE TABLE game_events (
    id UUID PRIMARY KEY,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    location TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE
);
```

**Common Event Types**:
- `npc_conversation`
- `explore`
- `wolf_kill`
- `help_village`
- `quest_complete`

**Indexes**:
- `idx_game_events_player_type` - Composite index for analytics
- `idx_game_events_event_type` - Filter by event type

#### 6. `world_events`

Emergent gameplay events triggered by player behavior.

```sql
CREATE TABLE world_events (
    id UUID PRIMARY KEY,
    event_name TEXT NOT NULL,
    description TEXT NOT NULL,
    trigger_source TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE
);
```

**Example Emergent Rule**:
```
IF (SELECT COUNT(*) FROM game_events
    WHERE event_type = 'wolf_kill' AND player_id = $1) >= 3
THEN
    INSERT INTO world_events (event_name, description, trigger_source)
    VALUES ('Wolf Pack Retreat', 'Wolf activity has decreased', 'player_actions');
```

#### 7. `player_feedback` (RLHF)

Collects player feedback for AI improvement.

```sql
CREATE TABLE player_feedback (
    id UUID PRIMARY KEY,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL,  -- 'npc_dialogue', 'lore', 'world_event'
    target_id UUID,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    feedback TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE
);
```

#### 8. `assets`

Player-generated content storage (optional).

```sql
CREATE TABLE assets (
    id UUID PRIMARY KEY,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    asset_type TEXT NOT NULL,  -- 'guild_banner', 'player_house', 'map'
    asset_url TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### Foreign Key Relationships

```
players (1) ─────< (N) npc_memories
npcs (1) ────────< (N) npc_memories
players (1) ─────< (N) game_events
players (1) ─────< (N) player_feedback
players (1) ─────< (N) assets
```

All foreign keys use `ON DELETE CASCADE` for automatic cleanup.

---

## Troubleshooting

### Common Issues

#### 1. "DATABASE_URL not set"

**Solution**:
```bash
export DATABASE_URL='postgresql://localhost:5432/zdbgame'
```

Add to `~/.bashrc` or `~/.zshrc` for persistence.

#### 2. "psql: command not found"

**Solution**:
```bash
# macOS
brew install postgresql@14

# Ubuntu/Debian
sudo apt-get install postgresql-client

# RHEL/CentOS
sudo yum install postgresql
```

#### 3. "Extension 'vector' not found"

**Solution**: Install pgvector extension:

```bash
# macOS
brew install pgvector

# From source
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
make install
```

Then run:
```sql
CREATE EXTENSION vector;
```

#### 4. "Connection refused"

**Solution**:
```bash
# Check if PostgreSQL is running
pg_isready

# Start PostgreSQL
brew services start postgresql@14  # macOS
sudo systemctl start postgresql    # Linux
```

#### 5. "Migration already applied"

This is **expected behavior**. Migrations are idempotent and safe to run multiple times.

To force re-run (not recommended):
```sql
DELETE FROM schema_migrations WHERE migration_file = '001_initial_schema.sql';
```

### Debugging

#### Enable verbose logging:

```bash
# Bash script
PGOPTIONS='--client-min-messages=notice' ./run-migration.sh

# Direct psql
psql "${DATABASE_URL}" -f 001_initial_schema.sql -v ON_ERROR_STOP=1 --echo-all
```

#### Check migration status:

```sql
SELECT
    migration_file,
    applied_at,
    execution_time_ms || 'ms' as duration
FROM schema_migrations
ORDER BY applied_at DESC;
```

---

## Best Practices

### 1. Always Use Migrations

**Never** manually modify the database schema. Always create a new migration file.

### 2. Test Migrations Locally First

```bash
# Create test database
createdb zdbgame_test

# Test migration
DATABASE_URL='postgresql://localhost:5432/zdbgame_test' ./run-migration.sh

# Drop test database
dropdb zdbgame_test
```

### 3. Backup Before Migration

```bash
# Backup database
pg_dump "${DATABASE_URL}" > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore if needed
psql "${DATABASE_URL}" < backup_20260313_103000.sql
```

### 4. Version Control

All migration files are tracked in Git. Never modify existing migrations after they've been deployed.

### 5. Rollback Strategy

For complex migrations, create both `up` and `down` migrations:

```
002_add_achievements_up.sql
002_add_achievements_down.sql
```

### 6. Index Creation

- Create indexes **after** data insertion for better performance
- Use `CONCURRENTLY` for production (requires separate transaction):
  ```sql
  CREATE INDEX CONCURRENTLY idx_name ON table(column);
  ```

---

## Development Workflow

### Adding a New Migration

1. **Create migration file**:
   ```bash
   cd scripts/migrations
   touch 002_add_player_achievements.sql
   ```

2. **Write idempotent SQL**:
   ```sql
   -- Use IF NOT EXISTS
   CREATE TABLE IF NOT EXISTS player_achievements (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       player_id UUID REFERENCES players(id) ON DELETE CASCADE,
       achievement_name TEXT NOT NULL,
       unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Use IF NOT EXISTS for indexes
   CREATE INDEX IF NOT EXISTS idx_achievements_player
       ON player_achievements(player_id);
   ```

3. **Test locally**:
   ```bash
   ./run-migration.sh 002_add_player_achievements.sql
   ```

4. **Verify**:
   ```sql
   \d player_achievements
   SELECT * FROM schema_migrations;
   ```

5. **Commit**:
   ```bash
   git add scripts/migrations/002_add_player_achievements.sql
   git commit -m "Add player achievements table"
   ```

---

## Integration with Application

### TypeScript Types

Update `/lib/types.ts` to match schema changes:

```typescript
export interface PlayerAchievement {
    id: string;
    playerId: string;
    achievementName: string;
    unlockedAt: string;
}
```

### Database Connection

Example using `pg` library:

```typescript
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Query example
const result = await pool.query(
    'SELECT * FROM players WHERE username = $1',
    ['TobyTheExplorer']
);
```

---

## Monitoring and Maintenance

### Performance Monitoring

```sql
-- Check index usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

### Table Size Monitoring

```sql
-- Check table sizes
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Vacuum and Analyze

```bash
# Regular maintenance
psql "${DATABASE_URL}" -c "VACUUM ANALYZE;"
```

---

## Additional Resources

- **pgvector documentation**: https://github.com/pgvector/pgvector
- **PostgreSQL Best Practices**: https://wiki.postgresql.org/wiki/Don't_Do_This
- **ZeroDB Documentation**: (Add your ZeroDB-specific docs link)
- **Project Data Model**: `/datamodel.md`
- **TypeScript Types**: `/lib/types.ts`

---

## Support

For issues or questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review migration logs in `schema_migrations` table
3. Open an issue on GitHub: https://github.com/PAIPalooza/AIGame-Master/issues

---

**Last Updated**: 2026-03-13
**Migration Version**: 001
**Database Schema Version**: 1.0
