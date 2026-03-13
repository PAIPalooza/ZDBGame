-- Schema Validation Test Suite
-- This script validates the database schema integrity
-- Run after migrations to ensure everything is configured correctly
--
-- Usage: psql "${DATABASE_URL}" -f validate-schema.sql
--
-- Author: ZDBGame Team
-- Date: 2026-03-13

\set ON_ERROR_STOP on

-- Start transaction for validation
BEGIN;

-- ====================================================================================
-- EXTENSION VALIDATION
-- ====================================================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Check vector extension
    SELECT COUNT(*) INTO v_count
    FROM pg_extension
    WHERE extname = 'vector';

    IF v_count = 0 THEN
        RAISE EXCEPTION 'VALIDATION FAILED: vector extension not installed';
    END IF;

    RAISE NOTICE '✓ Extension: vector is installed';

    -- Check uuid-ossp extension
    SELECT COUNT(*) INTO v_count
    FROM pg_extension
    WHERE extname = 'uuid-ossp';

    IF v_count = 0 THEN
        RAISE WARNING 'WARNING: uuid-ossp extension not installed (optional, using gen_random_uuid instead)';
    ELSE
        RAISE NOTICE '✓ Extension: uuid-ossp is installed';
    END IF;
END;
$$;

-- ====================================================================================
-- TABLE EXISTENCE VALIDATION
-- ====================================================================================

DO $$
DECLARE
    v_tables TEXT[] := ARRAY[
        'players',
        'npcs',
        'npc_memories',
        'lore',
        'game_events',
        'world_events',
        'player_feedback',
        'assets',
        'schema_migrations'
    ];
    v_table TEXT;
    v_exists BOOLEAN;
BEGIN
    FOREACH v_table IN ARRAY v_tables
    LOOP
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = v_table
        ) INTO v_exists;

        IF NOT v_exists THEN
            RAISE EXCEPTION 'VALIDATION FAILED: Table % does not exist', v_table;
        END IF;

        RAISE NOTICE '✓ Table exists: %', v_table;
    END LOOP;
END;
$$;

-- ====================================================================================
-- COLUMN VALIDATION
-- ====================================================================================

DO $$
BEGIN
    -- Validate players table columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'players' AND column_name = 'id'
    ) THEN
        RAISE EXCEPTION 'VALIDATION FAILED: players.id column missing';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'players' AND column_name = 'username'
    ) THEN
        RAISE EXCEPTION 'VALIDATION FAILED: players.username column missing';
    END IF;

    RAISE NOTICE '✓ Table columns validated: players';

    -- Validate lore table has embedding column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lore' AND column_name = 'embedding'
    ) THEN
        RAISE EXCEPTION 'VALIDATION FAILED: lore.embedding column missing (required for vector search)';
    END IF;

    RAISE NOTICE '✓ Table columns validated: lore (including vector embedding)';

    -- Validate npc_memories table columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'npc_memories' AND column_name = 'importance'
    ) THEN
        RAISE EXCEPTION 'VALIDATION FAILED: npc_memories.importance column missing';
    END IF;

    RAISE NOTICE '✓ Table columns validated: npc_memories';
END;
$$;

-- ====================================================================================
-- FOREIGN KEY VALIDATION
-- ====================================================================================

DO $$
DECLARE
    v_fk_count INTEGER;
BEGIN
    -- Check npc_memories foreign keys
    SELECT COUNT(*) INTO v_fk_count
    FROM information_schema.table_constraints
    WHERE table_name = 'npc_memories'
    AND constraint_type = 'FOREIGN KEY';

    IF v_fk_count < 2 THEN
        RAISE EXCEPTION 'VALIDATION FAILED: npc_memories should have 2 foreign keys (npc_id, player_id), found %', v_fk_count;
    END IF;

    RAISE NOTICE '✓ Foreign keys validated: npc_memories (% constraints)', v_fk_count;

    -- Check game_events foreign key
    SELECT COUNT(*) INTO v_fk_count
    FROM information_schema.table_constraints
    WHERE table_name = 'game_events'
    AND constraint_type = 'FOREIGN KEY';

    IF v_fk_count < 1 THEN
        RAISE EXCEPTION 'VALIDATION FAILED: game_events should have at least 1 foreign key (player_id)';
    END IF;

    RAISE NOTICE '✓ Foreign keys validated: game_events (% constraints)', v_fk_count;

    -- Check player_feedback foreign key
    SELECT COUNT(*) INTO v_fk_count
    FROM information_schema.table_constraints
    WHERE table_name = 'player_feedback'
    AND constraint_type = 'FOREIGN KEY';

    IF v_fk_count < 1 THEN
        RAISE EXCEPTION 'VALIDATION FAILED: player_feedback should have at least 1 foreign key (player_id)';
    END IF;

    RAISE NOTICE '✓ Foreign keys validated: player_feedback (% constraints)', v_fk_count;

    -- Check assets foreign key
    SELECT COUNT(*) INTO v_fk_count
    FROM information_schema.table_constraints
    WHERE table_name = 'assets'
    AND constraint_type = 'FOREIGN KEY';

    IF v_fk_count < 1 THEN
        RAISE EXCEPTION 'VALIDATION FAILED: assets should have at least 1 foreign key (player_id)';
    END IF;

    RAISE NOTICE '✓ Foreign keys validated: assets (% constraints)', v_fk_count;
