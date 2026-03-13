-- ============================================================================
-- Migration: 001_create_npc_memories
-- Description: Create NPC memories table for ZeroDB
-- Issue: #6 - Epic 3: NPC Memory Storage
-- ============================================================================

-- Drop table if exists (for clean re-runs during development)
DROP TABLE IF EXISTS npc_memories CASCADE;

-- Create NPC memories table
CREATE TABLE npc_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    npc_id UUID NOT NULL,
    player_id UUID NOT NULL,
    memory TEXT NOT NULL,
    importance INTEGER DEFAULT 1 CHECK (importance >= 1 AND importance <= 10),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_npc_memories_npc_id ON npc_memories(npc_id);
CREATE INDEX idx_npc_memories_player_id ON npc_memories(player_id);
CREATE INDEX idx_npc_memories_npc_player ON npc_memories(npc_id, player_id);
CREATE INDEX idx_npc_memories_importance ON npc_memories(importance DESC);
CREATE INDEX idx_npc_memories_created_at ON npc_memories(created_at DESC);

-- Create composite index for most common query pattern
-- (retrieving memories for NPC + Player sorted by importance)
CREATE INDEX idx_npc_memories_lookup ON npc_memories(npc_id, player_id, importance DESC, created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE npc_memories IS 'Stores memories that NPCs have about players, enabling AI-native gameplay';
COMMENT ON COLUMN npc_memories.id IS 'Unique memory identifier (UUID v4)';
COMMENT ON COLUMN npc_memories.npc_id IS 'Reference to the NPC who has this memory';
COMMENT ON COLUMN npc_memories.player_id IS 'Reference to the player this memory is about';
COMMENT ON COLUMN npc_memories.memory IS 'The actual memory content as a text description';
COMMENT ON COLUMN npc_memories.importance IS 'Importance rating (1-10), higher means more significant';
COMMENT ON COLUMN npc_memories.metadata IS 'Additional metadata for future extensibility';
COMMENT ON COLUMN npc_memories.created_at IS 'Timestamp when the memory was created';
