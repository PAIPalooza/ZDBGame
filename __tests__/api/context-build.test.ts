/**
 * API Tests for /api/context/build endpoint
 *
 * Tests POST and GET methods for context building
 *
 * Refs: Epic 4 - Context Retrieval Engine
 * Issue: #8
 */

import { describe, expect, test, beforeEach } from '@jest/globals';
import { POST, GET } from '../../app/api/context/build/route';
import {
  savePlayer,
  saveNPC,
  saveNPCMemory,
  saveLore,
  saveGameEvent,
  saveWorldEvent,
  clearAllData
} from '../../lib/data';

// ============================================================================
// Setup
// ============================================================================

let testPlayerId: string;
let testNPCId: string;

beforeEach(() => {
  clearAllData();

  const player = savePlayer({
    username: 'APITestPlayer',
    class: 'Warrior',
    faction: 'Moonvale',
    level: 3,
    xp: 500,
    inventory: [],
    reputation: 25
  });
  testPlayerId = player.id;

  const npc = saveNPC({
    name: 'APITestNPC',
    role: 'Guard',
    location: 'Moonvale Gate',
    personality: { stern: true }
  });
  testNPCId = npc.id;
});

// ============================================================================
// POST Endpoint Tests
// ============================================================================

describe('POST /api/context/build', () => {
  test('should build context with valid request', async () => {
    // Add test data
    saveNPCMemory({
      npc_id: testNPCId,
      player_id: testPlayerId,
      memory: 'Player entered the village',
      importance: 5,
      metadata: {}
    });

    const request = new Request('http://localhost:3000/api/context/build', {
      method: 'POST',
      body: JSON.stringify({
        playerId: testPlayerId,
        npcId: testNPCId,
        query: 'test query',
        format: 'json'
      })
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.context).toBeDefined();
    expect(data.context.player).toBeDefined();
    expect(data.context.npc).toBeDefined();
    expect(data.context.metadata).toBeDefined();
  });

  test('should return formatted text when format is "text"', async () => {
    const request = new Request('http://localhost:3000/api/context/build', {
      method: 'POST',
      body: JSON.stringify({
        playerId: testPlayerId,
        npcId: testNPCId,
        query: 'test',
        format: 'text'
      })
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.formattedText).toBeDefined();
    expect(data.estimatedTokens).toBeDefined();
    expect(typeof data.formattedText).toBe('string');
    expect(data.formattedText).toContain('=== GAME CONTEXT ===');
  });

  test('should return error for missing playerId', async () => {
    const request = new Request('http://localhost:3000/api/context/build', {
      method: 'POST',
      body: JSON.stringify({
        npcId: testNPCId,
        query: 'test'
      })
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('playerId');
  });

  test('should return error for missing npcId', async () => {
    const request = new Request('http://localhost:3000/api/context/build', {
      method: 'POST',
      body: JSON.stringify({
        playerId: testPlayerId,
        query: 'test'
      })
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('npcId');
  });

  test('should return 404 for non-existent player', async () => {
    const request = new Request('http://localhost:3000/api/context/build', {
      method: 'POST',
      body: JSON.stringify({
        playerId: 'non-existent-player',
        npcId: testNPCId,
        query: 'test'
      })
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Player not found');
  });

  test('should return 404 for non-existent NPC', async () => {
    const request = new Request('http://localhost:3000/api/context/build', {
      method: 'POST',
      body: JSON.stringify({
        playerId: testPlayerId,
        npcId: 'non-existent-npc',
        query: 'test'
      })
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toContain('NPC not found');
  });

  test('should accept custom configuration', async () => {
    // Create multiple memories
    for (let i = 0; i < 10; i++) {
      saveNPCMemory({
        npc_id: testNPCId,
        player_id: testPlayerId,
        memory: `Memory ${i}`,
        importance: 5,
        metadata: {}
      });
    }

    const request = new Request('http://localhost:3000/api/context/build', {
      method: 'POST',
      body: JSON.stringify({
        playerId: testPlayerId,
        npcId: testNPCId,
        query: 'test',
        config: {
          maxMemories: 3,
          maxLore: 2
        }
      })
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.context.npcMemories.length).toBeLessThanOrEqual(3);
  });

  test('should return error for invalid configuration', async () => {
    const request = new Request('http://localhost:3000/api/context/build', {
      method: 'POST',
      body: JSON.stringify({
        playerId: testPlayerId,
        npcId: testNPCId,
        config: {
          maxMemories: -5 // Invalid
        }
      })
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid configuration');
  });

  test('should work without query parameter', async () => {
    const request = new Request('http://localhost:3000/api/context/build', {
      method: 'POST',
      body: JSON.stringify({
        playerId: testPlayerId,
        npcId: testNPCId
      })
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});

// ============================================================================
// GET Endpoint Tests
// ============================================================================

describe('GET /api/context/build', () => {
  test('should build context with query parameters', async () => {
    const url = new URL('http://localhost:3000/api/context/build');
    url.searchParams.set('playerId', testPlayerId);
    url.searchParams.set('npcId', testNPCId);
    url.searchParams.set('query', 'test query');

    const request = {
      method: 'GET',
      nextUrl: url
    };

    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.context).toBeDefined();
    expect(data.context.player).toBeDefined();
    expect(data.context.npc).toBeDefined();
  });

  test('should work without query parameter', async () => {
    const url = new URL('http://localhost:3000/api/context/build');
    url.searchParams.set('playerId', testPlayerId);
    url.searchParams.set('npcId', testNPCId);

    const request = {
      method: 'GET',
      nextUrl: url
    };

    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  test('should return error for missing playerId', async () => {
    const url = new URL('http://localhost:3000/api/context/build');
    url.searchParams.set('npcId', testNPCId);

    const request = {
      method: 'GET',
      nextUrl: url
    };

    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('playerId');
  });

  test('should return error for missing npcId', async () => {
    const url = new URL('http://localhost:3000/api/context/build');
    url.searchParams.set('playerId', testPlayerId);

    const request = {
      method: 'GET',
      nextUrl: url
    };

    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('npcId');
  });

  test('should return 404 for non-existent player', async () => {
    const url = new URL('http://localhost:3000/api/context/build');
    url.searchParams.set('playerId', 'non-existent');
    url.searchParams.set('npcId', testNPCId);

    const request = {
      method: 'GET',
      nextUrl: url
    };

    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Integration: Full Context Building', () => {
  test('should build comprehensive context with all data types', async () => {
    // Create comprehensive test data
    saveNPCMemory({
      npc_id: testNPCId,
      player_id: testPlayerId,
      memory: 'Player proved their worth',
      importance: 8,
      metadata: {}
    });

    saveNPCMemory({
      npc_id: testNPCId,
      player_id: testPlayerId,
      memory: 'Player asked about the village',
      importance: 3,
      metadata: {}
    });

    saveLore({
      title: 'Moonvale History',
      content: 'The village was founded by brave settlers',
      region: 'Moonvale',
      tags: ['moonvale', 'history', 'village']
    });

    saveGameEvent({
      player_id: testPlayerId,
      event_type: 'wolf_kill',
      location: 'Northern Forest',
      metadata: { description: 'Defeated dangerous wolf' }
    });

    saveWorldEvent({
      event_name: 'Village Festival',
      description: 'Moonvale celebrates the harvest',
      trigger_source: 'seasonal',
      metadata: {}
    });

    const request = new Request('http://localhost:3000/api/context/build', {
      method: 'POST',
      body: JSON.stringify({
        playerId: testPlayerId,
        npcId: testNPCId,
        query: 'village moonvale',
        format: 'text'
      })
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Verify context completeness
    expect(data.context.player.username).toBe('APITestPlayer');
    expect(data.context.npc.name).toBe('APITestNPC');
    expect(data.context.npcMemories.length).toBe(2);
    expect(data.context.relevantLore.length).toBeGreaterThan(0);
    expect(data.context.recentGameEvents.length).toBeGreaterThan(0);
    expect(data.context.recentWorldEvents.length).toBeGreaterThan(0);

    // Verify formatted output
    expect(data.formattedText).toContain('APITestPlayer');
    expect(data.formattedText).toContain('APITestNPC');
    expect(data.formattedText).toContain('Player proved their worth');
    expect(data.formattedText).toContain('Moonvale History');

    // Verify metadata
    expect(data.context.metadata.retrievalTimeMs).toBeGreaterThanOrEqual(0);
    expect(data.context.metadata.stats.memoriesFound).toBe(2);
    expect(data.estimatedTokens).toBeGreaterThan(0);
  });
});
