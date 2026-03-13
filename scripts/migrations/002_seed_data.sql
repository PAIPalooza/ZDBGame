-- Migration: 002_seed_data.sql
-- Description: Seed initial game data for Moonvale demo
-- Author: ZDBGame Team
-- Date: 2026-03-13
--
-- This migration adds initial NPCs and lore entries to bootstrap the game world.
-- Safe to run multiple times (uses INSERT ... ON CONFLICT DO NOTHING).

-- ====================================================================================
-- SEED NPCs
-- ====================================================================================

-- Insert Elarin - Village Historian
INSERT INTO npcs (id, name, role, location, personality)
VALUES (
    '650e8400-e29b-41d4-a716-446655440001',
    'Elarin',
    'Village Historian',
    'Moonvale',
    '{
        "traits": ["wise", "patient", "knowledgeable"],
        "disposition": "helpful",
        "speech_style": "formal and scholarly",
        "interests": ["history", "magic", "ancient artifacts"]
    }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Insert additional NPCs for demo
INSERT INTO npcs (id, name, role, location, personality)
VALUES
(
    '650e8400-e29b-41d4-a716-446655440002',
    'Garrick',
    'Village Guard',
    'Moonvale',
    '{
        "traits": ["brave", "protective", "straightforward"],
        "disposition": "cautious",
        "speech_style": "direct and military",
        "interests": ["wolves", "security", "combat training"]
    }'::jsonb
),
(
    '650e8400-e29b-41d4-a716-446655440003',
    'Lyra',
    'Innkeeper',
    'Moonvale',
    '{
        "traits": ["friendly", "gossipy", "observant"],
        "disposition": "welcoming",
        "speech_style": "warm and casual",
        "interests": ["news", "travelers", "village happenings"]
    }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ====================================================================================
-- SEED LORE ENTRIES
-- ====================================================================================

-- Note: Embeddings are left NULL for now
-- In production, these should be generated using OpenAI's text-embedding-ada-002 model

INSERT INTO lore (id, title, content, region, tags)
VALUES
(
    '850e8400-e29b-41d4-a716-446655440001',
    'The Fall of Ember Tower',
    'The Ember Tower, once a beacon of magical research, collapsed three years ago after a catastrophic experiment. The tower''s chief mage, Arcturus, was attempting to harness the power of elemental fire when the containment crystals shattered. The resulting explosion destroyed the tower and created the Scorched Wastes to the east. Arcturus was never found, though some claim to have seen a shadowy figure wandering the ruins at night. The incident led to strict regulations on magical experimentation throughout the realm.',
    'Eastern Wastes',
    ARRAY['ember tower', 'magic', 'history', 'catastrophe', 'arcturus', 'fire magic']
),
(
    '850e8400-e29b-41d4-a716-446655440002',
    'Founding of Moonvale',
    'Moonvale was founded eighty years ago by the Forest Guild, a coalition of rangers, druids, and nature-aligned mages. The village was established to protect the Ancient Woods from exploitation and to serve as a sanctuary for those who respect nature. The first settlers built their homes in harmony with the forest, using living trees and natural materials. The village is named for the clearing where moonlight creates a silvery glow visible for miles. The Forest Guild still governs Moonvale, making decisions through council meetings held during the full moon.',
    'Moonvale',
    ARRAY['moonvale', 'forest guild', 'founding', 'history', 'nature', 'ancient woods']
),
(
    '850e8400-e29b-41d4-a716-446655440003',
    'Wolves of the Northern Forest',
    'The Northern Forest is home to several wolf packs that have lived in the region for centuries. While wolves rarely attack humans unprovoked, they have become increasingly aggressive in recent months. Villagers speculate this is due to food scarcity, encroachment on their territory, or perhaps magical influence. The largest pack is led by a massive silver wolf the locals call Ghost. Hunters who have ventured too far north report seeing unnaturally large wolves with glowing eyes. The village guard has posted warnings about traveling alone in the northern woods after dusk.',
    'Northern Forest',
    ARRAY['wolves', 'danger', 'forest', 'wildlife', 'ghost', 'northern forest']
),
(
    '850e8400-e29b-41d4-a716-446655440004',
    'The Ancient Woods',
    'The Ancient Woods surrounding Moonvale are said to be over a thousand years old. The trees here grow to enormous sizes, their canopy so thick that some areas remain in perpetual twilight. Druids claim the forest is sentient and watches over those who respect it. Strange phenomena occur deep in the woods: whispers in unknown languages, glowing mushrooms that pulse with arcane energy, and trees that seem to move when not observed. The Forest Guild has marked safe paths through the woods, and travelers are warned never to stray from them.',
    'Ancient Woods',
    ARRAY['ancient woods', 'forest', 'magic', 'druids', 'nature', 'mysterious']
),
(
    '850e8400-e29b-41d4-a716-446655440005',
    'The Scorched Wastes',
    'The Scorched Wastes were created by the fall of Ember Tower. What was once fertile farmland is now a desolate expanse of blackened earth and twisted metal. The area radiates residual magical energy, making it dangerous to traverse without protection. Scavengers risk the journey to recover valuable magical artifacts from the tower ruins, but many never return. Strange creatures born from fire magic prowl the wastes, and the temperature remains unnaturally hot even in winter. The Forest Guild has declared the wastes forbidden territory.',
    'Eastern Wastes',
    ARRAY['scorched wastes', 'ember tower', 'danger', 'magic', 'ruins', 'artifacts']
)
ON CONFLICT (id) DO NOTHING;

-- ====================================================================================
-- SEED EXAMPLE PLAYER (for testing)
-- ====================================================================================

INSERT INTO players (id, username, class, faction, level, xp, inventory, reputation)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'TobyTheExplorer',
    'Ranger',
    'Forest Guild',
    1,
    0,
    '[]'::jsonb,
    0
)
ON CONFLICT (username) DO NOTHING;

-- ====================================================================================
-- SEED EXAMPLE GAME EVENT (for testing emergent gameplay)
-- ====================================================================================

-- This demonstrates the game event system
-- In production, these would be created by API calls
INSERT INTO game_events (player_id, event_type, location, metadata)
VALUES
(
    '550e8400-e29b-41d4-a716-446655440000',
    'explore',
    'Moonvale',
    '{"action": "arrived_at_village", "timestamp": "2026-03-13T10:00:00Z"}'::jsonb
),
(
    '550e8400-e29b-41d4-a716-446655440000',
    'npc_conversation',
    'Moonvale',
    '{"npc": "Elarin", "topic": "village_history"}'::jsonb
)
ON CONFLICT DO NOTHING;

-- ====================================================================================
-- COMPLETION LOG
-- ====================================================================================

DO $$
BEGIN
    RAISE NOTICE 'Seed data migration completed successfully';
    RAISE NOTICE 'NPCs created: 3 (Elarin, Garrick, Lyra)';
    RAISE NOTICE 'Lore entries created: 5';
    RAISE NOTICE 'Test player created: TobyTheExplorer';
    RAISE NOTICE 'Sample game events created: 2';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Generate embeddings for lore entries using OpenAI API';
    RAISE NOTICE '2. Update lore.embedding column with generated vectors';
    RAISE NOTICE '3. Test vector search functionality';
END;
$$;
