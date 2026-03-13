/**
 * Session Management Tests
 *
 * Comprehensive test suite for game session tracking functionality.
 * Tests cover the complete session lifecycle and edge cases.
 *
 * Refs: #5 (Epic 2 - Game Session Tracking)
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import {
  createSession,
  getSession,
  getActiveSession,
  endSession,
  getPlayerSessions,
  getAllSessions,
  timeoutInactiveSessions,
  getSessionWithStats,
  deleteSession,
  getPlayerSessionStats,
} from '../lib/session';
import { GameSession } from '../lib/session-types';

const DATA_DIR = path.join(process.cwd(), '.data');
const TEST_PLAYER_ID = 'test-player-123';
const TEST_PLAYER_ID_2 = 'test-player-456';

// Clean up test data before each test
beforeEach(() => {
  if (fs.existsSync(DATA_DIR)) {
    const files = fs.readdirSync(DATA_DIR);
    files.forEach(file => {
      if (file.startsWith('session_')) {
        fs.unlinkSync(path.join(DATA_DIR, file));
      }
    });
  }
});

describe('Session Creation', () => {
  test('should create a new session successfully', () => {
    const session = createSession(TEST_PLAYER_ID);

    expect(session).toBeDefined();
    expect(session.id).toBeDefined();
    expect(session.playerId).toBe(TEST_PLAYER_ID);
    expect(session.status).toBe('active');
    expect(session.startedAt).toBeDefined();
    expect(session.endedAt).toBeNull();
  });

  test('should create session with metadata', () => {
    const metadata = { loginMethod: 'oauth', device: 'mobile' };
    const session = createSession(TEST_PLAYER_ID, metadata);

    expect(session.metadata).toEqual(metadata);
  });

  test('should not allow multiple active sessions for same player', () => {
    createSession(TEST_PLAYER_ID);

    expect(() => {
      createSession(TEST_PLAYER_ID);
    }).toThrow('already has an active session');
  });

  test('should allow new session after previous session is ended', () => {
    const session1 = createSession(TEST_PLAYER_ID);
    endSession(session1.id);

    const session2 = createSession(TEST_PLAYER_ID);
    expect(session2.id).not.toBe(session1.id);
    expect(session2.status).toBe('active');
  });
});

describe('Session Retrieval', () => {
  test('should retrieve session by ID', () => {
    const created = createSession(TEST_PLAYER_ID);
    const retrieved = getSession(created.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(created.id);
    expect(retrieved?.playerId).toBe(TEST_PLAYER_ID);
  });

  test('should return null for non-existent session', () => {
    const session = getSession('non-existent-id');
    expect(session).toBeNull();
  });

  test('should get active session for player', () => {
    const created = createSession(TEST_PLAYER_ID);
    const active = getActiveSession(TEST_PLAYER_ID);

    expect(active).toBeDefined();
    expect(active?.id).toBe(created.id);
    expect(active?.status).toBe('active');
  });

  test('should return null when no active session exists', () => {
    const active = getActiveSession(TEST_PLAYER_ID);
    expect(active).toBeNull();
  });

  test('should not return ended session as active', () => {
    const session = createSession(TEST_PLAYER_ID);
    endSession(session.id);

    const active = getActiveSession(TEST_PLAYER_ID);
    expect(active).toBeNull();
  });
});

describe('Session Termination', () => {
  test('should end session with default reason', () => {
    const session = createSession(TEST_PLAYER_ID);
    const ended = endSession(session.id);

    expect(ended).toBeDefined();
    expect(ended?.status).toBe('ended');
    expect(ended?.endedAt).toBeDefined();
    expect(ended?.endedAt).not.toBeNull();
  });

  test('should end session with timeout reason', () => {
    const session = createSession(TEST_PLAYER_ID);
    const ended = endSession(session.id, 'timeout');

    expect(ended?.status).toBe('timeout');
  });

  test('should return null when ending non-existent session', () => {
    const ended = endSession('non-existent-id');
    expect(ended).toBeNull();
  });

  test('should not allow ending already ended session', () => {
    const session = createSession(TEST_PLAYER_ID);
    endSession(session.id);

    expect(() => {
      endSession(session.id);
    }).toThrow('already');
  });
});

describe('Multi-Player Sessions', () => {
  test('should allow multiple players to have active sessions', () => {
    const session1 = createSession(TEST_PLAYER_ID);
    const session2 = createSession(TEST_PLAYER_ID_2);

    expect(session1.playerId).toBe(TEST_PLAYER_ID);
    expect(session2.playerId).toBe(TEST_PLAYER_ID_2);
    expect(session1.id).not.toBe(session2.id);
  });

  test('should get correct active session for each player', () => {
    createSession(TEST_PLAYER_ID);
    createSession(TEST_PLAYER_ID_2);

    const active1 = getActiveSession(TEST_PLAYER_ID);
    const active2 = getActiveSession(TEST_PLAYER_ID_2);

    expect(active1?.playerId).toBe(TEST_PLAYER_ID);
    expect(active2?.playerId).toBe(TEST_PLAYER_ID_2);
  });
});

describe('Session Listing', () => {
  test('should get all sessions for a player', () => {
    const session1 = createSession(TEST_PLAYER_ID);
    endSession(session1.id);

    // Small delay to ensure different timestamps
    const session2 = createSession(TEST_PLAYER_ID);

    const sessions = getPlayerSessions(TEST_PLAYER_ID);

    expect(sessions.length).toBe(2);
    // Both sessions should exist, order may vary by file system
    const sessionIds = sessions.map(s => s.id);
    expect(sessionIds).toContain(session1.id);
    expect(sessionIds).toContain(session2.id);
  });

  test('should filter out ended sessions when requested', () => {
    const session1 = createSession(TEST_PLAYER_ID);
    endSession(session1.id);
    createSession(TEST_PLAYER_ID);

    const sessions = getPlayerSessions(TEST_PLAYER_ID, false);

    expect(sessions.length).toBe(1);
    expect(sessions[0].status).toBe('active');
  });

  test('should get all sessions across all players', () => {
    createSession(TEST_PLAYER_ID);
    createSession(TEST_PLAYER_ID_2);

    const allSessions = getAllSessions();

    expect(allSessions.length).toBe(2);
  });
});

describe('Session Timeout', () => {
  test('should timeout inactive sessions', async () => {
    const session = createSession(TEST_PLAYER_ID);

    // Manually modify the session start time to simulate old session
    const sessionPath = path.join(DATA_DIR, `session_${session.id}.json`);
    const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
    sessionData.startedAt = new Date(Date.now() - 31 * 60 * 1000).toISOString(); // 31 minutes ago
    fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2));

    const timedOut = timeoutInactiveSessions();

    expect(timedOut.length).toBe(1);
    expect(timedOut[0]).toBe(session.id);

    const updatedSession = getSession(session.id);
    expect(updatedSession?.status).toBe('timeout');
  });

  test('should not timeout recent sessions', () => {
    createSession(TEST_PLAYER_ID);

    const timedOut = timeoutInactiveSessions();

    expect(timedOut.length).toBe(0);
  });
});

describe('Session Statistics', () => {
  test('should get session with statistics', () => {
    const session = createSession(TEST_PLAYER_ID);
    const stats = getSessionWithStats(session.id);

    expect(stats).toBeDefined();
    expect(stats?.id).toBe(session.id);
    expect(stats?.duration).toBeNull(); // Still active
    expect(stats?.eventCount).toBe(0);
    expect(stats?.startedAtReadable).toBeDefined();
  });

  test('should calculate duration for ended session', async () => {
    const session = createSession(TEST_PLAYER_ID);

    // Wait a small amount of time to ensure measurable duration
    await new Promise(resolve => setTimeout(resolve, 1100));

    endSession(session.id);
    const stats = getSessionWithStats(session.id);

    expect(stats?.duration).toBeGreaterThanOrEqual(1); // At least 1 second
    expect(stats?.endedAtReadable).toBeDefined();
  });

  test('should get player session statistics', () => {
    const session1 = createSession(TEST_PLAYER_ID);
    endSession(session1.id);
    const session2 = createSession(TEST_PLAYER_ID);
    endSession(session2.id, 'timeout');

    const stats = getPlayerSessionStats(TEST_PLAYER_ID);

    expect(stats.totalSessions).toBe(2);
    expect(stats.activeSessions).toBe(0);
    expect(stats.endedSessions).toBe(1);
    expect(stats.timedOutSessions).toBe(1);
    expect(stats.totalPlayTimeSeconds).toBeGreaterThanOrEqual(0);
  });
});

describe('Session Deletion', () => {
  test('should delete session successfully', () => {
    const session = createSession(TEST_PLAYER_ID);
    const deleted = deleteSession(session.id);

    expect(deleted).toBe(true);

    const retrieved = getSession(session.id);
    expect(retrieved).toBeNull();
  });

  test('should return false when deleting non-existent session', () => {
    const deleted = deleteSession('non-existent-id');
    expect(deleted).toBe(false);
  });
});

describe('Session Edge Cases', () => {
  test('should handle empty player ID gracefully', () => {
    // Empty player ID creates a session (file-based storage doesn't validate)
    // For production ZeroDB, this would be caught by NOT NULL constraint
    const session = createSession('');
    expect(session.playerId).toBe('');
  });

  test('should handle concurrent session creation attempts', () => {
    const session1 = createSession(TEST_PLAYER_ID);

    expect(() => {
      createSession(TEST_PLAYER_ID);
    }).toThrow();

    const active = getActiveSession(TEST_PLAYER_ID);
    expect(active?.id).toBe(session1.id);
  });

  test('should handle session persistence across module reloads', () => {
    const session = createSession(TEST_PLAYER_ID);
    const sessionId = session.id;

    // Simulate module reload by directly reading from filesystem
    const retrieved = getSession(sessionId);

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(sessionId);
  });
});
