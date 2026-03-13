/**
 * Session Management Module for AI-Native Game World Demo (Moonvale)
 *
 * Provides comprehensive session lifecycle management including:
 * - Session creation on player login
 * - Session termination on logout/timeout
 * - Active session tracking and retrieval
 * - Session timeout detection and cleanup
 *
 * Refs: #5 (Epic 2 - Game Session Tracking)
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { GameSession, SessionWithStats } from './session-types';

// ============================================================================
// Configuration
// ============================================================================

const DATA_DIR = path.join(process.cwd(), '.data');
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// ============================================================================
// Helper Functions
// ============================================================================

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (error) {
    throw new Error(`Failed to create data directory: ${error}`);
  }
}

function atomicWrite(filePath: string, data: any): void {
  ensureDataDir();
  const tempPath = `${filePath}.tmp.${Date.now()}`;

  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    throw new Error(`Failed to write file ${filePath}: ${error}`);
  }
}

function readJSON<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error}`);
  }
}

function getDataPath(filename: string): string {
  return path.join(DATA_DIR, filename);
}

// ============================================================================
// Session Management Functions
// ============================================================================

/**
 * Create a new game session for a player
 * Returns the created session object
 *
 * @param playerId - The player's UUID
 * @param metadata - Optional metadata to store with the session
 * @returns The newly created GameSession
 */
export function createSession(
  playerId: string,
  metadata?: Record<string, unknown>
): GameSession {
  // Check for existing active session
  const existingSession = getActiveSession(playerId);
  if (existingSession) {
    throw new Error(`Player ${playerId} already has an active session: ${existingSession.id}`);
  }

  const newSession: GameSession = {
    id: randomUUID(),
    playerId,
    startedAt: new Date().toISOString(),
    endedAt: null,
    status: 'active',
    metadata: metadata || {},
  };

  const filePath = getDataPath(`session_${newSession.id}.json`);
  atomicWrite(filePath, newSession);

  return newSession;
}

/**
 * Get a session by its ID
 *
 * @param sessionId - The session's UUID
 * @returns The session or null if not found
 */
export function getSession(sessionId: string): GameSession | null {
  const filePath = getDataPath(`session_${sessionId}.json`);
  return readJSON<GameSession>(filePath);
}

/**
 * Get the active session for a player
 * Returns null if no active session exists
 *
 * @param playerId - The player's UUID
 * @returns The active session or null
 */
export function getActiveSession(playerId: string): GameSession | null {
  ensureDataDir();

  try {
    const files = fs.readdirSync(DATA_DIR);
    const sessionFiles = files.filter(f => f.startsWith('session_') && f.endsWith('.json'));

    for (const file of sessionFiles) {
      const session = readJSON<GameSession>(getDataPath(file));
      if (session && session.playerId === playerId && session.status === 'active') {
        return session;
      }
    }

    return null;
  } catch (error) {
    throw new Error(`Failed to get active session: ${error}`);
  }
}

/**
 * End a session (manual logout or timeout)
 *
 * @param sessionId - The session's UUID
 * @param reason - The reason for ending ('ended' or 'timeout')
 * @returns The updated session or null if not found
 */
export function endSession(
  sessionId: string,
  reason: 'ended' | 'timeout' = 'ended'
): GameSession | null {
  const session = getSession(sessionId);
  if (!session) {
    return null;
  }

  if (session.status !== 'active') {
    throw new Error(`Session ${sessionId} is already ${session.status}`);
  }

  const updatedSession: GameSession = {
    ...session,
    endedAt: new Date().toISOString(),
    status: reason,
  };

  const filePath = getDataPath(`session_${sessionId}.json`);
  atomicWrite(filePath, updatedSession);

  return updatedSession;
}

/**
 * Get all sessions for a player
 *
 * @param playerId - The player's UUID
 * @param includeEnded - Whether to include ended sessions (default: true)
 * @returns Array of sessions, sorted by start time (newest first)
 */
