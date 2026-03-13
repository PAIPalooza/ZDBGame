/**
 * File-based Storage System for ZDBGame Demo
 *
 * Provides reliable, type-safe file-based storage for game data.
 * All data stored in .data/ directory as JSON files.
 *
 * Features:
 * - Atomic file writes (write to temp, then rename)
 * - Auto-create .data/ directory on first access
 * - Type-safe return values
 * - Simple keyword-based search for lore
 * - Error handling for all file operations
 *
 * Refs #3
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

// ============================================================================
// Type Definitions
// ============================================================================

export interface Player {
    id: string;
    username: string;
    class: string;
    faction: string;
    level: number;
    xp: number;
    inventory: string[];
    reputation: number;
    created_at: string;
}

export interface NPC {
    id: string;
    name: string;
    role: string;
    location: string;
    personality: Record<string, any>;
    created_at: string;
}

export interface NPCMemory {
    id: string;
    npc_id: string;
    player_id: string;
    memory: string;
    importance: number;
    metadata: Record<string, any>;
    created_at: string;
}

export interface Lore {
    id: string;
    title: string;
    content: string;
    region: string;
    tags: string[];
    created_at: string;
}

export interface GameEvent {
    id: string;
    player_id: string;
    event_type: string;
    location: string;
    metadata: Record<string, any>;
    created_at: string;
}

export interface WorldEvent {
    id: string;
    event_name: string;
    description: string;
    trigger_source: string;
    metadata: Record<string, any>;
    created_at: string;
}

export interface NarrativeLog {
    id: string;
    player_id: string;
    npc_id?: string;
    player_input: string;
    gm_response: string;
    context_metadata: {
        lore_retrieved: string[];
        memories_used: string[];
        response_time?: number;
        npc_name?: string;
        location?: string;
        additional?: Record<string, any>;
    };
    created_at: string;
}

export interface NPCRelationship {
    id: string;
    npc_id: string;
    player_id: string;
    trust: number;
    respect: number;
    fear: number;
    affinity: number;
    last_updated: string;
    created_at: string;
}

// ============================================================================
// Configuration
// ============================================================================

const DATA_DIR = path.join(process.cwd(), '.data');

// Ensure data directory exists on module load
function ensureDataDir(): void {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
    } catch (error) {
        throw new Error(`Failed to create data directory: ${error}`);
    }
}

// ============================================================================
// Atomic File Operations
// ============================================================================

/**
 * Atomically write data to a file
 * Uses temp file + rename pattern to prevent corruption
 */
function atomicWrite(filePath: string, data: any): void {
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
        throw new Error(`Failed to write file ${filePath}: ${error}`);
    }
}

/**
 * Read and parse JSON file safely
 */
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

/**
 * Get path for a specific data file
 */
function getDataPath(filename: string): string {
    return path.join(DATA_DIR, filename);
}

// ============================================================================
// Player Storage
// ============================================================================

export function savePlayer(player: Omit<Player, 'id' | 'created_at'>): Player {
    const newPlayer: Player = {
        ...player,
        id: randomUUID(),
        created_at: new Date().toISOString(),
    };

    const filePath = getDataPath(`player_${newPlayer.id}.json`);
    atomicWrite(filePath, newPlayer);

    return newPlayer;
}

export function getPlayer(playerId: string): Player | null {
    const filePath = getDataPath(`player_${playerId}.json`);
    return readJSON<Player>(filePath);
}

export function updatePlayer(playerId: string, updates: Partial<Player>): Player | null {
    const player = getPlayer(playerId);
    if (!player) {
        return null;
    }

    const updatedPlayer = { ...player, ...updates };
    const filePath = getDataPath(`player_${playerId}.json`);
    atomicWrite(filePath, updatedPlayer);

    return updatedPlayer;
}

export function getAllPlayers(): Player[] {
    ensureDataDir();

    try {
        const files = fs.readdirSync(DATA_DIR);
        const playerFiles = files.filter(f => f.startsWith('player_') && f.endsWith('.json'));

        return playerFiles
            .map(file => readJSON<Player>(getDataPath(file)))
            .filter((p): p is Player => p !== null);
    } catch (error) {
        throw new Error(`Failed to read players: ${error}`);
    }
}

// ============================================================================
// NPC Storage
// ============================================================================

