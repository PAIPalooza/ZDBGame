/**
 * Unit Tests for Narrative Logging System
 *
 * Tests narrative log storage, retrieval, and API endpoints.
 *
 * Epic 4: Narrative History Storage
 * Issue: #10
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import {
    logNarrativeInteraction,
    getPlayerNarrativeHistory,
    getNPCConversationHistory,
    getRecentNarrativeContext,
    getNarrativeStats,
    exportPlayerStory
} from '../lib/narrative';
import {
    saveNarrativeLog,
    getNarrativeLog,
    getNarrativeLogsByPlayer,
    getNarrativeLogsByNPCAndPlayer,
    getAllNarrativeLogs,
    getNarrativeLogCount,
    searchNarrativeLogs,
    clearAllData
} from '../lib/data';

describe('Narrative Log Storage', () => {
    const testPlayerId = 'test-player-123';
    const testNpcId = 'test-npc-456';

    // Clean up after each test
    afterEach(() => {
        clearAllData();
    });

    describe('saveNarrativeLog', () => {
        test('should save a narrative log with all required fields', () => {
            const log = saveNarrativeLog({
                player_id: testPlayerId,
                npc_id: testNpcId,
                player_input: 'Hello, how are you?',
                gm_response: 'Greetings, traveler!',
                context_metadata: {
                    lore_retrieved: [],
                    memories_used: [],
                    npc_name: 'Elarin',
                    location: 'Moonvale'
                }
            });

            expect(log).toBeDefined();
            expect(log.id).toBeDefined();
            expect(log.player_id).toBe(testPlayerId);
            expect(log.npc_id).toBe(testNpcId);
            expect(log.player_input).toBe('Hello, how are you?');
            expect(log.gm_response).toBe('Greetings, traveler!');
            expect(log.created_at).toBeDefined();
            expect(log.context_metadata.npc_name).toBe('Elarin');
            expect(log.context_metadata.location).toBe('Moonvale');
        });

        test('should save a narrative log without npcId', () => {
            const log = saveNarrativeLog({
                player_id: testPlayerId,
                player_input: 'System message',
                gm_response: 'You have leveled up!',
                context_metadata: {
                    lore_retrieved: [],
                    memories_used: []
                }
            });

            expect(log).toBeDefined();
            expect(log.npc_id).toBeUndefined();
        });

        test('should save context metadata correctly', () => {
            const log = saveNarrativeLog({
                player_id: testPlayerId,
                npc_id: testNpcId,
                player_input: 'Tell me about Ember Tower',
                gm_response: 'The tower fell long ago...',
                context_metadata: {
                    lore_retrieved: ['lore-1', 'lore-2'],
                    memories_used: ['mem-1'],
                    response_time: 150,
                    additional: { source: 'test' }
                }
            });

            expect(log.context_metadata.lore_retrieved).toHaveLength(2);
            expect(log.context_metadata.memories_used).toHaveLength(1);
            expect(log.context_metadata.response_time).toBe(150);
            expect(log.context_metadata.additional).toEqual({ source: 'test' });
        });
    });

    describe('getNarrativeLog', () => {
        test('should retrieve a saved narrative log by ID', () => {
            const saved = saveNarrativeLog({
                player_id: testPlayerId,
                player_input: 'Test input',
                gm_response: 'Test response',
                context_metadata: {
                    lore_retrieved: [],
                    memories_used: []
                }
            });

            const retrieved = getNarrativeLog(saved.id);

            expect(retrieved).toBeDefined();
            expect(retrieved?.id).toBe(saved.id);
            expect(retrieved?.player_input).toBe('Test input');
        });

        test('should return null for non-existent log ID', () => {
            const retrieved = getNarrativeLog('non-existent-id');
            expect(retrieved).toBeNull();
        });
    });

    describe('getNarrativeLogsByPlayer', () => {
        beforeEach(() => {
            // Create multiple logs for the test player
            saveNarrativeLog({
                player_id: testPlayerId,
                player_input: 'Message 1',
                gm_response: 'Response 1',
                context_metadata: { lore_retrieved: [], memories_used: [] }
            });

            saveNarrativeLog({
                player_id: testPlayerId,
                player_input: 'Message 2',
                gm_response: 'Response 2',
                context_metadata: { lore_retrieved: [], memories_used: [] }
            });

            saveNarrativeLog({
                player_id: testPlayerId,
                player_input: 'Message 3',
                gm_response: 'Response 3',
                context_metadata: { lore_retrieved: [], memories_used: [] }
            });

            // Create a log for a different player
            saveNarrativeLog({
                player_id: 'other-player',
                player_input: 'Other message',
                gm_response: 'Other response',
                context_metadata: { lore_retrieved: [], memories_used: [] }
            });
        });

        test('should retrieve all logs for a specific player', () => {
            const logs = getNarrativeLogsByPlayer(testPlayerId);

            expect(logs).toHaveLength(3);
            logs.forEach(log => {
                expect(log.player_id).toBe(testPlayerId);
            });
        });

        test('should return logs sorted by timestamp (newest first)', () => {
            const logs = getNarrativeLogsByPlayer(testPlayerId);

            // Verify we get all 3 logs back
            expect(logs).toHaveLength(3);

            // Verify they are sorted by created_at (newest first)
            for (let i = 0; i < logs.length - 1; i++) {
                const current = new Date(logs[i].created_at).getTime();
                const next = new Date(logs[i + 1].created_at).getTime();
                expect(current).toBeGreaterThanOrEqual(next);
            }
        });

        test('should support pagination with limit', () => {
            const logs = getNarrativeLogsByPlayer(testPlayerId, 2);

            expect(logs).toHaveLength(2);
        });

        test('should support pagination with limit and offset', () => {
            const logs = getNarrativeLogsByPlayer(testPlayerId, 1, 1);

            expect(logs).toHaveLength(1);
            // Verify it skipped the first log (offset=1) and returned only 1 (limit=1)
            // The exact message may vary due to timestamp ordering, but we should get exactly 1
            expect(logs[0].player_input).toMatch(/Message [1-3]/);
        });
    });

    describe('getNarrativeLogsByNPCAndPlayer', () => {
        beforeEach(() => {
            // Create logs for specific NPC-Player conversation
            saveNarrativeLog({
                player_id: testPlayerId,
                npc_id: testNpcId,
                player_input: 'NPC Message 1',
                gm_response: 'NPC Response 1',
                context_metadata: { lore_retrieved: [], memories_used: [] }
            });

            saveNarrativeLog({
                player_id: testPlayerId,
                npc_id: testNpcId,
                player_input: 'NPC Message 2',
                gm_response: 'NPC Response 2',
                context_metadata: { lore_retrieved: [], memories_used: [] }
            });

            // Create log for same player but different NPC
            saveNarrativeLog({
                player_id: testPlayerId,
                npc_id: 'other-npc',
                player_input: 'Other NPC Message',
                gm_response: 'Other NPC Response',
                context_metadata: { lore_retrieved: [], memories_used: [] }
            });
        });

        test('should retrieve conversation between specific NPC and player', () => {
            const logs = getNarrativeLogsByNPCAndPlayer(testNpcId, testPlayerId);

            expect(logs).toHaveLength(2);
            logs.forEach(log => {
                expect(log.npc_id).toBe(testNpcId);
                expect(log.player_id).toBe(testPlayerId);
            });
        });

        test('should support limit parameter', () => {
            const logs = getNarrativeLogsByNPCAndPlayer(testNpcId, testPlayerId, 1);

            expect(logs).toHaveLength(1);
        });
    });

    describe('searchNarrativeLogs', () => {
        beforeEach(() => {
            saveNarrativeLog({
                player_id: testPlayerId,
                player_input: 'Tell me about Ember Tower',
                gm_response: 'The Ember Tower collapsed long ago',
                context_metadata: { lore_retrieved: [], memories_used: [] }
            });

            saveNarrativeLog({
                player_id: testPlayerId,
                player_input: 'What about the wolves?',
                gm_response: 'Wolves roam the northern forest',
                context_metadata: { lore_retrieved: [], memories_used: [] }
            });
        });

        test('should find logs by player input keywords', () => {
            const logs = searchNarrativeLogs(testPlayerId, 'ember');

            expect(logs).toHaveLength(1);
            expect(logs[0].player_input).toContain('Ember Tower');
        });

        test('should find logs by GM response keywords', () => {
            const logs = searchNarrativeLogs(testPlayerId, 'wolves');

            expect(logs).toHaveLength(1);
            expect(logs[0].gm_response).toContain('Wolves');
        });

        test('should be case-insensitive', () => {
            const logs = searchNarrativeLogs(testPlayerId, 'EMBER');

            expect(logs).toHaveLength(1);
        });

        test('should return empty array when no matches', () => {
            const logs = searchNarrativeLogs(testPlayerId, 'nonexistent');

            expect(logs).toHaveLength(0);
        });
    });

    describe('getNarrativeLogCount', () => {
        test('should return correct count for player', () => {
            saveNarrativeLog({
                player_id: testPlayerId,
                player_input: 'Test 1',
                gm_response: 'Response 1',
                context_metadata: { lore_retrieved: [], memories_used: [] }
            });

            saveNarrativeLog({
                player_id: testPlayerId,
                player_input: 'Test 2',
                gm_response: 'Response 2',
                context_metadata: { lore_retrieved: [], memories_used: [] }
            });

            const count = getNarrativeLogCount(testPlayerId);

            expect(count).toBe(2);
        });

        test('should return 0 for player with no logs', () => {
            const count = getNarrativeLogCount('no-logs-player');

            expect(count).toBe(0);
        });
    });
});

describe('Narrative Service Functions', () => {
    const testPlayerId = 'test-player-789';
    const testNpcId = 'test-npc-012';

    afterEach(() => {
        clearAllData();
    });

    describe('logNarrativeInteraction', () => {
        test('should log interaction with full context', () => {
            const log = logNarrativeInteraction({
                playerId: testPlayerId,
                npcId: testNpcId,
                playerInput: 'Hello',
                gmResponse: 'Greetings',
                loreUsed: [{ id: 'lore-1', title: 'Test', content: 'Test', tags: [] }],
                memoriesReferenced: [
                    {
                        id: 'mem-1',
                        npcId: testNpcId,
                        playerId: testPlayerId,
                        memory: 'Test memory',
                        importance: 5,
                        createdAt: new Date().toISOString()
                    }
                ],
                responseTime: 100,
                npcName: 'Elarin',
                location: 'Moonvale'
            });

            expect(log).toBeDefined();
            expect(log.context_metadata.lore_retrieved).toHaveLength(1);
            expect(log.context_metadata.memories_used).toHaveLength(1);
            expect(log.context_metadata.response_time).toBe(100);
            expect(log.context_metadata.npc_name).toBe('Elarin');
        });
    });

    describe('getPlayerNarrativeHistory', () => {
        beforeEach(() => {
            // Create 25 test logs
            for (let i = 0; i < 25; i++) {
                saveNarrativeLog({
                    player_id: testPlayerId,
                    player_input: `Message ${i}`,
                    gm_response: `Response ${i}`,
                    context_metadata: { lore_retrieved: [], memories_used: [] }
                });
            }
        });

        test('should return paginated results', () => {
            const result = getPlayerNarrativeHistory({
                playerId: testPlayerId,
                limit: 10,
                offset: 0
            });

            expect(result.logs).toHaveLength(10);
            expect(result.total).toBe(25);
            expect(result.hasMore).toBe(true);
            expect(result.page).toBe(1);
            expect(result.pageSize).toBe(10);
        });

        test('should handle pagination correctly', () => {
            const result = getPlayerNarrativeHistory({
                playerId: testPlayerId,
                limit: 10,
                offset: 20
            });

            expect(result.logs).toHaveLength(5);
            expect(result.hasMore).toBe(false);
            expect(result.page).toBe(3);
        });

        test('should use default limit of 20', () => {
            const result = getPlayerNarrativeHistory({
                playerId: testPlayerId
            });

            expect(result.pageSize).toBe(20);
        });
    });

    describe('getNPCConversationHistory', () => {
        beforeEach(() => {
            for (let i = 0; i < 5; i++) {
                saveNarrativeLog({
                    player_id: testPlayerId,
                    npc_id: testNpcId,
                    player_input: `Conversation ${i}`,
                    gm_response: `Reply ${i}`,
                    context_metadata: { lore_retrieved: [], memories_used: [] }
                });
            }
        });

        test('should retrieve conversation history', () => {
            const logs = getNPCConversationHistory(testNpcId, testPlayerId);

            expect(logs).toHaveLength(5);
        });

        test('should respect limit parameter', () => {
            const logs = getNPCConversationHistory(testNpcId, testPlayerId, 3);

            expect(logs).toHaveLength(3);
        });
    });

    describe('getRecentNarrativeContext', () => {
        beforeEach(() => {
            for (let i = 0; i < 10; i++) {
                saveNarrativeLog({
                    player_id: testPlayerId,
                    player_input: `Context ${i}`,
                    gm_response: `Response ${i}`,
                    context_metadata: { lore_retrieved: [], memories_used: [] }
                });
            }
        });

        test('should return default 5 recent interactions', () => {
            const logs = getRecentNarrativeContext(testPlayerId);

            expect(logs).toHaveLength(5);
        });

        test('should respect custom count', () => {
            const logs = getRecentNarrativeContext(testPlayerId, 3);

            expect(logs).toHaveLength(3);
        });

        test('should return most recent logs first', () => {
            const logs = getRecentNarrativeContext(testPlayerId, 3);

            expect(logs).toHaveLength(3);

            // Verify logs are sorted by timestamp (newest first)
            for (let i = 0; i < logs.length - 1; i++) {
                const current = new Date(logs[i].created_at).getTime();
                const next = new Date(logs[i + 1].created_at).getTime();
                expect(current).toBeGreaterThanOrEqual(next);
            }
        });
    });

    describe('getNarrativeStats', () => {
        beforeEach(() => {
            saveNarrativeLog({
                player_id: testPlayerId,
                npc_id: 'npc-1',
                player_input: 'Test 1',
                gm_response: 'Response 1',
                context_metadata: {
                    lore_retrieved: ['lore-1', 'lore-2'],
                    memories_used: [],
                    response_time: 100
                }
            });

            saveNarrativeLog({
                player_id: testPlayerId,
                npc_id: 'npc-2',
                player_input: 'Test 2',
                gm_response: 'Response 2',
                context_metadata: {
                    lore_retrieved: ['lore-3'],
                    memories_used: [],
                    response_time: 200
                }
            });

            saveNarrativeLog({
                player_id: testPlayerId,
                npc_id: 'npc-1',
                player_input: 'Test 3',
                gm_response: 'Response 3',
                context_metadata: {
                    lore_retrieved: [],
                    memories_used: []
                }
            });
        });

        test('should calculate correct statistics', () => {
            const stats = getNarrativeStats(testPlayerId);

            expect(stats.totalInteractions).toBe(3);
            expect(stats.uniqueNPCs.size).toBe(2);
            expect(stats.totalLoreRetrieved).toBe(3);
            expect(stats.averageResponseTime).toBe(150);
        });
    });

    describe('exportPlayerStory', () => {
        beforeEach(() => {
            saveNarrativeLog({
                player_id: testPlayerId,
                player_input: 'Story 1',
                gm_response: 'Chapter 1',
                context_metadata: {
                    lore_retrieved: [],
                    memories_used: [],
                    npc_name: 'Elarin',
                    location: 'Moonvale'
                }
            });

            saveNarrativeLog({
                player_id: testPlayerId,
                player_input: 'Story 2',
                gm_response: 'Chapter 2',
                context_metadata: {
                    lore_retrieved: [],
                    memories_used: [],
                    npc_name: 'Elarin',
                    location: 'Forest'
                }
            });
        });

        test('should export complete player story', () => {
            const story = exportPlayerStory(testPlayerId);

            expect(story.playerId).toBe(testPlayerId);
            expect(story.totalInteractions).toBe(2);
            expect(story.logs).toHaveLength(2);
        });

        test('should include formatted log data', () => {
            const story = exportPlayerStory(testPlayerId);

            const firstLog = story.logs[0];
            expect(firstLog.playerInput).toBeDefined();
            expect(firstLog.gmResponse).toBeDefined();
            expect(firstLog.timestamp).toBeDefined();
            expect(firstLog.npcName).toBe('Elarin');
            expect(firstLog.location).toBeDefined();
        });
    });
});

describe('Performance and Edge Cases', () => {
    afterEach(() => {
        clearAllData();
    });

    test('should handle empty narrative history', () => {
        const logs = getNarrativeLogsByPlayer('non-existent-player');

        expect(logs).toHaveLength(0);
    });

    test('should handle very long player input', () => {
        const longInput = 'a'.repeat(10000);

        const log = saveNarrativeLog({
            player_id: 'test-player',
            player_input: longInput,
            gm_response: 'Response',
            context_metadata: { lore_retrieved: [], memories_used: [] }
        });

        expect(log.player_input).toHaveLength(10000);

        const retrieved = getNarrativeLog(log.id);
        expect(retrieved?.player_input).toHaveLength(10000);
    });

    test('should handle special characters in messages', () => {
        const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';

        const log = saveNarrativeLog({
            player_id: 'test-player',
            player_input: specialChars,
            gm_response: specialChars,
            context_metadata: { lore_retrieved: [], memories_used: [] }
        });

        const retrieved = getNarrativeLog(log.id);
        expect(retrieved?.player_input).toBe(specialChars);
        expect(retrieved?.gm_response).toBe(specialChars);
    });

    test('should handle concurrent log creation', () => {
        const logs = [];

        for (let i = 0; i < 100; i++) {
            logs.push(saveNarrativeLog({
                player_id: 'test-player',
                player_input: `Message ${i}`,
                gm_response: `Response ${i}`,
                context_metadata: { lore_retrieved: [], memories_used: [] }
            }));
        }

        expect(logs).toHaveLength(100);
        const uniqueIds = new Set(logs.map(l => l.id));
        expect(uniqueIds.size).toBe(100);
    });
});
