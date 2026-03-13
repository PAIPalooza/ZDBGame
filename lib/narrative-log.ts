/**
 * Narrative Logging System
 * Feature 4.3: Narrative History Storage
 *
 * This module provides persistent storage for AI-generated narratives.
 * All narrative responses are logged for:
 * - Player history tracking
 * - Future context retrieval
 * - Analytics and improvement
 *
 * References:
 * - Issue: #9
 * - Epic: 4
 * - Backlog: Feature 4.3
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { NarrativeLog, GameContext, NarrativeResponse } from './narrative-types';

const DATA_DIR = path.join(process.cwd(), '.data');

/**
 * Ensure data directory exists
 */
function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (error) {
    throw new Error(`Failed to create data directory: ${error}`);
  }
}

/**
 * Get path for a narrative log file
 */
function getNarrativeLogPath(narrativeId: string): string {
  return path.join(DATA_DIR, `narrative_log_${narrativeId}.json`);
}

/**
 * Atomically write narrative log to file
 */
function atomicWrite(filePath: string, data: NarrativeLog): void {
  ensureDataDir();

  const tempPath = `${filePath}.tmp.${Date.now()}`;

  try {
    // Write to temp file
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');

    // Atomic rename
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    // Clean up temp file on error
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    throw new Error(`Failed to write narrative log ${filePath}: ${error}`);
  }
}

/**
 * Save a narrative log entry
 *
 * @param playerId - The player ID
 * @param playerAction - The action the player performed
 * @param gmResponse - The AI-generated narrative response
 * @param contextUsed - The context used to generate the response
 * @returns The created narrative log with ID
 */
export function saveNarrativeLog(
  playerId: string,
  playerAction: string,
  gmResponse: string,
  contextUsed: GameContext
): NarrativeLog {
  const narrativeLog: NarrativeLog = {
    id: randomUUID(),
    playerId,
    playerAction,
    gmResponse,
    contextUsed,
    createdAt: new Date().toISOString(),
  };

  const filePath = getNarrativeLogPath(narrativeLog.id);
  atomicWrite(filePath, narrativeLog);

  return narrativeLog;
}

/**
 * Get a specific narrative log by ID
 *
 * @param narrativeId - The narrative log ID
 * @returns The narrative log or null if not found
 */
export function getNarrativeLog(narrativeId: string): NarrativeLog | null {
  try {
    const filePath = getNarrativeLogPath(narrativeId);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as NarrativeLog;
  } catch (error) {
    console.error(`Failed to read narrative log ${narrativeId}:`, error);
    return null;
  }
}

/**
 * Get all narrative logs for a specific player
 *
 * @param playerId - The player ID
 * @param limit - Maximum number of logs to return (default: 50)
 * @returns Array of narrative logs, sorted by newest first
 */
export function getPlayerNarrativeLogs(
  playerId: string,
  limit: number = 50
): NarrativeLog[] {
  ensureDataDir();

  try {
    const files = fs.readdirSync(DATA_DIR);
    const narrativeFiles = files.filter(
      (f) => f.startsWith('narrative_log_') && f.endsWith('.json')
    );

    const logs: NarrativeLog[] = [];

    for (const file of narrativeFiles) {
      const filePath = path.join(DATA_DIR, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const log = JSON.parse(content) as NarrativeLog;

        if (log.playerId === playerId) {
          logs.push(log);
        }
      } catch (error) {
        console.error(`Failed to read narrative log file ${file}:`, error);
      }
    }

    // Sort by newest first
    logs.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return logs.slice(0, limit);
  } catch (error) {
    console.error('Failed to read player narrative logs:', error);
    return [];
  }
}

/**
 * Get all narrative logs (for admin/analytics)
 *
 * @param limit - Maximum number of logs to return (default: 100)
 * @returns Array of all narrative logs, sorted by newest first
 */
export function getAllNarrativeLogs(limit: number = 100): NarrativeLog[] {
  ensureDataDir();

  try {
    const files = fs.readdirSync(DATA_DIR);
    const narrativeFiles = files.filter(
      (f) => f.startsWith('narrative_log_') && f.endsWith('.json')
    );

    const logs: NarrativeLog[] = [];

    for (const file of narrativeFiles) {
      const filePath = path.join(DATA_DIR, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const log = JSON.parse(content) as NarrativeLog;
        logs.push(log);
      } catch (error) {
        console.error(`Failed to read narrative log file ${file}:`, error);
      }
    }

    // Sort by newest first
    logs.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return logs.slice(0, limit);
  } catch (error) {
    console.error('Failed to read narrative logs:', error);
    return [];
  }
}

/**
 * Get narrative log statistics
 *
 * @returns Statistics about narrative logs
 */
export function getNarrativeLogStats(): {
  totalLogs: number;
  uniquePlayers: number;
  mostRecentLog: string | null;
} {
  ensureDataDir();

  try {
    const files = fs.readdirSync(DATA_DIR);
    const narrativeFiles = files.filter(
      (f) => f.startsWith('narrative_log_') && f.endsWith('.json')
    );

    const playerIds = new Set<string>();
    let mostRecentTimestamp: string | null = null;

    for (const file of narrativeFiles) {
      const filePath = path.join(DATA_DIR, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const log = JSON.parse(content) as NarrativeLog;

        playerIds.add(log.playerId);

        if (
          !mostRecentTimestamp ||
          new Date(log.createdAt) > new Date(mostRecentTimestamp)
        ) {
          mostRecentTimestamp = log.createdAt;
        }
      } catch (error) {
        // Skip invalid files
      }
    }

    return {
      totalLogs: narrativeFiles.length,
      uniquePlayers: playerIds.size,
      mostRecentLog: mostRecentTimestamp,
    };
  } catch (error) {
    console.error('Failed to get narrative log stats:', error);
    return {
      totalLogs: 0,
      uniquePlayers: 0,
      mostRecentLog: null,
    };
  }
}

/**
 * Delete all narrative logs (for testing/reset)
 */
export function clearNarrativeLogs(): void {
  ensureDataDir();

  try {
    const files = fs.readdirSync(DATA_DIR);
    const narrativeFiles = files.filter(
      (f) => f.startsWith('narrative_log_') && f.endsWith('.json')
    );

    for (const file of narrativeFiles) {
      const filePath = path.join(DATA_DIR, file);
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    throw new Error(`Failed to clear narrative logs: ${error}`);
  }
}
