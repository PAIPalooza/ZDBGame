/**
 * Data Layer Extension for Session Tracking
 *
 * This module extends the data layer with session-aware functions
 * Refs: #5 (Epic 2 - Game Session Tracking)
 */

import { saveGameEvent as originalSaveGameEvent, GameEvent } from './data';
import { getActiveSession } from './session';

/**
 * Save a game event with automatic session tracking
 * If no session_id is provided, attempts to find the active session for the player
 *
 * @param event - The game event to save (without id and created_at)
 * @returns The saved game event with session_id populated
 */
export function saveGameEventWithSession(
  event: Omit<GameEvent, 'id' | 'created_at'>
): GameEvent {
  let sessionId = event.session_id;

  // Auto-populate session_id if not provided
  if (!sessionId && event.player_id) {
    const activeSession = getActiveSession(event.player_id);
    if (activeSession) {
      sessionId = activeSession.id;
    }
  }

  return originalSaveGameEvent({
    ...event,
    session_id: sessionId,
  });
}

/**
 * Get all game events for a specific session
 *
 * @param sessionId - The session UUID
 * @returns Array of game events for that session
 */
export function getGameEventsBySession(sessionId: string): GameEvent[] {
  // Import here to avoid circular dependency
  const { getGameEvents } = require('./data');
  const allEvents = getGameEvents();

  return allEvents.filter(event => event.session_id === sessionId);
}

/**
 * Get event count for a session
 *
 * @param sessionId - The session UUID
 * @returns Number of events in the session
 */
export function getSessionEventCount(sessionId: string): number {
  return getGameEventsBySession(sessionId).length;
}
