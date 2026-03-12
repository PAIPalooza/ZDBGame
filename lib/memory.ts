import { NPCMemory } from './types';

// In-memory storage for NPC memories
let npcMemoriesStore: NPCMemory[] = [];

/**
 * Store a new NPC memory
 */
export function storeMemory(
  npcId: string,
  playerId: string,
  memory: string,
  importance: number = 1
): NPCMemory {
  // Check if similar memory already exists to avoid duplicates
  const existingMemory = npcMemoriesStore.find(
    m => m.npcId === npcId && 
         m.playerId === playerId && 
         m.memory.toLowerCase() === memory.toLowerCase()
  );

  if (existingMemory) {
    return existingMemory;
  }

  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 9);
  const newMemory: NPCMemory = {
    id: `mem-${timestamp}-${randomPart}`,
    npcId,
    playerId,
    memory,
    importance,
    createdAt: new Date().toISOString()
  };

  npcMemoriesStore.push(newMemory);
  return newMemory;
}

/**
 * Retrieve memories for a specific NPC and player
 */
export function getMemories(npcId: string, playerId: string): NPCMemory[] {
  return npcMemoriesStore
    .filter(m => m.npcId === npcId && m.playerId === playerId)
    .sort((a, b) => {
      // Sort by importance (descending) then by creation time (most recent first)
      if (a.importance !== b.importance) {
        return b.importance - a.importance;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

/**
 * Get all memories for an NPC
 */
export function getAllNPCMemories(npcId: string): NPCMemory[] {
  return npcMemoriesStore
    .filter(m => m.npcId === npcId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Get all memories for a player
 */
export function getAllPlayerMemories(playerId: string): NPCMemory[] {
  return npcMemoriesStore
    .filter(m => m.playerId === playerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Clear all memories (useful for testing)
 */
export function clearMemories(): void {
  npcMemoriesStore = [];
}

/**
 * Get total memory count
 */
export function getMemoryCount(): number {
  return npcMemoriesStore.length;
}
