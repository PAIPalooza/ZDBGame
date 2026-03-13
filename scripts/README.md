# Scripts Directory

This directory contains executable scripts for database seeding, maintenance, and development tasks.

---

## Available Scripts

### seed-zerodb.ts

**Purpose**: Seed ZeroDB database with initial Moonvale world data

**What it seeds**:
- 3 Regions (Moonvale, Northern Forest, Ember Tower Ruins)
- 1 Faction (Forest Guild)
- 1 NPC (Elarin the Village Historian)
- 3 Lore entries (matching lib/lore.ts)

**Features**:
- Idempotent (safe to run multiple times)
- Creates tables if they don't exist
- Skips existing records
- Comprehensive error handling
- Detailed logging

**Usage**:
```bash
# Using npm script (recommended)
npm run seed:zerodb

# Direct execution
ts-node scripts/seed-zerodb.ts

# With environment variables
AINATIVE_API_TOKEN=your-token ts-node scripts/seed-zerodb.ts
```

**Requirements**:
- `AINATIVE_API_TOKEN` environment variable set in `.env`
- `AINATIVE_API_URL` (defaults to https://api.ainative.studio/)
- Network access to ZeroDB API

**Documentation**: See `/docs/implementation/ZERODB_SEED_IMPLEMENTATION.md`

**Tests**: See `/__tests__/seed-zerodb.test.ts`

---

### seed.ts (Legacy)

**Purpose**: Original file-based seed script

**Status**: Deprecated in favor of `seed-zerodb.ts`

**Note**: This script uses the file-based storage system (`lib/data.ts`) instead of ZeroDB. It's kept for reference and backwards compatibility.

---

## Environment Setup

Create a `.env` file in project root with:

```bash
# Required for seed-zerodb.ts
AINATIVE_API_URL=https://api.ainative.studio/
AINATIVE_API_TOKEN=your-api-token-here

# Optional
NEXT_PUBLIC_API_URL=http://localhost:3000
```

**Getting your API token**:
1. Visit https://www.ainative.studio/developer-settings
2. Generate API key
3. Copy and paste into `.env` file

---

## Adding New Scripts

### File naming convention
- Use kebab-case: `my-script.ts`
- Prefix with purpose: `seed-`, `migrate-`, `cleanup-`

### Script template

```typescript
#!/usr/bin/env ts-node

/**
 * Script Name
 *
 * Description of what this script does
 *
 * Usage: npm run script-name
 */

import * as dotenv from 'dotenv';

dotenv.config();

async function main(): Promise<void> {
  console.log('Starting...');

  try {
    // Your logic here

    console.log('✅ Success!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
```

### Adding to package.json

Add your script to the `scripts` section:

```json
{
  "scripts": {
    "my-script": "ts-node scripts/my-script.ts"
  }
}
```

---

## Troubleshooting

### "Cannot find module 'dotenv'"

```bash
npm install dotenv
```

### "AINATIVE_API_TOKEN is not set"

Check your `.env` file exists and contains:
```
AINATIVE_API_TOKEN=your-token
```

### "Permission denied"

Make script executable:
```bash
chmod +x scripts/seed-zerodb.ts
```

### TypeScript errors

```bash
# Reinstall dependencies
npm install

# Check TypeScript compilation
tsc --noEmit scripts/seed-zerodb.ts
```

---

## Testing Scripts

Always test scripts before committing:

1. Test with fresh database
2. Test idempotency (run twice)
3. Test error handling (invalid credentials)
4. Verify data integrity
5. Check performance

---

## Best Practices

1. **Always use environment variables** for credentials
2. **Make scripts idempotent** when possible
3. **Add comprehensive error handling**
4. **Log progress clearly** for debugging
5. **Write tests** for script logic
6. **Document usage** in comments
7. **Exit with proper codes** (0 for success, 1 for error)

---

## Related Documentation

- ZeroDB Guide: `.claude/commands/ZERODB-GUIDE.md`
- Seed Implementation: `/docs/implementation/ZERODB_SEED_IMPLEMENTATION.md`
- Data Model: `/datamodel.md`
- Project README: `/README.md`
