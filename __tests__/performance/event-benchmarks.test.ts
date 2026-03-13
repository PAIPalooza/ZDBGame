/**
 * Performance benchmarks for gameplay event logging
 * Tests event creation and retrieval performance with indexed file storage
 *
 * Refs #4 (Epic 2: Gameplay Event Logging - Performance Benchmarks)
 */

import { createGameplayEvent, countWolfKillsForPlayer } from '@/lib/game-engine';
import { clearAllData, savePlayer, getGameEvents, getAllGameEvents } from '@/lib/data';
import type { GameEventType } from '@/lib/game-engine';

describe('Event Performance Benchmarks', () => {
    let testPlayerId: string;

    beforeAll(() => {
        clearAllData();
        const player = savePlayer({
            username: 'BenchmarkPlayer',
            class: 'Ranger',
            faction: 'Forest Guild',
            level: 1,
            xp: 0,
            inventory: [],
            reputation: 0,
        });
        testPlayerId = player.id;
    });

    afterAll(() => {
        clearAllData();
    });

    describe('Event Creation Performance', () => {
        it('should create 100 events in under 1000ms', () => {
            const eventTypes: GameEventType[] = ['explore', 'combat', 'conversation', 'quest', 'discovery'];
            const startTime = Date.now();

            for (let i = 0; i < 100; i++) {
                const eventType = eventTypes[i % 5];
                createGameplayEvent(
                    testPlayerId,
                    eventType,
                    `Performance test event ${i}`,
                    'Moonvale',
                    { index: i }
                );
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            console.log(`Created 100 events in ${duration}ms`);
            expect(duration).toBeLessThan(1000); // Should complete within 1 second
        });

        it('should create events with consistent performance', () => {
            const durations: number[] = [];

            for (let batch = 0; batch < 5; batch++) {
                const startTime = Date.now();

                for (let i = 0; i < 20; i++) {
                    createGameplayEvent(
                        testPlayerId,
                        'explore',
                        `Batch ${batch} event ${i}`,
                        'Moonvale'
                    );
                }

                const duration = Date.now() - startTime;
                durations.push(duration);
            }

            // Calculate variance
            const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
            const variance = durations.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / durations.length;
            const stdDev = Math.sqrt(variance);

            console.log(`Average batch time: ${avg.toFixed(2)}ms`);
            console.log(`Standard deviation: ${stdDev.toFixed(2)}ms`);

            // Standard deviation should be low (consistent performance)
            expect(stdDev).toBeLessThan(avg * 0.5); // Less than 50% variance
        });
    });

    describe('Event Retrieval Performance with Indexes', () => {
        beforeAll(() => {
            // Create test data: 200 events across different types and players
            clearAllData();

            const player1 = savePlayer({
                username: 'Player1',
                class: 'Warrior',
                faction: 'Forest Guild',
                level: 1,
                xp: 0,
                inventory: [],
                reputation: 0,
            });

            const player2 = savePlayer({
                username: 'Player2',
                class: 'Mage',
                faction: 'Forest Guild',
                level: 1,
                xp: 0,
                inventory: [],
                reputation: 0,
            });

            const eventTypes: GameEventType[] = ['explore', 'combat', 'conversation', 'quest', 'discovery'];

            // Create 100 events for each player
            for (let i = 0; i < 100; i++) {
                const eventType = eventTypes[i % 5];
                createGameplayEvent(player1.id, eventType, `P1 Event ${i}`, 'Moonvale');
                createGameplayEvent(player2.id, eventType, `P2 Event ${i}`, 'Moonvale');
            }

            testPlayerId = player1.id;
        });

        it('should retrieve all events in under 200ms', () => {
            const startTime = Date.now();
            const events = getAllGameEvents();
            const duration = Date.now() - startTime;

            console.log(`Retrieved ${events.length} events in ${duration}ms`);
            expect(events.length).toBe(200);
            expect(duration).toBeLessThan(200);
        });

        it('should filter events by playerId efficiently (indexed)', () => {
            const startTime = Date.now();
            const playerEvents = getGameEvents(testPlayerId);
            const duration = Date.now() - startTime;

            console.log(`Filtered ${playerEvents.length} events by playerId in ${duration}ms`);
            expect(playerEvents.length).toBe(100);
            expect(duration).toBeLessThan(100); // Should be fast due to filename indexing
        });

        it('should filter events by eventType efficiently (indexed)', () => {
            const startTime = Date.now();
            const combatEvents = getGameEvents(undefined, 'combat');
            const duration = Date.now() - startTime;

            console.log(`Filtered ${combatEvents.length} combat events in ${duration}ms`);
            expect(combatEvents.length).toBe(40); // 20 per player
            expect(duration).toBeLessThan(100); // Should be fast due to filename indexing
        });

        it('should filter events by both playerId and eventType efficiently (double-indexed)', () => {
            const startTime = Date.now();
            const playerCombatEvents = getGameEvents(testPlayerId, 'combat');
            const duration = Date.now() - startTime;

            console.log(`Filtered ${playerCombatEvents.length} player combat events in ${duration}ms`);
            expect(playerCombatEvents.length).toBe(20);
            expect(duration).toBeLessThan(50); // Should be very fast with both indexes
        });

        it('should demonstrate performance improvement with indexes vs full scan', () => {
            // Measure indexed retrieval
            const indexedStart = Date.now();
            const indexedResults = getGameEvents(testPlayerId, 'quest');
            const indexedDuration = Date.now() - indexedStart;

            // Measure full scan (get all then filter in memory)
            const fullScanStart = Date.now();
            const allEvents = getAllGameEvents();
            const fullScanResults = allEvents.filter(
                e => e.player_id === testPlayerId && e.event_type === 'quest'
            );
            const fullScanDuration = Date.now() - fullScanStart;

            console.log(`Indexed retrieval: ${indexedDuration}ms`);
            console.log(`Full scan retrieval: ${fullScanDuration}ms`);
            console.log(`Performance improvement: ${((fullScanDuration - indexedDuration) / fullScanDuration * 100).toFixed(1)}%`);

            expect(indexedResults.length).toBe(fullScanResults.length);
            expect(indexedDuration).toBeLessThanOrEqual(fullScanDuration);
        });
    });

    describe('Wolf Kill Counting Performance', () => {
        beforeAll(() => {
            clearAllData();
            const player = savePlayer({
                username: 'WolfHunter',
                class: 'Ranger',
                faction: 'Forest Guild',
                level: 1,
                xp: 0,
                inventory: [],
                reputation: 0,
            });
            testPlayerId = player.id;

            // Create mix of combat events
            for (let i = 0; i < 50; i++) {
                createGameplayEvent(
                    testPlayerId,
                    'combat',
                    `Combat ${i}`,
                    'Moonvale',
                    { enemyType: i % 3 === 0 ? 'wolf' : 'goblin' }
                );
            }
        });

        it('should count wolf kills efficiently', () => {
            const startTime = Date.now();
            const wolfKillCount = countWolfKillsForPlayer(testPlayerId);
            const duration = Date.now() - startTime;

            console.log(`Counted ${wolfKillCount} wolf kills in ${duration}ms`);
            expect(wolfKillCount).toBe(17); // 50 / 3 = 16.67, rounded up
            expect(duration).toBeLessThan(50);
        });
    });

    describe('Concurrent Event Creation', () => {
        it('should handle concurrent event creation without data corruption', async () => {
            clearAllData();
            const player = savePlayer({
                username: 'ConcurrentPlayer',
                class: 'Warrior',
                faction: 'Forest Guild',
                level: 1,
                xp: 0,
                inventory: [],
                reputation: 0,
            });

            const promises = [];
            for (let i = 0; i < 20; i++) {
                promises.push(
                    Promise.resolve().then(() => {
                        createGameplayEvent(
                            player.id,
                            'explore',
                            `Concurrent event ${i}`,
                            'Moonvale'
                        );
                    })
                );
            }

            await Promise.all(promises);

            const events = getGameEvents(player.id);
            expect(events.length).toBe(20);

            // Verify all events have unique IDs
            const ids = events.map(e => e.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(20);
        });
    });

    describe('Event Retrieval Sorting Performance', () => {
        it('should sort large event sets by timestamp efficiently', () => {
            clearAllData();
            const player = savePlayer({
                username: 'SortPlayer',
                class: 'Mage',
                faction: 'Forest Guild',
                level: 1,
                xp: 0,
                inventory: [],
                reputation: 0,
            });

            // Create 100 events with varying timestamps
            for (let i = 0; i < 100; i++) {
                createGameplayEvent(
                    player.id,
                    'explore',
                    `Event ${i}`,
                    'Moonvale'
                );
            }

            const startTime = Date.now();
            const sortedEvents = getGameEvents(player.id);
            const duration = Date.now() - startTime;

            console.log(`Retrieved and sorted ${sortedEvents.length} events in ${duration}ms`);

            // Verify events are sorted newest first
            for (let i = 0; i < sortedEvents.length - 1; i++) {
                const current = new Date(sortedEvents[i].created_at).getTime();
                const next = new Date(sortedEvents[i + 1].created_at).getTime();
                expect(current).toBeGreaterThanOrEqual(next);
            }

            expect(duration).toBeLessThan(100);
        });
    });

    describe('Performance Metrics Summary', () => {
        it('should provide comprehensive performance metrics', () => {
            const metrics = {
                eventCreation: {
                    single: 0,
                    batch100: 0,
                },
                eventRetrieval: {
                    allEvents: 0,
                    byPlayer: 0,
                    byType: 0,
                    byPlayerAndType: 0,
                },
                wolfKillCounting: 0,
            };

            // Measure single event creation
            let start = Date.now();
            createGameplayEvent(testPlayerId, 'explore', 'Metric test');
            metrics.eventCreation.single = Date.now() - start;

            // Measure batch creation
            start = Date.now();
            for (let i = 0; i < 100; i++) {
                createGameplayEvent(testPlayerId, 'explore', `Batch ${i}`);
            }
            metrics.eventCreation.batch100 = Date.now() - start;

            // Measure retrievals
            start = Date.now();
            getAllGameEvents();
            metrics.eventRetrieval.allEvents = Date.now() - start;

            start = Date.now();
            getGameEvents(testPlayerId);
            metrics.eventRetrieval.byPlayer = Date.now() - start;

            start = Date.now();
            getGameEvents(undefined, 'explore');
            metrics.eventRetrieval.byType = Date.now() - start;

            start = Date.now();
            getGameEvents(testPlayerId, 'explore');
            metrics.eventRetrieval.byPlayerAndType = Date.now() - start;

            start = Date.now();
            countWolfKillsForPlayer(testPlayerId);
            metrics.wolfKillCounting = Date.now() - start;

            console.log('Performance Metrics Summary:');
            console.log(JSON.stringify(metrics, null, 2));

            // All operations should complete reasonably fast
            expect(metrics.eventCreation.single).toBeLessThan(50);
            expect(metrics.eventCreation.batch100).toBeLessThan(1000);
            expect(metrics.eventRetrieval.allEvents).toBeLessThan(200);
            expect(metrics.eventRetrieval.byPlayer).toBeLessThan(100);
            expect(metrics.eventRetrieval.byType).toBeLessThan(100);
            expect(metrics.eventRetrieval.byPlayerAndType).toBeLessThan(50);
            expect(metrics.wolfKillCounting).toBeLessThan(50);
        });
    });
});
