-- Migration: 001_initial_schema.sql
-- Description: Initial database schema for AI-Native Game World Demo (Moonvale)
-- Author: ZDBGame Team
-- Date: 2026-03-13
--
-- This migration creates all core tables for the game:
-- - players: Player character data
-- - npcs: Non-player characters
-- - npc_memories: AI-powered NPC memory system
-- - lore: Vector-searchable game knowledge base
-- - game_events: Player action telemetry
-- - world_events: Emergent gameplay events
-- - player_feedback: RLHF feedback collection
-- - assets: Player-generated content storage
--
-- This migration is IDEMPOTENT and can be run multiple times safely.

-- ====================================================================================
-- EXTENSION SETUP
-- ====================================================================================

-- Enable pgvector extension for semantic search on lore content
-- This is required for AI-powered lore retrieval
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================================
-- TABLE DEFINITIONS
-- ====================================================================================

-- Table: players
-- Purpose: Stores persistent player character data
-- Relations: Referenced by npc_memories, game_events, player_feedback, assets
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    class TEXT,
    faction TEXT,
    level INTEGER DEFAULT 1 CHECK (level > 0),
    xp INTEGER DEFAULT 0 CHECK (xp >= 0),
    inventory JSONB DEFAULT '[]'::jsonb,
    reputation INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: npcs
-- Purpose: Stores non-player characters in the game world
-- Relations: Referenced by npc_memories
CREATE TABLE IF NOT EXISTS npcs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT,
    location TEXT,
    personality JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: npc_memories
-- Purpose: Core AI-native gameplay - stores memories NPCs have about players
-- Relations: References players(id), npcs(id)
-- Note: This enables NPCs to remember and respond to player actions
CREATE TABLE IF NOT EXISTS npc_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    npc_id UUID NOT NULL,
    player_id UUID NOT NULL,
    memory TEXT NOT NULL,
    importance INTEGER DEFAULT 1 CHECK (importance BETWEEN 1 AND 10),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Foreign key constraints with CASCADE delete
    -- When a player/NPC is deleted, their memories are also deleted
    CONSTRAINT fk_npc_memory_npc
        FOREIGN KEY (npc_id)
        REFERENCES npcs(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_npc_memory_player
        FOREIGN KEY (player_id)
        REFERENCES players(id)
        ON DELETE CASCADE
);

-- Table: lore
-- Purpose: Game world knowledge searchable via vector embeddings
-- Relations: None (referenced semantically via vector search)
-- Note: Embeddings are 1536-dimensional (OpenAI ada-002 standard)
CREATE TABLE IF NOT EXISTS lore (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    region TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    embedding VECTOR(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: game_events
-- Purpose: Telemetry for all gameplay actions
-- Relations: References players(id)
-- Note: Used for emergent gameplay rules and analytics
CREATE TABLE IF NOT EXISTS game_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    location TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Foreign key with CASCADE delete
    CONSTRAINT fk_game_event_player
        FOREIGN KEY (player_id)
        REFERENCES players(id)
        ON DELETE CASCADE
);

-- Table: world_events
-- Purpose: Significant events triggered by player behavior
-- Relations: None (triggered by aggregate game_events)
-- Note: Supports emergent gameplay (e.g., "Wolf Pack Retreat" after 3+ wolf kills)
CREATE TABLE IF NOT EXISTS world_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name TEXT NOT NULL,
    description TEXT NOT NULL,
    trigger_source TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: player_feedback
-- Purpose: RLHF (Reinforcement Learning from Human Feedback) data collection
-- Relations: References players(id)
-- Note: Used to improve AI-generated content quality
CREATE TABLE IF NOT EXISTS player_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    feedback TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Foreign key with CASCADE delete
    CONSTRAINT fk_player_feedback_player
        FOREIGN KEY (player_id)
        REFERENCES players(id)
        ON DELETE CASCADE
);

-- Table: assets
-- Purpose: Player-generated content storage (optional for future features)
-- Relations: References players(id)
-- Note: For guild banners, player houses, custom maps, etc.
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL,
    asset_type TEXT NOT NULL,
    asset_url TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Foreign key with CASCADE delete
    CONSTRAINT fk_asset_player
        FOREIGN KEY (player_id)
        REFERENCES players(id)
        ON DELETE CASCADE
);

-- ====================================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ====================================================================================

-- Player indexes
CREATE INDEX IF NOT EXISTS idx_players_username ON players(username);
CREATE INDEX IF NOT EXISTS idx_players_class ON players(class);
CREATE INDEX IF NOT EXISTS idx_players_faction ON players(faction);
CREATE INDEX IF NOT EXISTS idx_players_created_at ON players(created_at DESC);

-- NPC indexes
CREATE INDEX IF NOT EXISTS idx_npcs_name ON npcs(name);
CREATE INDEX IF NOT EXISTS idx_npcs_location ON npcs(location);
CREATE INDEX IF NOT EXISTS idx_npcs_role ON npcs(role);