export function saveNPC(npc: Omit<NPC, 'id' | 'created_at'>): NPC {
    const newNPC: NPC = {
        ...npc,
        id: randomUUID(),
        personality: npc.personality || {},
        created_at: new Date().toISOString(),
    };

    const filePath = getDataPath(`npc_${newNPC.id}.json`);
    atomicWrite(filePath, newNPC);

    return newNPC;
}

export function getNPC(npcId: string): NPC | null {
    const filePath = getDataPath(`npc_${npcId}.json`);
    return readJSON<NPC>(filePath);
}

export function getAllNPCs(): NPC[] {
    ensureDataDir();

    try {
        const files = fs.readdirSync(DATA_DIR);
        const npcFiles = files.filter(f => f.startsWith('npc_') && f.endsWith('.json'));

        return npcFiles
            .map(file => readJSON<NPC>(getDataPath(file)))
            .filter((n): n is NPC => n !== null);
    } catch (error) {
        throw new Error(`Failed to read NPCs: ${error}`);
    }
}

// ============================================================================
// Lore Storage with Keyword Search
// ============================================================================

export function saveLore(lore: Omit<Lore, 'id' | 'created_at'>): Lore {
    const newLore: Lore = {
        ...lore,
        id: randomUUID(),
        created_at: new Date().toISOString(),
    };

    const filePath = getDataPath(`lore_${newLore.id}.json`);
    atomicWrite(filePath, newLore);

    return newLore;
}

export function getLore(loreId: string): Lore | null {
    const filePath = getDataPath(`lore_${loreId}.json`);
    return readJSON<Lore>(filePath);
}

export function getAllLore(): Lore[] {
    ensureDataDir();

    try {
        const files = fs.readdirSync(DATA_DIR);
        const loreFiles = files.filter(f => f.startsWith('lore_') && f.endsWith('.json'));

        return loreFiles
            .map(file => readJSON<Lore>(getDataPath(file)))
            .filter((l): l is Lore => l !== null);
    } catch (error) {
        throw new Error(`Failed to read lore: ${error}`);
    }
}

/**
 * Search lore by keywords
 * Matches against title, content, region, and tags (case-insensitive)
 */
export function searchLore(keywords: string): Lore[] {
    const allLore = getAllLore();

    if (!keywords.trim()) {
        return allLore;
    }

    const searchTerms = keywords.toLowerCase().split(/\s+/);

    return allLore.filter(lore => {
        const searchableText = [
            lore.title,
            lore.content,
            lore.region,
            ...lore.tags
        ].join(' ').toLowerCase();

        return searchTerms.some(term => searchableText.includes(term));
    });
}

// ============================================================================
// NPC Memory Storage
// ============================================================================

export function saveNPCMemory(memory: Omit<NPCMemory, 'id' | 'created_at'>): NPCMemory {
    const newMemory: NPCMemory = {
        ...memory,
        id: randomUUID(),
        created_at: new Date().toISOString(),
    };

    const filePath = getDataPath(`npc_memory_${newMemory.id}.json`);
    atomicWrite(filePath, newMemory);

    return newMemory;
}

export function getNPCMemory(memoryId: string): NPCMemory | null {
    const filePath = getDataPath(`npc_memory_${memoryId}.json`);
    return readJSON<NPCMemory>(filePath);
}

