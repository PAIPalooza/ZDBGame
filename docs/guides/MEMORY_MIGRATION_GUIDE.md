# NPC Memory Storage Migration Guide

## Overview

This guide explains how to migrate NPC memories from file-based storage to ZeroDB.

**Issue:** #6 - Epic 3: NPC Memory Storage

**Status:** Implementation Complete

## What Changed

### Before (File-based)
- Memories stored as JSON files in `.data/` directory
- File naming: `npc_memory_{uuid}.json`
- Synchronous file I/O operations
- Limited query capabilities

### After (ZeroDB)
- Memories stored in PostgreSQL table `npc_memories`
- Full SQL query capabilities
- Async/await pattern
- Better performance and scalability
- Proper indexing for common queries

## Prerequisites

1. **PostgreSQL/ZeroDB Instance**
   - Local PostgreSQL 14+ or ZeroDB instance
   - Connection details in `DATABASE_URL` environment variable

2. **Node Dependencies**
   ```bash
   npm install pg @types/pg
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env and set DATABASE_URL
   ```

## Migration Steps

### Step 1: Create Database Table

Run the migration to create the `npc_memories` table:

```bash
npx ts-node scripts/run-migration.ts migrations/001_create_npc_memories.sql
```

**Expected Output:**
```
===================================
Database Migration Runner
===================================

Checking database connection...
Database connection OK

Reading migration: migrations/001_create_npc_memories.sql
SQL length: XXXX characters

Executing migration...
Migration executed successfully!

Table "npc_memories" created successfully!
```

### Step 2: Test Database Connection

Verify the database is accessible:

```bash
npx ts-node -e "
import { healthCheck, closePool } from './lib/db';
healthCheck().then(ok => {
  console.log('Database healthy:', ok);
  closePool();
});
"
```

### Step 3: Dry Run Migration

Preview what will be migrated without making changes:

```bash
npx ts-node scripts/migrate-file-memories-to-db.ts --dry-run
```

This will:
- Show how many memory files exist
- Display sample memories
- Indicate what would be migrated
- NOT make any changes

### Step 4: Run Migration

Execute the actual migration:

```bash
npx ts-node scripts/migrate-file-memories-to-db.ts
```

The script will:
1. Create a backup of `.data/` directory
2. Read all `npc_memory_*.json` files
3. Insert memories into ZeroDB
4. Verify migration success
5. Report statistics

**Expected Output:**
```
===================================
NPC Memory Migration
File-based (.data/) -> ZeroDB
===================================

Creating backup: .data-backup-2026-03-13T10-30-00
Backup created: 15 files

Checking database...
Database ready

Existing memories in database: 0
Reading file-based memories...
Found 15 memory files

Found 15 memories to migrate

Sample memories:
  1. [Importance: 2] Player asked about Ember Tower
  2. [Importance: 3] Player defeated wolves near Moonvale
  3. [Importance: 1] Player explored the northern forest

Starting migration...
  Migrated 10/15...

Migration complete!
  Success: 15
  Failures: 0
  Total: 15

Database verification:
  Memories before: 0
  Memories after: 15
  Net new: 15

Migration successful! All memories have been migrated to ZeroDB.
```

### Step 5: Verify Application

Test the application to ensure memories work correctly:

```bash
npm run dev
```

Test scenarios:
1. **Talk to NPC** - Verify conversation memories are stored
2. **Fight wolves** - Check combat memories (importance 3)
3. **View memories** - GET `/api/memories?playerId={uuid}`
4. **Complete quest** - Verify quest memories (importance 4-5)

### Step 6: Clean Up (Optional)

Once verified, you can remove old file-based storage:

```bash
# Keep backup just in case
rm -rf .data/npc_memory_*.json
```

**Do NOT delete until thoroughly tested!**

## Database Schema

### Table: npc_memories

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key, auto-generated |
| npc_id | UUID | Reference to NPC |
| player_id | UUID | Reference to player |
| memory | TEXT | Memory content |
| importance | INTEGER | 1-10 rating |
| metadata | JSONB | Additional data |
| created_at | TIMESTAMP | Creation timestamp |

### Indexes

- `idx_npc_memories_npc_id` - Query by NPC
- `idx_npc_memories_player_id` - Query by player
- `idx_npc_memories_npc_player` - Combined NPC+Player
- `idx_npc_memories_importance` - Sort by importance
- `idx_npc_memories_created_at` - Sort by date
- `idx_npc_memories_lookup` - Composite for common query pattern

