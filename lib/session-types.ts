/**
 * Session Management Types for AI-Native Game World Demo (Moonvale)
 *
 * This file defines types for game session tracking.
 * Refs: #5 (Epic 2 - Game Session Tracking)
 *
 * References:
 * - PRD: /prd.md
 * - Data Model: /datamodel.md
 * - GitHub Issue: #5
 */

/**
 * GameSession represents a player's gaming session.
 * Tracks login/logout times and session duration for analytics.
 *
 * @example
 * {
 *   id: "a50e8400-e29b-41d4-a716-446655440010",
 *   playerId: "550e8400-e29b-41d4-a716-446655440000",
 *   startedAt: "2024-03-12T10:00:00Z",
 *   endedAt: null,
 *   status: "active"
 * }
 */
export interface GameSession {
  /** Unique session identifier (UUID v4) */
  id: string;

  /** Reference to the player who owns this session */
  playerId: string;

  /** ISO 8601 timestamp when the session started */
  startedAt: string;

  /** ISO 8601 timestamp when the session ended (null if active) */
  endedAt: string | null;

  /** Session status: active, ended, timeout */
  status: 'active' | 'ended' | 'timeout';

  /** Optional metadata for session tracking */
  metadata?: Record<string, unknown>;
}

/**
 * CreateSessionRequest for API endpoints
 */
export interface CreateSessionRequest {
  playerId: string;
  metadata?: Record<string, unknown>;
}

/**
 * EndSessionRequest for API endpoints
 */
export interface EndSessionRequest {
  sessionId: string;
  reason?: 'logout' | 'timeout' | 'manual';
}

/**
 * SessionWithStats includes session statistics
 */
export interface SessionWithStats extends GameSession {
  /** Duration in seconds (null if still active) */
  duration: number | null;

  /** Number of events during this session */
  eventCount: number;

  /** Session start time as readable string */
  startedAtReadable: string;

  /** Session end time as readable string */
  endedAtReadable: string | null;
}

/**
 * Type guard for GameSession
 */
export function isGameSession(obj: unknown): obj is GameSession {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'playerId' in obj &&
    'startedAt' in obj &&
    'status' in obj
  );
}
