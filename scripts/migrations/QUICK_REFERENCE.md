# Quick Reference Guide - Database Operations

Common database commands and queries for the ZDBGame project.

## Connection

```bash
# Set connection string
export DATABASE_URL='postgresql://localhost:5432/zdbgame'

# Connect to database
psql "${DATABASE_URL}"
```

## Migration Commands

```bash
# Run all migrations
./scripts/migrations/run-migration.sh

# Run specific migration
./scripts/migrations/run-migration.sh 001_initial_schema.sql

# Validate schema
psql "${DATABASE_URL}" -f scripts/migrations/validate-schema.sql

# Check migration status
psql "${DATABASE_URL}" -c "SELECT * FROM schema_migrations ORDER BY applied_at DESC;"
```

## Common Queries

### Players

```sql
-- Get all players
SELECT * FROM players ORDER BY created_at DESC;

-- Get player by username
SELECT * FROM players WHERE username = 'TobyTheExplorer';

-- Get player with their recent game events
SELECT
    p.username,
    p.class,
    p.level,
    COUNT(ge.id) as total_events
FROM players p
LEFT JOIN game_events ge ON p.id = ge.player_id
GROUP BY p.id, p.username, p.class, p.level;

-- Update player XP
UPDATE players
SET xp = xp + 100, level = (xp + 100) / 100
WHERE username = 'TobyTheExplorer';
```

### NPCs

```sql
-- Get all NPCs
SELECT * FROM npcs ORDER BY name;

-- Get NPC with personality details
SELECT
    name,
    role,
    location,
    personality->>'disposition' as disposition,
    personality->'traits' as traits
FROM npcs
WHERE name = 'Elarin';

-- Get NPCs by location
SELECT * FROM npcs WHERE location = 'Moonvale';
```

### NPC Memories

```sql
-- Get all memories an NPC has about a player
SELECT
    n.name as npc_name,
    p.username as player_name,
    nm.memory,
    nm.importance,
    nm.created_at
FROM npc_memories nm
JOIN npcs n ON nm.npc_id = n.id
JOIN players p ON nm.player_id = p.id
WHERE n.name = 'Elarin'
AND p.username = 'TobyTheExplorer'
ORDER BY nm.importance DESC, nm.created_at DESC;

-- Get most important memories for an NPC
SELECT
    p.username,
    nm.memory,
    nm.importance
FROM npc_memories nm
JOIN players p ON nm.player_id = p.id
WHERE nm.npc_id = (SELECT id FROM npcs WHERE name = 'Elarin')
ORDER BY nm.importance DESC
LIMIT 5;

-- Create a new memory
INSERT INTO npc_memories (npc_id, player_id, memory, importance)
VALUES (
    (SELECT id FROM npcs WHERE name = 'Elarin'),
    (SELECT id FROM players WHERE username = 'TobyTheExplorer'),
    'Player asked about the Fall of Ember Tower',
    7
);
```

### Lore (Vector Search)

```sql
-- Get all lore entries
SELECT id, title, region, tags FROM lore ORDER BY created_at DESC;

-- Search lore by tags
SELECT title, content, tags
FROM lore
WHERE tags && ARRAY['wolves', 'danger'];

-- Search lore by region
SELECT title, content FROM lore WHERE region = 'Moonvale';

-- Vector similarity search (requires embeddings)
-- Note: Replace [0.1, 0.2, ...] with actual embedding vector
SELECT
    title,
    content,
    embedding <=> '[0.1, 0.2, ...]'::vector as distance
FROM lore
WHERE embedding IS NOT NULL
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 5;

-- Get lore entries missing embeddings
SELECT id, title FROM lore WHERE embedding IS NULL;
```

### Game Events

```sql
-- Get recent game events
SELECT
    p.username,
    ge.event_type,
    ge.location,
    ge.metadata,
    ge.created_at
FROM game_events ge
JOIN players p ON ge.player_id = p.id
ORDER BY ge.created_at DESC
LIMIT 20;

-- Count events by type
SELECT
    event_type,
    COUNT(*) as count
FROM game_events
GROUP BY event_type
ORDER BY count DESC;

-- Get player's event history
SELECT
    event_type,
    location,
    metadata,
    created_at
FROM game_events
WHERE player_id = (SELECT id FROM players WHERE username = 'TobyTheExplorer')
ORDER BY created_at DESC;

-- Check for emergent gameplay trigger (wolf kills)
SELECT
    p.username,
    COUNT(*) as wolf_kills
FROM game_events ge
JOIN players p ON ge.player_id = p.id
WHERE ge.event_type = 'wolf_kill'
GROUP BY p.id, p.username
HAVING COUNT(*) >= 3;

-- Create game event
INSERT INTO game_events (player_id, event_type, location, metadata)
VALUES (
    (SELECT id FROM players WHERE username = 'TobyTheExplorer'),
    'wolf_kill',
    'Northern Forest',
    '{"wolf_type": "silver", "difficulty": "hard"}'::jsonb
);
```

### World Events

```sql
-- Get all world events
SELECT * FROM world_events ORDER BY created_at DESC;

-- Get recent world events
SELECT
    event_name,
    description,
    trigger_source,
    created_at
FROM world_events
ORDER BY created_at DESC
LIMIT 10;

-- Create world event
INSERT INTO world_events (event_name, description, trigger_source, metadata)
VALUES (
    'Wolf Pack Retreat',
    'Wolf activity around Moonvale has suddenly decreased following repeated player victories.',
    'player_actions',
    '{"triggered_by": "multiple_wolf_kills", "threshold": 3}'::jsonb
);
```

