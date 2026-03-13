/**
 * Integration tests for POST /api/event/create
 * Tests all 5 event types: explore, combat, conversation, quest, discovery
 * Also tests legacy event type support and Wolf Pack Retreat trigger
 *
 * Refs #4 (Epic 2: Gameplay Event Logging)
 */

import { POST } from '@/app/api/event/create/route';
import { clearAllData, savePlayer } from '@/lib/data';
import { NextRequest } from 'next/server';

describe('POST /api/event/create', () => {
    let testPlayerId: string;

    beforeEach(() => {
        // Clear all data before each test
        clearAllData();

        // Create a test player
        const player = savePlayer({
            username: 'TestPlayer',
            class: 'Ranger',
            faction: 'Forest Guild',
            level: 1,
            xp: 0,
            inventory: [],
            reputation: 0,
        });
        testPlayerId = player.id;
    });

    afterEach(() => {
        // Clean up after each test
        clearAllData();
    });

    describe('Event Type: explore', () => {
        it('should create an explore event successfully', async () => {
            const request = new NextRequest('http://localhost:3000/api/event/create', {
                method: 'POST',
                body: JSON.stringify({
                    playerId: testPlayerId,
                    eventType: 'explore',
                    description: 'Player explored the northern forest',
                    location: 'Northern Forest',
                    metadata: {
                        area: 'forest',
                        difficulty: 'easy'
                    }
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.success).toBe(true);
            expect(data.gameEvent).toBeDefined();
            expect(data.gameEvent.event_type).toBe('explore');
            expect(data.gameEvent.player_id).toBe(testPlayerId);
            expect(data.gameEvent.location).toBe('Northern Forest');
            expect(data.worldEvent).toBeNull();
        });

        it('should store explore event with metadata', async () => {
            const metadata = {
                area: 'mountain',
                discovered_items: ['old_map', 'rusty_sword'],
                xp_gained: 10
            };

            const request = new NextRequest('http://localhost:3000/api/event/create', {
                method: 'POST',
                body: JSON.stringify({
                    playerId: testPlayerId,
                    eventType: 'explore',
                    description: 'Explored mountain pass',
                    metadata
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.gameEvent.metadata.area).toBe('mountain');
            expect(data.gameEvent.metadata.discovered_items).toEqual(['old_map', 'rusty_sword']);
        });
    });

    describe('Event Type: combat', () => {
        it('should create a combat event successfully', async () => {
            const request = new NextRequest('http://localhost:3000/api/event/create', {
                method: 'POST',
                body: JSON.stringify({
                    playerId: testPlayerId,
                    eventType: 'combat',
                    description: 'Player defeated a goblin',
                    location: 'Moonvale',
                    metadata: {
                        enemyType: 'goblin',
                        difficulty: 'medium',
                        victory: true
                    }
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.success).toBe(true);
            expect(data.gameEvent.event_type).toBe('combat');
            expect(data.gameEvent.metadata.enemyType).toBe('goblin');
        });

        it('should create a wolf combat event and track for Wolf Pack Retreat', async () => {
            const request = new NextRequest('http://localhost:3000/api/event/create', {
                method: 'POST',
                body: JSON.stringify({
                    playerId: testPlayerId,
                    eventType: 'combat',
                    description: 'Player defeated a wolf',
                    metadata: {
                        enemyType: 'wolf',
                        combatType: 'wolf'
                    }
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.gameEvent.event_type).toBe('combat');
            expect(data.gameEvent.metadata.enemyType).toBe('wolf');
            expect(data.worldEvent).toBeNull(); // Not triggered yet (need 3 kills)
        });

        it('should trigger Wolf Pack Retreat after 3 wolf combat events', async () => {
            // Create first two wolf combats
            for (let i = 0; i < 2; i++) {
                const request = new NextRequest('http://localhost:3000/api/event/create', {
                    method: 'POST',
                    body: JSON.stringify({
                        playerId: testPlayerId,
                        eventType: 'combat',
                        description: `Defeated wolf ${i + 1}`,
                        metadata: { enemyType: 'wolf' }
                    }),
                });
                await POST(request);
            }

            // Third wolf combat should trigger world event
            const request = new NextRequest('http://localhost:3000/api/event/create', {
                method: 'POST',
                body: JSON.stringify({
                    playerId: testPlayerId,
                    eventType: 'combat',
                    description: 'Defeated wolf 3',
                    metadata: { enemyType: 'wolf' }
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.worldEvent).not.toBeNull();
            expect(data.worldEvent.event_name).toBe('Wolf Pack Retreat');
            expect(data.message).toContain('world event');
        });
    });

    describe('Event Type: conversation', () => {
        it('should create a conversation event successfully', async () => {
            const request = new NextRequest('http://localhost:3000/api/event/create', {
                method: 'POST',
                body: JSON.stringify({
                    playerId: testPlayerId,
                    eventType: 'conversation',
                    description: 'Talked to Elarin about the Ember Tower',
                    location: 'Moonvale',
                    metadata: {
                        npcId: 'npc-123',
                        npcName: 'Elarin',
                        topic: 'Ember Tower'
                    }
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.success).toBe(true);
            expect(data.gameEvent.event_type).toBe('conversation');
            expect(data.gameEvent.metadata.npcName).toBe('Elarin');
        });
    });

    describe('Event Type: quest', () => {
        it('should create a quest event successfully', async () => {
            const request = new NextRequest('http://localhost:3000/api/event/create', {
                method: 'POST',
                body: JSON.stringify({
                    playerId: testPlayerId,
                    eventType: 'quest',
                    description: 'Helped repair the village wall',
                    location: 'Moonvale',
                    metadata: {
                        questId: 'repair_wall',
                        questStatus: 'completed',
                        reward: { xp: 50, gold: 20 }
                    }
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.success).toBe(true);
            expect(data.gameEvent.event_type).toBe('quest');
            expect(data.gameEvent.metadata.questStatus).toBe('completed');
        });
    });

    describe('Event Type: discovery', () => {
        it('should create a discovery event successfully', async () => {
            const request = new NextRequest('http://localhost:3000/api/event/create', {
                method: 'POST',
                body: JSON.stringify({
                    playerId: testPlayerId,
                    eventType: 'discovery',
                    description: 'Found ancient scroll in the ruins',
                    location: 'Ancient Ruins',
                    metadata: {
                        itemId: 'ancient_scroll',
                        itemType: 'lore',
                        rarity: 'rare'
                    }
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.success).toBe(true);
            expect(data.gameEvent.event_type).toBe('discovery');
            expect(data.gameEvent.metadata.itemType).toBe('lore');
        });

        it('should handle discovery of multiple items', async () => {
            const request = new NextRequest('http://localhost:3000/api/event/create', {
                method: 'POST',
                body: JSON.stringify({
                    playerId: testPlayerId,
                    eventType: 'discovery',
                    description: 'Discovered hidden treasure chest',
                    metadata: {
                        items: ['gold_coin', 'health_potion', 'magic_ring'],
                        totalValue: 150
                    }
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.gameEvent.metadata.items).toHaveLength(3);
        });
    });

    describe('Legacy Event Types', () => {
        it('should accept wolf_kill and map to combat', async () => {
            const request = new NextRequest('http://localhost:3000/api/event/create', {
                method: 'POST',
                body: JSON.stringify({
                    playerId: testPlayerId,
                    eventType: 'wolf_kill',
                    description: 'Defeated a wolf (legacy event)'
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.gameEvent.event_type).toBe('combat');
            expect(data.gameEvent.metadata.legacyEventType).toBe('wolf_kill');
        });

        it('should accept npc_conversation and map to conversation', async () => {
            const request = new NextRequest('http://localhost:3000/api/event/create', {
                method: 'POST',
                body: JSON.stringify({
                    playerId: testPlayerId,
                    eventType: 'npc_conversation',
                    description: 'Talked to NPC (legacy event)'
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.gameEvent.event_type).toBe('conversation');
            expect(data.gameEvent.metadata.legacyEventType).toBe('npc_conversation');
        });

        it('should accept help_village and map to quest', async () => {
            const request = new NextRequest('http://localhost:3000/api/event/create', {
                method: 'POST',
                body: JSON.stringify({
                    playerId: testPlayerId,
                    eventType: 'help_village',
                    description: 'Helped the village (legacy event)'
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.gameEvent.event_type).toBe('quest');
            expect(data.gameEvent.metadata.legacyEventType).toBe('help_village');
        });

        it('should trigger Wolf Pack Retreat with legacy wolf_kill events', async () => {
            // Create 3 legacy wolf_kill events
            for (let i = 0; i < 3; i++) {
                const request = new NextRequest('http://localhost:3000/api/event/create', {
                    method: 'POST',
                    body: JSON.stringify({
                        playerId: testPlayerId,
                        eventType: 'wolf_kill',
                        description: `Defeated wolf ${i + 1} (legacy)`
                    }),
                });
                const response = await POST(request);
                const data = await response.json();

                if (i === 2) {
                    expect(data.worldEvent).not.toBeNull();
                    expect(data.worldEvent.event_name).toBe('Wolf Pack Retreat');
                }
            }
        });
    });

    describe('Validation', () => {
        it('should reject request without playerId', async () => {
            const request = new NextRequest('http://localhost:3000/api/event/create', {
                method: 'POST',
                body: JSON.stringify({
                    eventType: 'explore',
                    description: 'Test'
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Validation failed');
        });

        it('should reject request without eventType', async () => {
            const request = new NextRequest('http://localhost:3000/api/event/create', {
                method: 'POST',
                body: JSON.stringify({
                    playerId: testPlayerId,
                    description: 'Test'
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Validation failed');
        });

        it('should reject invalid eventType', async () => {
            const request = new NextRequest('http://localhost:3000/api/event/create', {
                method: 'POST',
                body: JSON.stringify({
                    playerId: testPlayerId,
                    eventType: 'invalid_event',
                    description: 'Test'
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Invalid event type');
        });

        it('should reject invalid playerId format', async () => {
            const request = new NextRequest('http://localhost:3000/api/event/create', {
                method: 'POST',
                body: JSON.stringify({
                    playerId: 'not-a-valid-uuid',
                    eventType: 'explore',
                    description: 'Test'
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Invalid playerId format');
        });

        it('should use default description if not provided', async () => {
            const request = new NextRequest('http://localhost:3000/api/event/create', {
                method: 'POST',
                body: JSON.stringify({
                    playerId: testPlayerId,
                    eventType: 'explore'
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.gameEvent.metadata.description).toBe('explore event');
        });
    });

    describe('Performance and Indexing', () => {
        it('should create multiple events with indexed filenames', async () => {
            const eventTypes: Array<'explore' | 'combat' | 'conversation' | 'quest' | 'discovery'> = [
                'explore',
                'combat',
                'conversation',
                'quest',
                'discovery'
            ];

            for (const eventType of eventTypes) {
                const request = new NextRequest('http://localhost:3000/api/event/create', {
                    method: 'POST',
                    body: JSON.stringify({
                        playerId: testPlayerId,
                        eventType,
                        description: `${eventType} event test`
                    }),
                });

                const response = await POST(request);
                expect(response.status).toBe(201);
            }

            // All 5 event types should be created
            const { getAllGameEvents } = await import('@/lib/data');
            const allEvents = getAllGameEvents();
            expect(allEvents).toHaveLength(5);

            // Check each event type exists
            eventTypes.forEach(type => {
                expect(allEvents.some(e => e.event_type === type)).toBe(true);
            });
        });
    });
});