END;
$$;

-- ====================================================================================
-- INDEX VALIDATION
-- ====================================================================================

DO $$
DECLARE
    v_index_count INTEGER;
BEGIN
    -- Count indexes on players table
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE tablename = 'players';

    IF v_index_count < 4 THEN
        RAISE WARNING 'WARNING: players table has % indexes, expected at least 4', v_index_count;
    ELSE
        RAISE NOTICE '✓ Indexes validated: players (% indexes)', v_index_count;
    END IF;

    -- Count indexes on lore table (must include vector index)
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE tablename = 'lore';

    IF v_index_count < 3 THEN
        RAISE WARNING 'WARNING: lore table has % indexes, expected at least 3 (including vector index)', v_index_count;
    ELSE
        RAISE NOTICE '✓ Indexes validated: lore (% indexes)', v_index_count;
    END IF;

    -- Verify vector index exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'lore'
        AND indexdef LIKE '%vector%'
    ) THEN
        RAISE WARNING 'WARNING: Vector index on lore.embedding may not be configured';
    ELSE
        RAISE NOTICE '✓ Vector index validated: lore.embedding';
    END IF;

    -- Count indexes on npc_memories table
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE tablename = 'npc_memories';

    IF v_index_count < 3 THEN
        RAISE WARNING 'WARNING: npc_memories table has % indexes, expected at least 3', v_index_count;
    ELSE
        RAISE NOTICE '✓ Indexes validated: npc_memories (% indexes)', v_index_count;
    END IF;

    -- Count indexes on game_events table
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE tablename = 'game_events';

    IF v_index_count < 3 THEN
        RAISE WARNING 'WARNING: game_events table has % indexes, expected at least 3', v_index_count;
    ELSE
        RAISE NOTICE '✓ Indexes validated: game_events (% indexes)', v_index_count;
    END IF;
END;
$$;

-- ====================================================================================
-- CONSTRAINT VALIDATION
-- ====================================================================================

DO $$
BEGIN
    -- Check players.level constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_schema = 'public'
        AND constraint_name LIKE '%players%level%'
    ) THEN
        RAISE WARNING 'WARNING: players.level CHECK constraint may not be configured';
    ELSE
        RAISE NOTICE '✓ Constraint validated: players.level CHECK (level > 0)';
    END IF;

    -- Check npc_memories.importance constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_schema = 'public'
        AND constraint_name LIKE '%npc_memories%importance%'
    ) THEN
        RAISE WARNING 'WARNING: npc_memories.importance CHECK constraint may not be configured';
    ELSE
        RAISE NOTICE '✓ Constraint validated: npc_memories.importance CHECK (1-10)';
    END IF;

    -- Check player_feedback.rating constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_schema = 'public'
        AND constraint_name LIKE '%player_feedback%rating%'
    ) THEN
        RAISE WARNING 'WARNING: player_feedback.rating CHECK constraint may not be configured';
    ELSE
        RAISE NOTICE '✓ Constraint validated: player_feedback.rating CHECK (1-5)';
    END IF;

    -- Check players.username UNIQUE constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'players'
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%username%'
    ) THEN
        RAISE WARNING 'WARNING: players.username UNIQUE constraint may not be configured';
    ELSE
        RAISE NOTICE '✓ Constraint validated: players.username UNIQUE';
    END IF;
END;
$$;

-- ====================================================================================
-- TRIGGER VALIDATION
-- ====================================================================================

DO $$
DECLARE
    v_trigger_count INTEGER;
BEGIN
    -- Check for updated_at triggers
    SELECT COUNT(*) INTO v_trigger_count
    FROM information_schema.triggers
    WHERE trigger_name LIKE 'update_%_updated_at';

    IF v_trigger_count < 3 THEN
        RAISE WARNING 'WARNING: Found % updated_at triggers, expected at least 3', v_trigger_count;
    ELSE
        RAISE NOTICE '✓ Triggers validated: updated_at triggers (% found)', v_trigger_count;
    END IF;

    -- Check update_updated_at_column function exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'update_updated_at_column'
    ) THEN
        RAISE WARNING 'WARNING: update_updated_at_column function not found';
    ELSE
        RAISE NOTICE '✓ Function validated: update_updated_at_column';
    END IF;
END;
$$;

-- ====================================================================================
-- DATA TYPE VALIDATION
-- ====================================================================================

