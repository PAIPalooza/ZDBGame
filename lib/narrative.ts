/**
 * Narrative Logging Service
 *
 * Provides comprehensive narrative history storage for player-GM interactions.
 * Tracks player inputs, GM responses, and context metadata including lore
 * retrieval and memory usage.
 *
 * Epic 4: Narrative History Storage
 * Issue: #10
 */

import {
    saveNarrativeLog,
    getNarrativeLog,
    getNarrativeLogsByPlayer,
    getNarrativeLogsByNPCAndPlayer,
    getAllNarrativeLogs,
    getNarrativeLogCount,
    searchNarrativeLogs,
    NarrativeLog
} from './data';
import { LoreEntry, NPCMemory } from './types';

/**
 * Interface for creating a narrative log entry
 */
export interface CreateNarrativeLogParams {
    playerId: string;
    npcId?: string;
    playerInput: string;
    gmResponse: string;
    loreUsed?: LoreEntry[];
    memoriesReferenced?: NPCMemory[];
    responseTime?: number;
    npcName?: string;
    location?: string;
    additionalMetadata?: Record<string, any>;
}

/**
 * Interface for querying narrative logs
 */
export interface NarrativeLogQuery {
    playerId: string;
    npcId?: string;
    limit?: number;
    offset?: number;
    searchTerm?: string;
}

/**
 * Interface for narrative log response with pagination metadata
 */
export interface NarrativeLogResponse {
    logs: NarrativeLog[];
    total: number;
    hasMore: boolean;
    page: number;
    pageSize: number;
}

/**
 * Log a narrative interaction between player and GM/NPC
 *
 * @param params - Parameters for the narrative log
 * @returns The created narrative log entry
 *
 * @example
 * const log = logNarrativeInteraction({
 *   playerId: 'player-123',
 *   npcId: 'npc-456',
 *   playerInput: 'Tell me about Ember Tower',
 *   gmResponse: 'Ah, Ember Tower... The tower collapsed after a magical experiment went wrong.',
 *   loreUsed: [emberTowerLore],
 *   memoriesReferenced: [],
 *   npcName: 'Elarin',
 *   location: 'Moonvale'
 * });
 */
export function logNarrativeInteraction(params: CreateNarrativeLogParams): NarrativeLog {
    const {
        playerId,
        npcId,
        playerInput,
        gmResponse,
        loreUsed = [],
        memoriesReferenced = [],
        responseTime,
        npcName,
        location,
        additionalMetadata = {}
    } = params;

    // Build context metadata
    const contextMetadata = {
        lore_retrieved: loreUsed.map(lore => lore.id),
        memories_used: memoriesReferenced.map(mem => mem.id),
        response_time: responseTime,
        npc_name: npcName,
        location: location,
        additional: additionalMetadata
    };

    // Save the narrative log
    const log = saveNarrativeLog({
        player_id: playerId,
        npc_id: npcId,
        player_input: playerInput,
        gm_response: gmResponse,
        context_metadata: contextMetadata
    });

    return log;
}

/**
 * Get narrative history for a specific player with pagination
 *
 * @param query - Query parameters for filtering narrative logs
 * @returns Paginated narrative log response
 *
 * @example
 * const history = getPlayerNarrativeHistory({
 *   playerId: 'player-123',
 *   limit: 10,
 *   offset: 0
 * });
 */
export function getPlayerNarrativeHistory(query: NarrativeLogQuery): NarrativeLogResponse {
    const { playerId, limit = 20, offset = 0, searchTerm } = query;

    // Get total count for pagination
    const total = getNarrativeLogCount(playerId);

    // Get logs with pagination
    let logs: NarrativeLog[];

    if (searchTerm) {
        // Search logs by content
        logs = searchNarrativeLogs(playerId, searchTerm, limit);
    } else {
        // Get all logs with pagination
        logs = getNarrativeLogsByPlayer(playerId, limit, offset);
    }

    // Calculate pagination metadata
    const page = Math.floor(offset / limit) + 1;
    const hasMore = (offset + logs.length) < total;

    return {
        logs,
        total,
        hasMore,
        page,
        pageSize: limit
    };
}