export function getPlayerSessions(
  playerId: string,
  includeEnded: boolean = true
): GameSession[] {
  ensureDataDir();

  try {
    const files = fs.readdirSync(DATA_DIR);
    const sessionFiles = files.filter(f => f.startsWith('session_') && f.endsWith('.json'));

    let sessions = sessionFiles
      .map(file => readJSON<GameSession>(getDataPath(file)))
      .filter((s): s is GameSession => s !== null)
      .filter(s => s.playerId === playerId);

    if (!includeEnded) {
      sessions = sessions.filter(s => s.status === 'active');
    }

    return sessions.sort((a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  } catch (error) {
    throw new Error(`Failed to get player sessions: ${error}`);
  }
}

/**
 * Get all sessions (admin function)
 *
 * @returns Array of all sessions, sorted by start time (newest first)
 */
export function getAllSessions(): GameSession[] {
  ensureDataDir();

  try {
    const files = fs.readdirSync(DATA_DIR);
    const sessionFiles = files.filter(f => f.startsWith('session_') && f.endsWith('.json'));

    return sessionFiles
      .map(file => readJSON<GameSession>(getDataPath(file)))
      .filter((s): s is GameSession => s !== null)
      .sort((a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );
  } catch (error) {
    throw new Error(`Failed to get all sessions: ${error}`);
  }
}

/**
 * Check and timeout inactive sessions
 * This should be called periodically (e.g., via cron job or API call)
 *
 * @returns Array of session IDs that were timed out
 */
export function timeoutInactiveSessions(): string[] {
  const timedOutSessions: string[] = [];
  const now = Date.now();

  try {
    const activeSessions = getAllSessions().filter(s => s.status === 'active');

    for (const session of activeSessions) {
      const startTime = new Date(session.startedAt).getTime();
      const elapsed = now - startTime;

      if (elapsed > SESSION_TIMEOUT_MS) {
        endSession(session.id, 'timeout');
        timedOutSessions.push(session.id);
      }
    }

    return timedOutSessions;
  } catch (error) {
    throw new Error(`Failed to timeout inactive sessions: ${error}`);
  }
}

/**
 * Get session with statistics
 * Includes event count and duration
 *
 * @param sessionId - The session's UUID
 * @returns SessionWithStats or null if not found
 */
export function getSessionWithStats(sessionId: string): SessionWithStats | null {
  const session = getSession(sessionId);
  if (!session) {
    return null;
  }

  // Calculate duration
  const startTime = new Date(session.startedAt).getTime();
  const endTime = session.endedAt ? new Date(session.endedAt).getTime() : Date.now();
  const durationMs = endTime - startTime;
  const duration = session.endedAt ? Math.floor(durationMs / 1000) : null;

  // Count events for this session
  let eventCount = 0;
  try {
    ensureDataDir();
    const files = fs.readdirSync(DATA_DIR);
    const eventFiles = files.filter(f => f.startsWith('game_event_') && f.endsWith('.json'));

    for (const file of eventFiles) {
      const eventPath = getDataPath(file);
      const event = readJSON<any>(eventPath);
      if (event && event.session_id === sessionId) {
        eventCount++;
      }
    }
  } catch (error) {
    // Ignore event counting errors
  }

  return {
    ...session,
    duration,
    eventCount,
    startedAtReadable: new Date(session.startedAt).toLocaleString(),
    endedAtReadable: session.endedAt ? new Date(session.endedAt).toLocaleString() : null,
  };
}

/**
 * Delete a session (admin function)
 * Use with caution - this permanently removes session data
 *
 * @param sessionId - The session's UUID
 * @returns true if deleted, false if not found
 */
export function deleteSession(sessionId: string): boolean {
  const filePath = getDataPath(`session_${sessionId}.json`);

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    throw new Error(`Failed to delete session ${sessionId}: ${error}`);
  }
}

/**
 * Get session statistics for a player
 *
 * @param playerId - The player's UUID
 * @returns Object with session statistics
 */
export function getPlayerSessionStats(playerId: string): {
  totalSessions: number;
  activeSessions: number;
  endedSessions: number;
  timedOutSessions: number;
  totalPlayTimeSeconds: number;
  averageSessionDurationSeconds: number;
} {
  const sessions = getPlayerSessions(playerId);

  const stats = {
    totalSessions: sessions.length,
    activeSessions: sessions.filter(s => s.status === 'active').length,
    endedSessions: sessions.filter(s => s.status === 'ended').length,
    timedOutSessions: sessions.filter(s => s.status === 'timeout').length,
    totalPlayTimeSeconds: 0,
    averageSessionDurationSeconds: 0,
  };

  let totalDuration = 0;
  let completedSessions = 0;

  for (const session of sessions) {
    if (session.endedAt) {
      const startTime = new Date(session.startedAt).getTime();
      const endTime = new Date(session.endedAt).getTime();
      const duration = Math.floor((endTime - startTime) / 1000);
      totalDuration += duration;
      completedSessions++;
    }
  }

  stats.totalPlayTimeSeconds = totalDuration;
  stats.averageSessionDurationSeconds = completedSessions > 0
    ? Math.floor(totalDuration / completedSessions)
    : 0;

  return stats;
}
