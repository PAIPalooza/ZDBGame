# Quick Start: Memory Migration

## TL;DR - Get Started in 5 Minutes

### Prerequisites
- PostgreSQL or ZeroDB instance running
- Database connection URL

### 1. Install Dependencies (30 seconds)
```bash
npm install
```

### 2. Configure Database (1 minute)
```bash
# Copy environment template
cp .env.local.example .env

# Edit .env and add your database URL
# DATABASE_URL=postgresql://localhost:5432/aigame
```

### 3. Create Database Table (30 seconds)
```bash
npm run db:migrate
```

Expected output: "Table npc_memories created successfully!"

### 4. Migrate Existing Data (Optional - 1 minute)
Only if you have existing file-based memories in `.data/`:

```bash
# Preview what will be migrated
npm run db:migrate:memories:dry-run

# Actually migrate
npm run db:migrate:memories
```

### 5. Verify (2 minutes)
```bash
# Run memory tests
npm run test:memory

# Start application
npm run dev
```

Done! Your NPC memories are now using ZeroDB.

## What Changed?

### Before
```typescript
// Synchronous file-based storage
const memory = storeMemory(npcId, playerId, 'text', 2);
```

### After
```typescript
// Async database storage
const memory = await storeMemory(npcId, playerId, 'text', 2);
```

All calling code has been updated automatically.

## Memory Trigger Reference

Quick reference for creating memories:

```typescript
// Lore question (importance 1-2)
await storeMemoryLoreQuestion(npcId, playerId, 'Ember Tower');

// NPC help (importance 2)
await storeMemoryNPCHelp(npcId, playerId, 'finding quest items');

// Enemy defeat (importance 3)
await storeMemoryEnemyDefeat(npcId, playerId, 'wolves', 'Moonvale');

// Quest completion (importance 4-5)
await storeMemoryQuestCompletion(npcId, playerId, 'Wolf Hunt', 5);

// Help village (importance 2)
await storeMemoryHelpVillage(npcId, playerId);

// Exploration (importance 1)
await storeMemoryExploration(npcId, playerId, 'northern forest');
```

## NPM Scripts

```bash
# Database
npm run db:migrate                    # Create tables
npm run db:migrate:memories           # Migrate file data
npm run db:migrate:memories:dry-run   # Preview migration

# Testing
npm run test:memory                   # Run memory tests
npm test                              # Run all tests

# Development
npm run dev                           # Start dev server
```

## Troubleshooting

### "Database connection failed"
Check your DATABASE_URL in .env:
```bash
cat .env | grep DATABASE_URL
```

### "Table does not exist"
Run the migration:
```bash
npm run db:migrate
```

### "Tests failing"
Ensure database is accessible:
```bash
psql $DATABASE_URL -c "SELECT 1"
```

## More Information

- Full migration guide: `MEMORY_MIGRATION_GUIDE.md`
- Implementation details: `ISSUE_6_IMPLEMENTATION_SUMMARY.md`
- Database schema: `migrations/001_create_npc_memories.sql`

## Support

Check the troubleshooting section in `MEMORY_MIGRATION_GUIDE.md` or review test files for usage examples.