DO $$
BEGIN
    -- Validate UUID columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'players'
        AND column_name = 'id'
        AND data_type = 'uuid'
    ) THEN
        RAISE EXCEPTION 'VALIDATION FAILED: players.id should be UUID type';
    END IF;

    RAISE NOTICE '✓ Data types validated: UUID columns';

    -- Validate JSONB columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'players'
        AND column_name = 'inventory'
        AND data_type = 'jsonb'
    ) THEN
        RAISE WARNING 'WARNING: players.inventory should be JSONB type';
    ELSE
        RAISE NOTICE '✓ Data types validated: JSONB columns';
    END IF;

    -- Validate TIMESTAMP WITH TIME ZONE columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'players'
        AND column_name = 'created_at'
        AND data_type = 'timestamp with time zone'
    ) THEN
        RAISE WARNING 'WARNING: players.created_at should be TIMESTAMP WITH TIME ZONE';
    ELSE
        RAISE NOTICE '✓ Data types validated: TIMESTAMP WITH TIME ZONE columns';
    END IF;

    -- Validate TEXT[] (array) columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lore'
        AND column_name = 'tags'
        AND data_type = 'ARRAY'
    ) THEN
        RAISE WARNING 'WARNING: lore.tags should be TEXT[] type';
    ELSE
        RAISE NOTICE '✓ Data types validated: ARRAY columns';
    END IF;
END;
$$;

-- ====================================================================================
-- DEFAULT VALUE VALIDATION
-- ====================================================================================

DO $$
BEGIN
    -- Check players.level default
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'players'
        AND column_name = 'level'
        AND column_default IS NOT NULL
    ) THEN
        RAISE WARNING 'WARNING: players.level should have a default value';
    ELSE
        RAISE NOTICE '✓ Default values validated: players.level';
    END IF;

    -- Check players.inventory default
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'players'
        AND column_name = 'inventory'
        AND column_default IS NOT NULL
    ) THEN
        RAISE WARNING 'WARNING: players.inventory should have a default value';
    ELSE
        RAISE NOTICE '✓ Default values validated: players.inventory';
    END IF;

    -- Check npc_memories.importance default
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'npc_memories'
        AND column_name = 'importance'
        AND column_default IS NOT NULL
    ) THEN
        RAISE WARNING 'WARNING: npc_memories.importance should have a default value';
    ELSE
        RAISE NOTICE '✓ Default values validated: npc_memories.importance';
    END IF;
END;
$$;

-- ====================================================================================
-- SCHEMA RELATIONSHIP VALIDATION
-- ====================================================================================

DO $$
BEGIN
    -- Test foreign key relationship: npc_memories -> players
    PERFORM 1
    FROM information_schema.referential_constraints rc
    JOIN information_schema.constraint_column_usage ccu
        ON rc.constraint_name = ccu.constraint_name
    WHERE rc.constraint_schema = 'public'
    AND ccu.table_name = 'players'
    AND rc.table_name = 'npc_memories';

    IF NOT FOUND THEN
        RAISE WARNING 'WARNING: Foreign key relationship npc_memories -> players may not be configured';
    ELSE
        RAISE NOTICE '✓ Relationship validated: npc_memories -> players';
    END IF;

    -- Test foreign key relationship: npc_memories -> npcs
    PERFORM 1
    FROM information_schema.referential_constraints rc
    JOIN information_schema.constraint_column_usage ccu
        ON rc.constraint_name = ccu.constraint_name
    WHERE rc.constraint_schema = 'public'
    AND ccu.table_name = 'npcs'
    AND rc.table_name = 'npc_memories';

    IF NOT FOUND THEN
        RAISE WARNING 'WARNING: Foreign key relationship npc_memories -> npcs may not be configured';
    ELSE
        RAISE NOTICE '✓ Relationship validated: npc_memories -> npcs';
    END IF;

    -- Test foreign key relationship: game_events -> players
    PERFORM 1
    FROM information_schema.referential_constraints rc
    JOIN information_schema.constraint_column_usage ccu
        ON rc.constraint_name = ccu.constraint_name
    WHERE rc.constraint_schema = 'public'
    AND ccu.table_name = 'players'
    AND rc.table_name = 'game_events';

    IF NOT FOUND THEN
        RAISE WARNING 'WARNING: Foreign key relationship game_events -> players may not be configured';
    ELSE
        RAISE NOTICE '✓ Relationship validated: game_events -> players';
    END IF;
END;
$$;

-- ====================================================================================
-- SUMMARY REPORT
-- ====================================================================================

DO $$
DECLARE
    v_table_count INTEGER;
    v_index_count INTEGER;
    v_fk_count INTEGER;
    v_trigger_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SCHEMA VALIDATION SUMMARY';
    RAISE NOTICE '========================================';

    -- Count tables
    SELECT COUNT(*) INTO v_table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';

    RAISE NOTICE 'Total Tables: %', v_table_count;

    -- Count indexes
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE schemaname = 'public';

    RAISE NOTICE 'Total Indexes: %', v_index_count;

    -- Count foreign keys
    SELECT COUNT(*) INTO v_fk_count
    FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
    AND constraint_schema = 'public';

    RAISE NOTICE 'Total Foreign Keys: %', v_fk_count;

    -- Count triggers
    SELECT COUNT(*) INTO v_trigger_count
    FROM information_schema.triggers
    WHERE trigger_schema = 'public';

    RAISE NOTICE 'Total Triggers: %', v_trigger_count;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'VALIDATION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END;
$$;

-- Rollback validation transaction (we don't want to make changes)
ROLLBACK;

-- Print final success message
\echo 'Schema validation completed successfully!'
\echo 'All critical validations passed.'
\echo ''