export function getNPCMemories(npcId: string, playerId?: string): NPCMemory[] {
    ensureDataDir();

    try {
        const files = fs.readdirSync(DATA_DIR);
        const memoryFiles = files.filter(f => f.startsWith('npc_memory_') && f.endsWith('.json'));

        let memories = memoryFiles
            .map(file => readJSON<NPCMemory>(getDataPath(file)))
            .filter((m): m is NPCMemory => m !== null)
            .filter(m => m.npc_id === npcId);

        if (playerId) {
            memories = memories.filter(m => m.player_id === playerId);
        }

        // Sort by importance (descending), then by date (newest first)
        return memories.sort((a, b) => {
            if (a.importance !== b.importance) {
                return b.importance - a.importance;
            }
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    } catch (error) {
        throw new Error(`Failed to read NPC memories: ${error}`);
    }
}

export function getAllNPCMemories(): NPCMemory[] {
    ensureDataDir();

    try {
        const files = fs.readdirSync(DATA_DIR);
        const memoryFiles = files.filter(f => f.startsWith('npc_memory_') && f.endsWith('.json'));

        return memoryFiles
            .map(file => readJSON<NPCMemory>(getDataPath(file)))
            .filter((m): m is NPCMemory => m !== null);
    } catch (error) {
        throw new Error(`Failed to read all NPC memories: ${error}`);
    }
}

// ============================================================================
// Game Events Storage with Indexed File Names
// ============================================================================

/**
 * Save a game event with indexed file naming for optimized queries
 * File naming pattern: game_event_{playerId}_{eventType}_{timestamp}_{id}.json
 * This allows efficient filtering by player and event type without loading all files
 * Refs #4 (Database indexes for game_events table)
 */
export function saveGameEvent(event: Omit<GameEvent, 'id' | 'created_at'>): GameEvent {
    const newEvent: GameEvent = {
        ...event,
        id: randomUUID(),
        created_at: new Date().toISOString(),
    };

    // Create indexed filename for efficient queries
    // Format: game_event_{playerId}_{eventType}_{timestamp}_{id}.json
    const timestamp = new Date().getTime();
    const sanitizedEventType = event.event_type.replace(/[^a-z0-9_]/gi, '_');
    const indexedFilename = `game_event_${event.player_id}_${sanitizedEventType}_${timestamp}_${newEvent.id}.json`;
    const filePath = getDataPath(indexedFilename);

    atomicWrite(filePath, newEvent);

    return newEvent;
}

/**
 * Get a single game event by ID
 * Supports both indexed and legacy filename formats
 */
export function getGameEvent(eventId: string): GameEvent | null {
    ensureDataDir();

    try {
        // Try indexed filename format first
        const files = fs.readdirSync(DATA_DIR);
        const matchingFile = files.find(f => f.includes(eventId) && f.startsWith('game_event_'));

        if (matchingFile) {
            return readJSON<GameEvent>(getDataPath(matchingFile));
        }

        // Fallback to legacy format
        const legacyPath = getDataPath(`game_event_${eventId}.json`);
        return readJSON<GameEvent>(legacyPath);
    } catch (error) {
        return null;
    }
}

/**
 * Get game events with optimized file filtering using indexed filenames
 * Leverages filename pattern: game_event_{playerId}_{eventType}_{timestamp}_{id}.json
 * This allows filtering at the filesystem level before loading JSON
 * Refs #4 (Database indexes for game_events table)
 */
export function getGameEvents(playerId?: string, eventType?: string): GameEvent[] {
    ensureDataDir();

    try {
        const files = fs.readdirSync(DATA_DIR);

        // Filter files at filesystem level using indexed filename pattern
        // Pattern: game_event_{playerId}_{eventType}_{timestamp}_{id}.json
        let eventFiles = files.filter(f => f.startsWith('game_event_') && f.endsWith('.json'));

        // Optimize: Filter by playerId using filename pattern (if provided)
        if (playerId) {
            eventFiles = eventFiles.filter(f => {
                const parts = f.split('_');
                // Check if filename contains playerId in expected position (index 2)
                return parts.length >= 3 && parts[2] === playerId;
            });
        }

        // Optimize: Filter by eventType using filename pattern (if provided)
        if (eventType) {
            const sanitizedEventType = eventType.replace(/[^a-z0-9_]/gi, '_');
            eventFiles = eventFiles.filter(f => {
                const parts = f.split('_');
                // Check if filename contains eventType in expected position (index 3)
                return parts.length >= 4 && parts[3] === sanitizedEventType;
            });
        }

        // Load only the filtered files
        let events = eventFiles
            .map(file => readJSON<GameEvent>(getDataPath(file)))
            .filter((e): e is GameEvent => e !== null);

        // Fallback: Additional filtering for events stored with old naming convention
        // This ensures backward compatibility with existing data
        if (playerId && events.some(e => e.player_id !== playerId)) {
            events = events.filter(e => e.player_id === playerId);
        }

        if (eventType && events.some(e => e.event_type !== eventType)) {
            events = events.filter(e => e.event_type === eventType);
        }

        // Sort by date (newest first) - timestamp is in filename but we use created_at for accuracy
        return events.sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    } catch (error) {
        throw new Error(`Failed to read game events: ${error}`);
    }
}

export function countGameEvents(playerId: string, eventType: string): number {
    return getGameEvents(playerId, eventType).length;
}

export function getAllGameEvents(): GameEvent[] {
    return getGameEvents();
}

// ============================================================================
// World Events Storage
// ============================================================================

export function saveWorldEvent(event: Omit<WorldEvent, 'id' | 'created_at'>): WorldEvent {
    const newEvent: WorldEvent = {
        ...event,
        id: randomUUID(),
        created_at: new Date().toISOString(),
    };

    const filePath = getDataPath(`world_event_${newEvent.id}.json`);
    atomicWrite(filePath, newEvent);

    return newEvent;
}

export function getWorldEvent(eventId: string): WorldEvent | null {
    const filePath = getDataPath(`world_event_${eventId}.json`);
    return readJSON<WorldEvent>(filePath);
}

export function getWorldEvents(): WorldEvent[] {
    ensureDataDir();

    try {
        const files = fs.readdirSync(DATA_DIR);
        const eventFiles = files.filter(f => f.startsWith('world_event_') && f.endsWith('.json'));

        return eventFiles
            .map(file => readJSON<WorldEvent>(getDataPath(file)))
            .filter((e): e is WorldEvent => e !== null)
            .sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
    } catch (error) {
        throw new Error(`Failed to read world events: ${error}`);
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Clear all data (useful for testing or resetting demo)
 */
export function clearAllData(): void {
    ensureDataDir();

    try {
        const files = fs.readdirSync(DATA_DIR);
        files.forEach(file => {
            const filePath = path.join(DATA_DIR, file);
            if (fs.statSync(filePath).isFile() && file.endsWith('.json')) {
                fs.unlinkSync(filePath);
            }
        });
    } catch (error) {
        throw new Error(`Failed to clear data: ${error}`);
    }
}

/**
 * Get data directory statistics
 */
export function getDataStats(): {
    players: number;
    lore: number;
    npcMemories: number;
    gameEvents: number;
    worldEvents: number;
    npcRelationships: number;
    narrativeLogs: number;
    totalFiles: number;
} {
    ensureDataDir();

    try {
        const files = fs.readdirSync(DATA_DIR);

        return {
            players: files.filter(f => f.startsWith('player_')).length,
            lore: files.filter(f => f.startsWith('lore_')).length,
            npcMemories: files.filter(f => f.startsWith('npc_memory_')).length,
            gameEvents: files.filter(f => f.startsWith('game_event_')).length,
            worldEvents: files.filter(f => f.startsWith('world_event_')).length,
            npcRelationships: files.filter(f => f.startsWith('npc_relationship_')).length,
            narrativeLogs: files.filter(f => f.startsWith('narrative_log_')).length,
            totalFiles: files.filter(f => f.endsWith('.json')).length,
        };
    } catch (error) {
        throw new Error(`Failed to get data stats: ${error}`);
    }
}

// ============================================================================
// NPC Relationship Storage
// ============================================================================

/**
 * Save a new NPC relationship or get existing one
 * Initializes with neutral scores (50 for trust/respect/affinity, 0 for fear)
 */
export function saveNPCRelationship(relationship: Omit<NPCRelationship, 'id' | 'created_at' | 'last_updated'>): NPCRelationship {
    const newRelationship: NPCRelationship = {
        ...relationship,
        id: randomUUID(),
        last_updated: new Date().toISOString(),
        created_at: new Date().toISOString(),
    };

    const filePath = getDataPath(`npc_relationship_${newRelationship.id}.json`);
    atomicWrite(filePath, newRelationship);

    return newRelationship;
}

/**
 * Get a specific NPC relationship by ID
 */
export function getNPCRelationship(relationshipId: string): NPCRelationship | null {
    const filePath = getDataPath(`npc_relationship_${relationshipId}.json`);
    return readJSON<NPCRelationship>(filePath);
}

/**
 * Get relationship between an NPC and player, or create a new one with neutral scores
 */
export function getNPCPlayerRelationship(npcId: string, playerId: string): NPCRelationship {
    ensureDataDir();

    try {
        const files = fs.readdirSync(DATA_DIR);
        const relationshipFiles = files.filter(f => f.startsWith('npc_relationship_') && f.endsWith('.json'));

        // Find existing relationship
        for (const file of relationshipFiles) {
            const relationship = readJSON<NPCRelationship>(getDataPath(file));
            if (relationship && relationship.npc_id === npcId && relationship.player_id === playerId) {
                return relationship;
            }
        }

        // No existing relationship found, create new one with neutral scores
        return saveNPCRelationship({
            npc_id: npcId,
            player_id: playerId,
            trust: 50,      // Neutral trust
            respect: 50,    // Neutral respect
            fear: 0,        // No fear initially
            affinity: 50    // Neutral affinity
        });
    } catch (error) {
        throw new Error(`Failed to get/create NPC relationship: ${error}`);
    }
}

/**
 * Update an existing NPC relationship
 * Automatically clamps values to 0-100 range
 */
export function updateNPCRelationship(
    npcId: string,
    playerId: string,
    updates: Partial<Pick<NPCRelationship, 'trust' | 'respect' | 'fear' | 'affinity'>>
): NPCRelationship {
    const relationship = getNPCPlayerRelationship(npcId, playerId);

    // Apply updates with clamping to 0-100 range
    const clamp = (value: number) => Math.max(0, Math.min(100, value));

    const updatedRelationship: NPCRelationship = {
        ...relationship,
        trust: updates.trust !== undefined ? clamp(updates.trust) : relationship.trust,
        respect: updates.respect !== undefined ? clamp(updates.respect) : relationship.respect,
        fear: updates.fear !== undefined ? clamp(updates.fear) : relationship.fear,
        affinity: updates.affinity !== undefined ? clamp(updates.affinity) : relationship.affinity,
        last_updated: new Date().toISOString()
    };

    const filePath = getDataPath(`npc_relationship_${relationship.id}.json`);
    atomicWrite(filePath, updatedRelationship);

    return updatedRelationship;
}

/**
 * Modify NPC relationship by delta values (increments/decrements)
 * Automatically clamps final values to 0-100 range
 */
export function modifyNPCRelationship(
    npcId: string,
    playerId: string,
    deltas: Partial<Pick<NPCRelationship, 'trust' | 'respect' | 'fear' | 'affinity'>>
): NPCRelationship {
    const relationship = getNPCPlayerRelationship(npcId, playerId);

    return updateNPCRelationship(npcId, playerId, {
        trust: deltas.trust !== undefined ? relationship.trust + deltas.trust : relationship.trust,
        respect: deltas.respect !== undefined ? relationship.respect + deltas.respect : relationship.respect,
        fear: deltas.fear !== undefined ? relationship.fear + deltas.fear : relationship.fear,
        affinity: deltas.affinity !== undefined ? relationship.affinity + deltas.affinity : relationship.affinity
    });
}

/**
 * Get all relationships for a specific NPC
 */
export function getAllNPCRelationships(npcId: string): NPCRelationship[] {
    ensureDataDir();

    try {
        const files = fs.readdirSync(DATA_DIR);
        const relationshipFiles = files.filter(f => f.startsWith('npc_relationship_') && f.endsWith('.json'));

        return relationshipFiles
            .map(file => readJSON<NPCRelationship>(getDataPath(file)))
            .filter((r): r is NPCRelationship => r !== null && r.npc_id === npcId)
            .sort((a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime());
    } catch (error) {
        throw new Error(`Failed to read NPC relationships: ${error}`);
    }
}

/**
 * Get all relationships for a specific player
 */
export function getAllPlayerRelationships(playerId: string): NPCRelationship[] {
    ensureDataDir();

    try {
        const files = fs.readdirSync(DATA_DIR);
        const relationshipFiles = files.filter(f => f.startsWith('npc_relationship_') && f.endsWith('.json'));

        return relationshipFiles
            .map(file => readJSON<NPCRelationship>(getDataPath(file)))
            .filter((r): r is NPCRelationship => r !== null && r.player_id === playerId)
            .sort((a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime());
    } catch (error) {
        throw new Error(`Failed to read player relationships: ${error}`);
    }
}

// ============================================================================
// Narrative Log Storage (Epic 4)
// ============================================================================

/**
 * Save a narrative log entry with indexed file naming for optimized queries
 *
 * File naming pattern: narrative_log_{playerId}_{npcId}_{timestamp}_{id}.json
 * This allows efficient filtering by player and NPC without loading all files
 *
 * Records player input, GM response, and context metadata
 * Refs #10 (Epic 4: Narrative History Storage)
 */
export function saveNarrativeLog(log: Omit<NarrativeLog, 'id' | 'created_at'>): NarrativeLog {
    const newLog: NarrativeLog = {
        ...log,
        id: randomUUID(),
        created_at: new Date().toISOString(),
    };

    // Create indexed filename for efficient queries
    // Format: narrative_log_{playerId}_{npcId}_{timestamp}_{id}.json
    const timestamp = new Date().getTime();
    const npcPart = log.npc_id || 'system';
    const indexedFilename = `narrative_log_${log.player_id}_${npcPart}_${timestamp}_${newLog.id}.json`;
    const filePath = getDataPath(indexedFilename);

    atomicWrite(filePath, newLog);

    return newLog;
}

/**
 * Get a specific narrative log by ID
 * Supports both indexed and legacy filename formats
 */
export function getNarrativeLog(logId: string): NarrativeLog | null {
    ensureDataDir();

    try {
        // Try indexed filename format first
        const files = fs.readdirSync(DATA_DIR);
        const matchingFile = files.find(f => f.includes(logId) && f.startsWith('narrative_log_'));

        if (matchingFile) {
            return readJSON<NarrativeLog>(getDataPath(matchingFile));
        }

        // Fallback to legacy format
        const legacyPath = getDataPath(`narrative_log_${logId}.json`);
        return readJSON<NarrativeLog>(legacyPath);
    } catch (error) {
        return null;
    }
}

/**
 * Get all narrative logs for a specific player with optimized file filtering
 * Returns logs sorted by timestamp (newest first)
 *
 * Uses indexed filename pattern: narrative_log_{playerId}_{npcId}_{timestamp}_{id}.json
 * This allows filtering at the filesystem level before loading JSON
 * Refs #10 (Epic 4: Narrative History Storage - Performance Optimization)
 *
 * @param playerId - The player ID to filter by
 * @param limit - Optional limit on number of logs to return (for pagination)
 * @param offset - Optional offset for pagination
 */
export function getNarrativeLogsByPlayer(
    playerId: string,
    limit?: number,
    offset: number = 0
): NarrativeLog[] {
    ensureDataDir();

    try {
        const files = fs.readdirSync(DATA_DIR);

        // Optimize: Filter files at filesystem level using indexed filename pattern
        // Pattern: narrative_log_{playerId}_{npcId}_{timestamp}_{id}.json
        let logFiles = files.filter(f => f.startsWith('narrative_log_') && f.endsWith('.json'));

        // Optimize: Filter by playerId using filename pattern (if possible)
        const indexedFiles = logFiles.filter(f => {
            const parts = f.split('_');
            // Check if filename contains playerId in expected position (index 2)
            return parts.length >= 5 && parts[2] === playerId;
        });

        // If we found indexed files, use those; otherwise fallback to loading all
        const filesToLoad = indexedFiles.length > 0 ? indexedFiles : logFiles;

        // Load only the filtered files
        let logs = filesToLoad
            .map(file => readJSON<NarrativeLog>(getDataPath(file)))
            .filter((l): l is NarrativeLog => l !== null);

        // Fallback: Additional filtering for logs stored with old naming convention
        // This ensures backward compatibility with existing data
        if (indexedFiles.length === 0) {
            logs = logs.filter(l => l.player_id === playerId);
        }

        // Sort by timestamp (newest first)
        logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // Apply pagination if limit is specified
        if (limit !== undefined) {
            logs = logs.slice(offset, offset + limit);
        }

        return logs;
    } catch (error) {
        throw new Error(`Failed to read narrative logs: ${error}`);
    }
}

/**
 * Get narrative logs for a specific NPC-Player conversation with optimized filtering
 * Returns logs sorted by timestamp (newest first)
 *
 * Uses indexed filename pattern: narrative_log_{playerId}_{npcId}_{timestamp}_{id}.json
 * This allows filtering both by player and NPC at the filesystem level
 * Refs #10 (Epic 4: Narrative History Storage - Performance Optimization)
 *
 * @param npcId - The NPC ID to filter by
 * @param playerId - The player ID to filter by
 * @param limit - Optional limit on number of logs to return
 */
export function getNarrativeLogsByNPCAndPlayer(
    npcId: string,
    playerId: string,
    limit?: number
): NarrativeLog[] {
    ensureDataDir();

    try {
        const files = fs.readdirSync(DATA_DIR);

        // Optimize: Filter files at filesystem level using indexed filename pattern
        // Pattern: narrative_log_{playerId}_{npcId}_{timestamp}_{id}.json
        let logFiles = files.filter(f => f.startsWith('narrative_log_') && f.endsWith('.json'));

        // Optimize: Filter by playerId AND npcId using filename pattern
        const indexedFiles = logFiles.filter(f => {
            const parts = f.split('_');
            // Check if filename contains both playerId and npcId in expected positions
            return parts.length >= 5 &&
                   parts[2] === playerId &&
                   parts[3] === npcId;
        });

        // If we found indexed files, use those; otherwise fallback to loading all
        const filesToLoad = indexedFiles.length > 0 ? indexedFiles : logFiles;

        // Load only the filtered files
        let logs = filesToLoad
            .map(file => readJSON<NarrativeLog>(getDataPath(file)))
            .filter((l): l is NarrativeLog => l !== null);

        // Fallback: Additional filtering for logs stored with old naming convention
        if (indexedFiles.length === 0) {
            logs = logs.filter(l => l.player_id === playerId && l.npc_id === npcId);
        }

        // Sort by timestamp (newest first)
        logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // Apply limit if specified
        if (limit !== undefined) {
            logs = logs.slice(0, limit);
        }

        return logs;
    } catch (error) {
        throw new Error(`Failed to read NPC-Player narrative logs: ${error}`);
    }
}

/**
 * Get all narrative logs (admin function)
 * Returns logs sorted by timestamp (newest first)
 *
 * @param limit - Optional limit on number of logs to return
 */
export function getAllNarrativeLogs(limit?: number): NarrativeLog[] {
    ensureDataDir();

    try {
        const files = fs.readdirSync(DATA_DIR);
        const logFiles = files.filter(f => f.startsWith('narrative_log_') && f.endsWith('.json'));

        let logs = logFiles
            .map(file => readJSON<NarrativeLog>(getDataPath(file)))
            .filter((l): l is NarrativeLog => l !== null)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // Apply limit if specified
        if (limit !== undefined) {
            logs = logs.slice(0, limit);
        }

        return logs;
    } catch (error) {
        throw new Error(`Failed to read all narrative logs: ${error}`);
    }
}

/**
 * Get count of narrative logs for a player
 * Useful for pagination
 */
export function getNarrativeLogCount(playerId: string): number {
    ensureDataDir();

    try {
        const files = fs.readdirSync(DATA_DIR);
        const logFiles = files.filter(f => f.startsWith('narrative_log_') && f.endsWith('.json'));

        return logFiles
            .map(file => readJSON<NarrativeLog>(getDataPath(file)))
            .filter((l): l is NarrativeLog => l !== null && l.player_id === playerId)
            .length;
    } catch (error) {
        throw new Error(`Failed to count narrative logs: ${error}`);
    }
}

/**
 * Search narrative logs by player input or GM response content
 * Case-insensitive search
 *
 * @param playerId - The player ID to filter by
 * @param searchTerm - The search term to match against
 * @param limit - Optional limit on number of results
 */
export function searchNarrativeLogs(
    playerId: string,
    searchTerm: string,
    limit?: number
): NarrativeLog[] {
    ensureDataDir();

    try {
        const files = fs.readdirSync(DATA_DIR);
        const logFiles = files.filter(f => f.startsWith('narrative_log_') && f.endsWith('.json'));

        const searchLower = searchTerm.toLowerCase();

        let logs = logFiles
            .map(file => readJSON<NarrativeLog>(getDataPath(file)))
            .filter((l): l is NarrativeLog =>
                l !== null &&
                l.player_id === playerId &&
                (l.player_input.toLowerCase().includes(searchLower) ||
                 l.gm_response.toLowerCase().includes(searchLower))
            )
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // Apply limit if specified
        if (limit !== undefined) {
            logs = logs.slice(0, limit);
        }

        return logs;
    } catch (error) {
        throw new Error(`Failed to search narrative logs: ${error}`);
    }
}
