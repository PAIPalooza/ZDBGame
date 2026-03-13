import { NPCResponse, LoreEntry, NPCMemory } from './types';
import { searchLore } from './lore';
import { getMemories, storeMemory } from './memory';
import { getRelationship, getRelationshipContext, updateRelationshipForAction } from './relationships';

/**
 * Generate a deterministic NPC response based on player input
 * Uses keyword-based lore retrieval, memory context, and relationship status
 */
export async function generateNPCResponse(
  npcId: string,
  playerId: string,
  playerMessage: string
): Promise<NPCResponse> {
  const normalizedMessage = playerMessage.toLowerCase().trim();

  // Retrieve NPC memories about this player
  const memories = await getMemories(npcId, playerId);

  // Get current relationship status
  const relationship = getRelationship(npcId, playerId);
  const relationshipContext = getRelationshipContext(relationship);

  // Generate response based on keywords, memories, and relationship
  const { response, loreUsed } = buildResponse(normalizedMessage, memories, relationshipContext);

  // Store memory of this conversation
  await storeConversationMemory(npcId, playerId, normalizedMessage);

  // Update relationship for conversation (small affinity boost)
  const updatedRelationship = updateRelationshipForAction(npcId, playerId, 'ask_generic_question');

  return {
    response,
    loreUsed,
    memoriesReferenced: memories,
    relationshipStatus: updatedRelationship
  };
}

/**
 * Build deterministic response using templates
 */
function buildResponse(
  message: string,
  memories: NPCMemory[],
  relationshipContext: string
): { response: string; loreUsed: LoreEntry[] } {
  // Check for specific keywords and build appropriate response
  let response = '';
  let loreUsed: LoreEntry[] = [];

  // Reference past actions if memories exist
  const memoryContext = buildMemoryContext(memories);

  // Ember Tower query
  if (message.includes('ember tower') || message.includes('tower')) {
    const emberLore = searchLore('ember tower');
    if (emberLore.length > 0) {
      const lore = emberLore[0];
      loreUsed = [lore];
      const loreContent = lore.content.toLowerCase();
      response = memoryContext
        ? memoryContext + ' As for Ember Tower, ' + loreContent
        : 'Ah, Ember Tower... ' + lore.content;
    }
  }

  // Moonvale query
  else if (message.includes('moonvale') || message.includes('village') || message.includes('founding')) {
    const moonvaleLore = searchLore('moonvale');
    if (moonvaleLore.length > 0) {
      const lore = moonvaleLore[0];
      loreUsed = [lore];
      const loreContent = lore.content.toLowerCase();
      response = memoryContext
        ? memoryContext + ' Regarding Moonvale, ' + loreContent
        : 'Let me tell you about Moonvale. ' + lore.content;
    }
  }

  // Wolves query - prioritize this check before forest
  else if (message.includes('wolf') || message.includes('wolves')) {
    const wolvesLore = searchLore('wolves');
    const hasWolfMemories = memories.some(m => {
      const mem = m.memory.toLowerCase();
      return mem.includes('wolf') || mem.includes('wolves');
    });

    if (wolvesLore.length > 0) {
      const lore = wolvesLore[0];
      loreUsed = [lore];
      if (hasWolfMemories) {
        response = "You've already changed the balance around Moonvale. I heard you drove the wolves back. " + lore.content;
      } else {
        response = 'Be careful, traveler. ' + lore.content;
      }
    }
  }

  // Generic greeting
  else if (message.includes('hello') || message.includes('hi') || message.includes('greetings')) {
    const greeting = memoryContext
      ? memoryContext + ' Welcome back. How may I assist you today?'
      : relationshipContext + ' I am Elarin, the village historian. How may I help you?';
    response = greeting;
  }

  // Help query
  else if (message.includes('help') || message.includes('assist') || message.includes('what can')) {
    response = 'I keep the knowledge of Moonvale and its history. Ask me about Ember Tower, the founding of Moonvale, or the dangers in the forest.';
  }

  // Default - search for any relevant lore
  else {
    const foundLore = searchLore(message);
    if (foundLore.length > 0) {
      loreUsed = [foundLore[0]];
      response = memoryContext
        ? memoryContext + ' ' + foundLore[0].content
        : foundLore[0].content;
    } else {
      // Fallback response
      response = memoryContext
        ? memoryContext + " I'm not sure about that, but feel free to ask me about Moonvale's history, Ember Tower, or the wolves in the forest."
        : "I keep the knowledge of this land. Ask me about Ember Tower, Moonvale, or the wolves that roam the northern forest.";
    }
  }

  return { response, loreUsed };
}

/**
 * Build memory context string from recent memories
 */
function buildMemoryContext(memories: NPCMemory[]): string {
  if (memories.length === 0) {
    return '';
  }

  // Check for wolf-related achievements
  const wolfMemories = memories.filter(m => {
    const mem = m.memory.toLowerCase();
    return mem.includes('wolf') || mem.includes('wolves');
  });
  if (wolfMemories.length > 0) {
    return "You've already changed Moonvale. I heard you drove the wolves back.";
  }

  // Check for exploration
  const explorationMemories = memories.filter(m => m.memory.toLowerCase().includes('explored'));
  if (explorationMemories.length > 0) {
    return "I see you've been exploring our lands.";
  }

  // Check for helping village
  const helpMemories = memories.filter(m => m.memory.toLowerCase().includes('helped'));
  if (helpMemories.length > 0) {
    return 'Thank you for helping our village.';
  }

  // Generic recognition
  return 'I remember you, traveler.';
}

/**
 * Store memory of player conversation
 */
async function storeConversationMemory(
  npcId: string,
  playerId: string,
  message: string
): Promise<void> {
  // Store specific memorable questions
  if (message.includes('ember tower') || message.includes('tower')) {
    await storeMemory(npcId, playerId, 'Player asked about Ember Tower', 2);
  }

  if (message.includes('moonvale')) {
    await storeMemory(npcId, playerId, 'Player asked about Moonvale', 1);
  }

  if (message.includes('wolf') || message.includes('wolves')) {
    await storeMemory(npcId, playerId, 'Player asked about wolves', 1);
  }
}

/**
 * Store memory of player action (for game events)
 * Also updates NPC relationships based on the action
 */
export async function storeActionMemory(
  npcId: string,
  playerId: string,
  action: string
): Promise<void> {
  switch (action) {
    case 'wolf_kill':
      await storeMemory(npcId, playerId, 'Player defeated wolves near Moonvale', 3);
      updateRelationshipForAction(npcId, playerId, 'wolf_kill');
      break;
    case 'explore':
      await storeMemory(npcId, playerId, 'Player explored the northern forest', 1);
      updateRelationshipForAction(npcId, playerId, 'explore_together');
      break;
    case 'help_village':
      await storeMemory(npcId, playerId, 'Player helped the village', 2);
      updateRelationshipForAction(npcId, playerId, 'help_village');
      break;
  }
}