## API Changes

All memory functions now return Promises:

### Before (File-based)
```typescript
const memory = storeMemory(npcId, playerId, 'text', 2);
const memories = getMemories(npcId, playerId);
```

### After (ZeroDB)
```typescript
const memory = await storeMemory(npcId, playerId, 'text', 2);
const memories = await getMemories(npcId, playerId);
```

All API routes and NPC dialogue functions have been updated to use async/await.

## Memory Triggers

The following memory trigger functions are available:

| Function | Importance | Use Case |
|----------|-----------|----------|
| `storeMemoryLoreQuestion(npc, player, topic)` | 1-2 | Player asks about lore |
| `storeMemoryNPCHelp(npc, player, helpType)` | 2 | Player requests help |
| `storeMemoryEnemyDefeat(npc, player, enemy, location)` | 3 | Player defeats enemy |
| `storeMemoryQuestCompletion(npc, player, quest, importance)` | 4-5 | Player completes quest |
| `storeMemoryHelpVillage(npc, player)` | 2 | Player helps village |
| `storeMemoryExploration(npc, player, location)` | 1 | Player explores area |

## Testing

Run the test suite:

```bash
npm test
```

**Test Coverage:**
- Memory storage layer operations
- Memory trigger scenarios
- Duplicate detection
- Importance validation
- Sorting and retrieval
- Complex player journeys

## Rollback Procedure

If issues occur, you can rollback:

1. **Stop the application**

2. **Restore from backup**
   ```bash
   cp .data-backup-*/npc_memory_*.json .data/
   ```

3. **Revert code changes**
   ```bash
   git checkout HEAD -- lib/memory.ts lib/npc.ts app/api/
   ```

4. **Restart application**
   ```bash
   npm run dev
   ```

## Performance Considerations

### Query Performance
- All common queries use indexed columns
- Composite index optimizes NPC+Player lookups
- Importance and date sorting are indexed

### Connection Pooling
- Pool size: 20 connections
- Idle timeout: 30 seconds
- Connection timeout: 10 seconds

### Slow Query Monitoring
Queries slower than 100ms are automatically logged:
```
WARN: Slow query detected: {text, duration, rows}
```

## Troubleshooting

### Issue: Database connection failed

**Solution:** Check DATABASE_URL in .env:
```bash
echo $DATABASE_URL
# Should output: postgresql://...
```

### Issue: Table does not exist

**Solution:** Run migration:
```bash
npx ts-node scripts/run-migration.ts migrations/001_create_npc_memories.sql
```

### Issue: Duplicate memories after migration

**Solution:** The system has built-in duplicate detection. Duplicates mean:
- Same NPC, same player, same memory text (case-insensitive)

Clear duplicates manually or re-run migration after clearing database:
```sql
DELETE FROM npc_memories;
```

### Issue: Tests failing with connection errors

**Solution:** Ensure test database is configured:
```bash
export DATABASE_URL=postgresql://localhost:5432/aigame_test
npx jest
```

## Files Created/Modified

### New Files
- `lib/db.ts` - Database connection module
- `lib/memory-storage.ts` - ZeroDB storage layer
- `migrations/001_create_npc_memories.sql` - Database migration
- `scripts/run-migration.ts` - Migration runner
- `scripts/migrate-file-memories-to-db.ts` - Data migration script
- `__tests__/memory-storage.test.ts` - Storage layer tests
- `__tests__/memory-triggers.test.ts` - Trigger scenario tests
- `.env.example` - Environment configuration template

### Modified Files
- `lib/memory.ts` - Converted to async, uses ZeroDB
- `lib/npc.ts` - Async NPC dialogue generation
- `app/api/npc/talk/route.ts` - Async memory storage
- `app/api/memories/route.ts` - Async memory retrieval
- `app/api/event/create/route.ts` - Async action memories
- `app/api/event/create-with-session/route.ts` - Async action memories

### Configuration
- `package.json` - Added pg and @types/pg dependencies

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review test files for examples
3. Check GitHub Issue #6
4. Consult datamodel.md for schema details

## Next Steps

After successful migration:
1. Monitor application logs for errors
2. Test all memory-related features
3. Verify performance improvements
4. Consider implementing memory analytics
5. Plan for vector search integration (future enhancement)