### Player Feedback (RLHF)

```sql
-- Get all feedback
SELECT
    p.username,
    pf.target_type,
    pf.rating,
    pf.feedback,
    pf.created_at
FROM player_feedback pf
JOIN players p ON pf.player_id = p.id
ORDER BY pf.created_at DESC;

-- Get average ratings by target type
SELECT
    target_type,
    AVG(rating) as avg_rating,
    COUNT(*) as feedback_count
FROM player_feedback
GROUP BY target_type;

-- Submit feedback
INSERT INTO player_feedback (player_id, target_type, target_id, rating, feedback)
VALUES (
    (SELECT id FROM players WHERE username = 'TobyTheExplorer'),
    'npc_dialogue',
    (SELECT id FROM npcs WHERE name = 'Elarin'),
    5,
    'NPC remembered my previous conversation about Ember Tower!'
);
```

## Database Maintenance

### Check Table Sizes

```sql
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Check Index Usage

```sql
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### Unused Indexes

```sql
SELECT
    schemaname,
    tablename,
    indexname
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Vacuum and Analyze

```sql
-- Vacuum all tables
VACUUM ANALYZE;

-- Vacuum specific table
VACUUM ANALYZE players;

-- Get last vacuum time
SELECT
    schemaname,
    relname,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public';
```

## Useful Metadata Queries

### List All Tables

```sql
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Describe Table Structure

```sql
-- Using psql
\d players

-- Using SQL
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'players'
ORDER BY ordinal_position;
```

### List All Indexes

```sql
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### List All Foreign Keys

```sql
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public';
```

### List All Triggers

```sql
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

## Backup and Restore

### Backup Database

```bash
# Full backup
pg_dump "${DATABASE_URL}" > backup_$(date +%Y%m%d_%H%M%S).sql

# Schema only
pg_dump "${DATABASE_URL}" --schema-only > schema_backup.sql

# Data only
pg_dump "${DATABASE_URL}" --data-only > data_backup.sql

# Specific tables
pg_dump "${DATABASE_URL}" -t players -t npcs > specific_tables.sql

# Compressed backup
pg_dump "${DATABASE_URL}" | gzip > backup.sql.gz
```

### Restore Database

```bash
# Restore from backup
psql "${DATABASE_URL}" < backup_20260313_100000.sql

# Restore compressed backup
gunzip -c backup.sql.gz | psql "${DATABASE_URL}"

# Restore to different database
createdb zdbgame_restore
psql "postgresql://localhost/zdbgame_restore" < backup.sql
```

## Performance Tips

### Explain Query Plans

```sql
-- Show query execution plan
EXPLAIN SELECT * FROM players WHERE username = 'TobyTheExplorer';

-- Show with actual execution stats
EXPLAIN ANALYZE SELECT * FROM players WHERE username = 'TobyTheExplorer';

-- Show with buffer usage
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM players WHERE username = 'TobyTheExplorer';
```

### Slow Query Identification

```sql
-- Enable slow query logging (requires superuser)
ALTER DATABASE zdbgame SET log_min_duration_statement = 1000; -- 1 second

-- View current settings
SHOW log_min_duration_statement;
```

## Testing Data

### Reset Test Data

```sql
-- Clear all data (preserves schema)
TRUNCATE TABLE
    player_feedback,
    assets,
    world_events,
    game_events,
    npc_memories,
    lore,
    npcs,
    players
CASCADE;

-- Re-run seed data
\i scripts/migrations/002_seed_data.sql
```

### Insert Test Players

```sql
INSERT INTO players (username, class, faction, level, xp)
VALUES
    ('Alice', 'Warrior', 'Forest Guild', 1, 0),
    ('Bob', 'Mage', 'Forest Guild', 1, 0),
    ('Carol', 'Ranger', 'Forest Guild', 1, 0)
ON CONFLICT (username) DO NOTHING;
```

### Insert Test Events

```sql
INSERT INTO game_events (player_id, event_type, location)
SELECT
    id,
    'wolf_kill',
    'Northern Forest'
FROM players
WHERE username IN ('Alice', 'Bob', 'Carol');
```

## Troubleshooting

### Connection Issues

```bash
# Test connection
pg_isready -d "${DATABASE_URL}"

# Check PostgreSQL status
brew services list | grep postgresql  # macOS
sudo systemctl status postgresql     # Linux
```

### Extension Issues

```sql
-- List installed extensions
SELECT * FROM pg_extension;

-- Install missing extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Permission Issues

```sql
-- Grant all permissions to user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;
```

## Advanced Queries

### Generate UUID

```sql
SELECT gen_random_uuid();
```

### JSON Queries

```sql
-- Extract JSON field
SELECT
    username,
    inventory->0 as first_item
FROM players
WHERE inventory != '[]'::jsonb;

-- Query JSONB array
SELECT username
FROM players
WHERE inventory @> '[{"type": "sword"}]'::jsonb;
```

### Array Queries

```sql
-- Check if array contains element
SELECT * FROM lore WHERE 'wolves' = ANY(tags);

-- Check if arrays overlap
SELECT * FROM lore WHERE tags && ARRAY['wolves', 'danger'];

-- Array length
SELECT title, array_length(tags, 1) as tag_count FROM lore;
```

---

**Last Updated**: 2026-03-13