-- NPC Memory indexes
-- Composite index for efficient player-NPC memory lookups
CREATE INDEX IF NOT EXISTS idx_npc_memories_npc_player ON npc_memories(npc_id, player_id);
CREATE INDEX IF NOT EXISTS idx_npc_memories_player_id ON npc_memories(player_id);
CREATE INDEX IF NOT EXISTS idx_npc_memories_importance ON npc_memories(importance DESC);
CREATE INDEX IF NOT EXISTS idx_npc_memories_created_at ON npc_memories(created_at DESC);

-- Lore indexes
-- Vector index for semantic similarity search using IVFFlat algorithm
-- Note: This index is crucial for fast vector similarity queries
CREATE INDEX IF NOT EXISTS idx_lore_embedding
    ON lore
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_lore_region ON lore(region);
CREATE INDEX IF NOT EXISTS idx_lore_tags ON lore USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_lore_created_at ON lore(created_at DESC);

-- Game Events indexes
-- Composite index for efficient player event type queries
CREATE INDEX IF NOT EXISTS idx_game_events_player_type ON game_events(player_id, event_type);
CREATE INDEX IF NOT EXISTS idx_game_events_event_type ON game_events(event_type);
CREATE INDEX IF NOT EXISTS idx_game_events_location ON game_events(location);
CREATE INDEX IF NOT EXISTS idx_game_events_created_at ON game_events(created_at DESC);

-- World Events indexes
CREATE INDEX IF NOT EXISTS idx_world_events_event_name ON world_events(event_name);
CREATE INDEX IF NOT EXISTS idx_world_events_trigger_source ON world_events(trigger_source);
CREATE INDEX IF NOT EXISTS idx_world_events_created_at ON world_events(created_at DESC);

-- Player Feedback indexes
CREATE INDEX IF NOT EXISTS idx_player_feedback_player_id ON player_feedback(player_id);
CREATE INDEX IF NOT EXISTS idx_player_feedback_target_type ON player_feedback(target_type);
CREATE INDEX IF NOT EXISTS idx_player_feedback_rating ON player_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_player_feedback_created_at ON player_feedback(created_at DESC);

-- Assets indexes
CREATE INDEX IF NOT EXISTS idx_assets_player_id ON assets(player_id);
CREATE INDEX IF NOT EXISTS idx_assets_asset_type ON assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at DESC);

-- ====================================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ====================================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to tables with updated_at column
DO $$
BEGIN
    -- Players table trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_players_updated_at') THEN
        CREATE TRIGGER update_players_updated_at
            BEFORE UPDATE ON players
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- NPCs table trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_npcs_updated_at') THEN
        CREATE TRIGGER update_npcs_updated_at
            BEFORE UPDATE ON npcs
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Lore table trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_lore_updated_at') THEN
        CREATE TRIGGER update_lore_updated_at
            BEFORE UPDATE ON lore
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Assets table trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_assets_updated_at') THEN
        CREATE TRIGGER update_assets_updated_at
            BEFORE UPDATE ON assets
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END;
$$;

-- ====================================================================================
-- VALIDATION AND COMMENTS
-- ====================================================================================

-- Add table comments for documentation
COMMENT ON TABLE players IS 'Player character data with persistent state';
COMMENT ON TABLE npcs IS 'Non-player characters in the game world';
COMMENT ON TABLE npc_memories IS 'AI-powered NPC memory system - core to AI-native gameplay';
COMMENT ON TABLE lore IS 'Vector-searchable game world knowledge base';
COMMENT ON TABLE game_events IS 'Telemetry for all gameplay actions and player behavior';
COMMENT ON TABLE world_events IS 'Emergent gameplay events triggered by player actions';
COMMENT ON TABLE player_feedback IS 'RLHF data collection for AI improvement';
COMMENT ON TABLE assets IS 'Player-generated content storage';

-- Add column comments for important fields
COMMENT ON COLUMN lore.embedding IS 'OpenAI ada-002 compatible 1536-dimensional vector for semantic search';
COMMENT ON COLUMN npc_memories.importance IS 'Memory importance rating (1-10), affects recall priority';
COMMENT ON COLUMN game_events.event_type IS 'Event type identifier (e.g., wolf_kill, explore, npc_conversation)';
COMMENT ON COLUMN world_events.trigger_source IS 'Source that triggered this world event (e.g., aggregate player actions)';

-- ====================================================================================
-- MIGRATION COMPLETE
-- ====================================================================================

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 001_initial_schema.sql completed successfully';
    RAISE NOTICE 'Tables created: players, npcs, npc_memories, lore, game_events, world_events, player_feedback, assets';
    RAISE NOTICE 'Extensions enabled: vector, uuid-ossp';
    RAISE NOTICE 'Indexes created: 31 total (including vector index on lore.embedding)';
    RAISE NOTICE 'Database is ready for use!';
END;
$$;
