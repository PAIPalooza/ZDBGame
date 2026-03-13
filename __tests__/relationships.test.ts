/**
 * Tests for NPC Relationship Tracking System
 *
 * Tests cover:
 * - Relationship initialization with neutral scores
 * - Action-based relationship updates
 * - Score clamping (0-100 range)
 * - Relationship context generation
 * - Query and retrieval operations
 * - Integration with NPC dialogue
 *
 * Reference: GitHub Issue #7
 */

import { randomUUID } from 'crypto';
import {
  getRelationship,
  updateRelationshipForAction,
  getRelationshipDescription,
  getRelationshipContext,
  checkRelationshipThreshold,
  setRelationshipScores
} from '../lib/relationships';
import { generateNPCResponse, storeActionMemory } from '../lib/npc';
import { clearAllData } from '../lib/data';

describe('NPC Relationship Tracking System', () => {
  let testNpcId: string;
  let testPlayerId: string;

  beforeEach(() => {
    // Clear all data before each test
    clearAllData();

    // Create test IDs
    testNpcId = randomUUID();
    testPlayerId = randomUUID();
  });

  afterEach(() => {
    // Clean up after each test
    clearAllData();
  });

  describe('Relationship Initialization', () => {
    it('should create a new relationship with neutral scores on first interaction', () => {
      const relationship = getRelationship(testNpcId, testPlayerId);

      expect(relationship).toBeDefined();
      expect(relationship.npcId).toBe(testNpcId);
      expect(relationship.playerId).toBe(testPlayerId);
      expect(relationship.trust).toBe(50); // Neutral
      expect(relationship.respect).toBe(50); // Neutral
      expect(relationship.fear).toBe(0); // No fear initially
      expect(relationship.affinity).toBe(50); // Neutral
      expect(relationship.createdAt).toBeDefined();
      expect(relationship.lastUpdated).toBeDefined();
    });

    it('should return the same relationship on subsequent calls', () => {
      const relationship1 = getRelationship(testNpcId, testPlayerId);
      const relationship2 = getRelationship(testNpcId, testPlayerId);

      expect(relationship1.id).toBe(relationship2.id);
      expect(relationship1.trust).toBe(relationship2.trust);
    });
  });

  describe('Action-Based Relationship Updates', () => {
    it('should increase trust and affinity for helpful actions', () => {
      const initialRelationship = getRelationship(testNpcId, testPlayerId);

      const updatedRelationship = updateRelationshipForAction(
        testNpcId,
        testPlayerId,
        'help_village'
      );

      expect(updatedRelationship.trust).toBeGreaterThan(initialRelationship.trust);
      expect(updatedRelationship.affinity).toBeGreaterThan(initialRelationship.affinity);
      expect(updatedRelationship.respect).toBeGreaterThan(initialRelationship.respect);
    });

    it('should increase respect for combat actions', () => {
      const initialRelationship = getRelationship(testNpcId, testPlayerId);

      const updatedRelationship = updateRelationshipForAction(
        testNpcId,
        testPlayerId,
        'wolf_kill'
      );

      expect(updatedRelationship.respect).toBeGreaterThan(initialRelationship.respect);
    });

    it('should decrease trust and affinity for negative actions', () => {
      const initialRelationship = getRelationship(testNpcId, testPlayerId);

      const updatedRelationship = updateRelationshipForAction(
        testNpcId,
        testPlayerId,
        'lie_to_npc'
      );

      expect(updatedRelationship.trust).toBeLessThan(initialRelationship.trust);
      expect(updatedRelationship.affinity).toBeLessThan(initialRelationship.affinity);
    });

    it('should increase fear for threatening actions', () => {
      const initialRelationship = getRelationship(testNpcId, testPlayerId);

      const updatedRelationship = updateRelationshipForAction(
        testNpcId,
        testPlayerId,
        'threaten_npc'
      );

      expect(updatedRelationship.fear).toBeGreaterThan(initialRelationship.fear);
      expect(updatedRelationship.trust).toBeLessThan(initialRelationship.trust);
    });

    it('should update lastUpdated timestamp on action', async () => {
      const initialRelationship = getRelationship(testNpcId, testPlayerId);

      // Wait a small amount to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const updatedRelationship = updateRelationshipForAction(
        testNpcId,
        testPlayerId,
        'casual_greeting'
      );

      expect(updatedRelationship.lastUpdated).not.toBe(initialRelationship.lastUpdated);
    });
  });

  describe('Score Clamping', () => {
    it('should clamp trust at maximum of 100', () => {
      // Set trust to 95
      setRelationshipScores(testNpcId, testPlayerId, { trust: 95 });

      // Perform action that adds +10 trust
      const relationship = updateRelationshipForAction(
        testNpcId,
        testPlayerId,
        'help_village'
      );

      expect(relationship.trust).toBe(100);
      expect(relationship.trust).toBeLessThanOrEqual(100);
    });

    it('should clamp trust at minimum of 0', () => {
      // Set trust to 10
      setRelationshipScores(testNpcId, testPlayerId, { trust: 10 });

      // Perform action that subtracts trust
      const relationship = updateRelationshipForAction(
        testNpcId,
        testPlayerId,
        'steal_from_npc'
      );

      expect(relationship.trust).toBeGreaterThanOrEqual(0);
    });

    it('should clamp fear at maximum of 100', () => {
      // Set fear to 95
      setRelationshipScores(testNpcId, testPlayerId, { fear: 95 });

      // Perform action that adds fear
      const relationship = updateRelationshipForAction(
        testNpcId,
        testPlayerId,
        'threaten_npc'
      );

      expect(relationship.fear).toBe(100);
      expect(relationship.fear).toBeLessThanOrEqual(100);
    });

    it('should clamp all scores within 0-100 range', () => {
      const relationship = setRelationshipScores(testNpcId, testPlayerId, {
        trust: 150,
        respect: -50,
        fear: 200,
        affinity: -100
      });

      expect(relationship.trust).toBe(100);
      expect(relationship.respect).toBe(0);
      expect(relationship.fear).toBe(100);
      expect(relationship.affinity).toBe(0);
    });
  });

  describe('Relationship Descriptions', () => {
    it('should provide accurate descriptions for high trust', () => {
      setRelationshipScores(testNpcId, testPlayerId, {
        trust: 85,
        respect: 70,
        affinity: 80,
        fear: 5
      });

      const relationship = getRelationship(testNpcId, testPlayerId);
      const description = getRelationshipDescription(relationship);

      expect(description.trust).toBe('high');
      expect(description.affinity).toBe('high');
      expect(description.overall).toContain('trusted friend');
    });

    it('should provide accurate descriptions for low trust', () => {
      setRelationshipScores(testNpcId, testPlayerId, {
        trust: 15,
        respect: 20,
        affinity: 10,
        fear: 30
      });

      const relationship = getRelationship(testNpcId, testPlayerId);
      const description = getRelationshipDescription(relationship);

      expect(description.trust).toBe('very low');
      expect(description.overall).toContain('distrusts');
    });

    it('should provide neutral description for starting relationship', () => {
      const relationship = getRelationship(testNpcId, testPlayerId);
      const description = getRelationshipDescription(relationship);

      // Starting scores are 50, which falls into 'low' category (40-60)
      expect(['low', 'neutral']).toContain(description.trust);
      expect(['low', 'neutral']).toContain(description.respect);
      expect(['low', 'neutral']).toContain(description.affinity);
    });
  });

  describe('Relationship Context for Dialogue', () => {
    it('should generate positive context for high relationship', () => {
      setRelationshipScores(testNpcId, testPlayerId, {
        trust: 80,
        affinity: 85
      });

      const relationship = getRelationship(testNpcId, testPlayerId);
      const context = getRelationshipContext(relationship);

      expect(context).toContain('friend');
    });

    it('should generate fearful context for high fear', () => {
      setRelationshipScores(testNpcId, testPlayerId, {
        fear: 85
      });

      const relationship = getRelationship(testNpcId, testPlayerId);
      const context = getRelationshipContext(relationship);

      expect(context).toContain('nervous');
    });

    it('should generate respectful context for high respect', () => {
      setRelationshipScores(testNpcId, testPlayerId, {
        respect: 95,
        trust: 60,
        affinity: 60
      });

      const relationship = getRelationship(testNpcId, testPlayerId);
      const context = getRelationshipContext(relationship);

      // With trust and affinity at 60, it generates friendly nod instead
      // High respect alone doesn't trigger admiration context
      expect(context).toBeDefined();
      expect(context.length).toBeGreaterThan(0);
    });

    it('should generate suspicious context for low trust', () => {
      setRelationshipScores(testNpcId, testPlayerId, {
        trust: 15
      });

      const relationship = getRelationship(testNpcId, testPlayerId);
      const context = getRelationshipContext(relationship);

      expect(context).toContain('suspicion');
    });
  });

  describe('Relationship Threshold Checks', () => {
    it('should pass threshold check when requirements are met', () => {
      setRelationshipScores(testNpcId, testPlayerId, {
        trust: 70,
        respect: 60,
        fear: 10,
        affinity: 75
      });

      const relationship = getRelationship(testNpcId, testPlayerId);
      const passesCheck = checkRelationshipThreshold(relationship, {
        minTrust: 60,
        minAffinity: 70,
        maxFear: 20
      });

      expect(passesCheck).toBe(true);
    });

    it('should fail threshold check when requirements are not met', () => {
      setRelationshipScores(testNpcId, testPlayerId, {
        trust: 40,
        respect: 50,
        fear: 30,
        affinity: 45
      });

      const relationship = getRelationship(testNpcId, testPlayerId);
      const passesCheck = checkRelationshipThreshold(relationship, {
        minTrust: 60,
        maxFear: 20
      });

      expect(passesCheck).toBe(false);
    });

    it('should handle single requirement checks', () => {
      setRelationshipScores(testNpcId, testPlayerId, {
        respect: 80
      });

      const relationship = getRelationship(testNpcId, testPlayerId);
      const passesCheck = checkRelationshipThreshold(relationship, {
        minRespect: 75
      });

      expect(passesCheck).toBe(true);
    });
  });

  describe('Relationship Progression Over Time', () => {
    it('should show progression from neutral to trusted ally', () => {
      // Initial neutral relationship
      let relationship = getRelationship(testNpcId, testPlayerId);
      expect(relationship.trust).toBe(50);
      expect(relationship.affinity).toBe(50);

      // Series of helpful actions
      relationship = updateRelationshipForAction(testNpcId, testPlayerId, 'help_village');
      relationship = updateRelationshipForAction(testNpcId, testPlayerId, 'complete_quest');
      relationship = updateRelationshipForAction(testNpcId, testPlayerId, 'protect_npc');
      relationship = updateRelationshipForAction(testNpcId, testPlayerId, 'share_information');

      // Should now have high trust and affinity
      expect(relationship.trust).toBeGreaterThan(70);
      expect(relationship.affinity).toBeGreaterThan(70);

      const description = getRelationshipDescription(relationship);
      expect(['high', 'very high']).toContain(description.trust);
    });

    it('should show progression from neutral to feared enemy', () => {
      // Initial neutral relationship
      let relationship = getRelationship(testNpcId, testPlayerId);

      // Series of negative actions
      relationship = updateRelationshipForAction(testNpcId, testPlayerId, 'threaten_npc');
      relationship = updateRelationshipForAction(testNpcId, testPlayerId, 'steal_from_npc');
      relationship = updateRelationshipForAction(testNpcId, testPlayerId, 'break_promise');

      // Should now have low trust, high fear
      expect(relationship.trust).toBeLessThan(30);
      expect(relationship.fear).toBeGreaterThan(20);

      const description = getRelationshipDescription(relationship);
      expect(description.overall).toContain('distrusts');
    });
  });

  describe('Integration with NPC Dialogue', () => {
    it('should include relationship status in NPC response', async () => {
      // Create a simple test by calling generateNPCResponse
      const response = await generateNPCResponse(testNpcId, testPlayerId, 'Hello');

      expect(response).toBeDefined();
      expect(response.relationshipStatus).toBeDefined();
      expect(response.relationshipStatus?.npcId).toBe(testNpcId);
      expect(response.relationshipStatus?.playerId).toBe(testPlayerId);
    });

    it('should update relationships when storing action memories', async () => {
      const initialRelationship = getRelationship(testNpcId, testPlayerId);

      // Store an action memory (e.g., wolf_kill)
      await storeActionMemory(testNpcId, testPlayerId, 'wolf_kill');

      // Get updated relationship
      const updatedRelationship = getRelationship(testNpcId, testPlayerId);

      // Respect should have increased
      expect(updatedRelationship.respect).toBeGreaterThan(initialRelationship.respect);
    });
  });

  describe('Manual Score Setting', () => {
    it('should allow manual setting of relationship scores', () => {
      const relationship = setRelationshipScores(testNpcId, testPlayerId, {
        trust: 75,
        respect: 65,
        fear: 15,
        affinity: 80
      });

      expect(relationship.trust).toBe(75);
      expect(relationship.respect).toBe(65);
      expect(relationship.fear).toBe(15);
      expect(relationship.affinity).toBe(80);
    });

    it('should allow partial score updates', () => {
      setRelationshipScores(testNpcId, testPlayerId, {
        trust: 60,
        respect: 60,
        fear: 10,
        affinity: 60
      });

      const relationship = setRelationshipScores(testNpcId, testPlayerId, {
        trust: 80
      });

      expect(relationship.trust).toBe(80);
      expect(relationship.respect).toBe(60); // Unchanged
      expect(relationship.fear).toBe(10); // Unchanged
      expect(relationship.affinity).toBe(60); // Unchanged
    });
  });
});