/**
 * Get conversation history between a specific NPC and player
 *
 * @param npcId - The NPC ID
 * @param playerId - The player ID
 * @param limit - Maximum number of logs to return
 * @returns Array of narrative logs for the conversation
 *
 * @example
 * const conversation = getNPCConversationHistory('npc-456', 'player-123', 10);
 */
export function getNPCConversationHistory(
    npcId: string,
    playerId: string,
    limit: number = 20
): NarrativeLog[] {
    return getNarrativeLogsByNPCAndPlayer(npcId, playerId, limit);
}

/**
 * Get recent narrative context for a player
 * Returns the most recent N interactions to provide context for new responses
 *
 * @param playerId - The player ID
 * @param count - Number of recent interactions to retrieve (default: 5)
 * @returns Array of recent narrative logs
 *
 * @example
 * const recentContext = getRecentNarrativeContext('player-123', 5);
 */
export function getRecentNarrativeContext(
    playerId: string,
    count: number = 5
): NarrativeLog[] {
    return getNarrativeLogsByPlayer(playerId, count, 0);
}

/**
 * Get narrative statistics for a player
 * Provides insights into player's narrative history
 *
 * @param playerId - The player ID
 * @returns Statistics about the player's narrative history
 *
 * @example
 * const stats = getNarrativeStats('player-123');
 */
export function getNarrativeStats(playerId: string): {
    totalInteractions: number;
    uniqueNPCs: Set<string>;
    totalLoreRetrieved: number;
    averageResponseTime: number;
} {
    const logs = getNarrativeLogsByPlayer(playerId);

    const uniqueNPCs = new Set<string>();
    let totalLoreItems = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    logs.forEach(log => {
        if (log.npc_id) {
            uniqueNPCs.add(log.npc_id);
        }

        totalLoreItems += log.context_metadata.lore_retrieved.length;

        if (log.context_metadata.response_time) {
            totalResponseTime += log.context_metadata.response_time;
            responseTimeCount++;
        }
    });

    return {
        totalInteractions: logs.length,
        uniqueNPCs,
        totalLoreRetrieved: totalLoreItems,
        averageResponseTime: responseTimeCount > 0
            ? totalResponseTime / responseTimeCount
            : 0
    };
}

/**
 * Export player's complete narrative history
 * Useful for generating reports or player story summaries
 *
 * @param playerId - The player ID
 * @returns Complete narrative history with formatted output
 *
 * @example
 * const story = exportPlayerStory('player-123');
 */
export function exportPlayerStory(playerId: string): {
    playerId: string;
    totalInteractions: number;
    logs: Array<{
        timestamp: string;
        playerInput: string;
        gmResponse: string;
        npcName?: string;
        location?: string;
    }>;
} {
    const logs = getNarrativeLogsByPlayer(playerId);

    return {
        playerId,
        totalInteractions: logs.length,
        logs: logs.map(log => ({
            timestamp: log.created_at,
            playerInput: log.player_input,
            gmResponse: log.gm_response,
            npcName: log.context_metadata.npc_name,
            location: log.context_metadata.location
        }))
    };
}

/**
 * Get narrative logs by ID (admin/debugging function)
 *
 * @param logId - The narrative log ID
 * @returns The narrative log or null if not found
 */
export function getNarrativeLogById(logId: string): NarrativeLog | null {
    return getNarrativeLog(logId);
}

/**
 * Get all narrative logs (admin function)
 *
 * @param limit - Optional limit on number of logs
 * @returns Array of all narrative logs
 */
export function getAllNarrativeLogsAdmin(limit?: number): NarrativeLog[] {
    return getAllNarrativeLogs(limit);
}
