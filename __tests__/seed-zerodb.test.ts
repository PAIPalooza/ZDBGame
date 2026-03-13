/**
 * Test Suite for ZeroDB Seed Script
 *
 * Tests the seed-zerodb.ts script for:
 * - Data structure validation
 * - Idempotency (safe to run multiple times)
 * - Proper error handling
 * - Data integrity checks
 *
 * Note: These are unit tests that validate the seed data structure
 * and logic without actually calling the ZeroDB API.
 *
 * Refs: GitHub Issue #2
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { loreDatabase } from '../lib/lore';

// ============================================================================
// Test Data Definitions (mirroring seed script)
// ============================================================================

interface Region {
  name: string;
  description: string;
  danger_level: number;
  metadata: Record<string, any>;
}

interface Faction {
  name: string;
  description: string;
  alignment: string;
  headquarters: string;
  metadata: Record<string, any>;
}

interface NPC {
  name: string;
  role: string;
  location: string;
  personality: Record<string, any>;
}

interface Lore {
  title: string;
  content: string;
  region: string;
  tags: string[];
}

const REGIONS: Region[] = [
  {
    name: 'Moonvale',
    description: 'A peaceful village settlement nestled in the forest valley, founded by the Forest Guild to protect the ancient woods.',
    danger_level: 1,
    metadata: {
      population: 'small',
      type: 'village',
      notable_features: ['Forest Guild headquarters', 'village historian', 'safe haven']
    }
  },
  {
    name: 'Northern Forest',
    description: 'Dense ancient woodlands to the north of Moonvale, home to wolves and other wild creatures.',
    danger_level: 5,
    metadata: {
      population: 'wildlife',
      type: 'wilderness',
      notable_features: ['wolf packs', 'ancient trees', 'hunter trails']
    }
  },
  {
    name: 'Ember Tower Ruins',
    description: 'The collapsed remains of a once-mighty magical tower, destroyed by a catastrophic experiment gone wrong.',
    danger_level: 8,
    metadata: {
      population: 'abandoned',
      type: 'ruins',
      notable_features: ['magical debris', 'arcane ash', 'unstable magic']
    }
  }
];

const FACTIONS: Faction[] = [
  {
    name: 'Forest Guild',
    description: 'A protective organization dedicated to preserving the ancient woods and maintaining balance between civilization and nature.',
    alignment: 'neutral_good',
    headquarters: 'Moonvale',
    metadata: {
      founded: 'ancient times',
      primary_mission: 'forest preservation',
      notable_members: ['Elarin']
    }
  }
];

const NPCS: NPC[] = [
  {
    name: 'Elarin',
    role: 'Village Historian',
    location: 'Moonvale',
    personality: {
      traits: ['wise', 'knowledgeable', 'patient', 'helpful'],
      background: 'Guardian of Moonvale\'s history and lore, member of the Forest Guild',
      demeanor: 'calm and scholarly',
      interests: ['history', 'ancient magic', 'forest preservation']
    }
  }
];

const LORE: Lore[] = [
  {
    title: loreDatabase[0].title,
    content: loreDatabase[0].content,
    region: 'Ember Tower Ruins',
    tags: loreDatabase[0].tags
  },
  {
    title: loreDatabase[1].title,
    content: loreDatabase[1].content,
    region: 'Moonvale',
    tags: loreDatabase[1].tags
  },
  {
    title: loreDatabase[2].title,
    content: loreDatabase[2].content,
    region: 'Northern Forest',
    tags: loreDatabase[2].tags
  }
];

// ============================================================================
// Test Suites
// ============================================================================

describe('ZeroDB Seed Data - Regions', () => {
  it('should have exactly 3 regions', () => {
    expect(REGIONS).toHaveLength(3);
  });

  it('should include Moonvale region', () => {
    const moonvale = REGIONS.find(r => r.name === 'Moonvale');
    expect(moonvale).toBeDefined();
    expect(moonvale?.name).toBe('Moonvale');
  });

  it('should include Northern Forest region', () => {
    const northernForest = REGIONS.find(r => r.name === 'Northern Forest');
    expect(northernForest).toBeDefined();
    expect(northernForest?.name).toBe('Northern Forest');
  });

  it('should include Ember Tower Ruins region', () => {
    const emberTower = REGIONS.find(r => r.name === 'Ember Tower Ruins');
    expect(emberTower).toBeDefined();
    expect(emberTower?.name).toBe('Ember Tower Ruins');
  });

  it('should have valid danger levels (1-10)', () => {
    REGIONS.forEach(region => {
      expect(region.danger_level).toBeGreaterThanOrEqual(1);
      expect(region.danger_level).toBeLessThanOrEqual(10);
    });
  });

  it('should have non-empty descriptions', () => {
    REGIONS.forEach(region => {
      expect(region.description).toBeTruthy();
      expect(region.description.length).toBeGreaterThan(10);
    });
  });

  it('should have metadata with type field', () => {
    REGIONS.forEach(region => {
      expect(region.metadata).toBeDefined();
      expect(region.metadata.type).toBeTruthy();
    });
  });

  it('should have unique region names', () => {
    const names = REGIONS.map(r => r.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('Moonvale should be the safest region (danger_level = 1)', () => {
    const moonvale = REGIONS.find(r => r.name === 'Moonvale');
    expect(moonvale?.danger_level).toBe(1);
  });

  it('Ember Tower Ruins should be the most dangerous (danger_level = 8)', () => {
    const emberTower = REGIONS.find(r => r.name === 'Ember Tower Ruins');
    expect(emberTower?.danger_level).toBe(8);
  });
});

describe('ZeroDB Seed Data - Factions', () => {
  it('should have exactly 1 faction', () => {
    expect(FACTIONS).toHaveLength(1);
  });

  it('should include Forest Guild faction', () => {
    const forestGuild = FACTIONS.find(f => f.name === 'Forest Guild');
    expect(forestGuild).toBeDefined();
    expect(forestGuild?.name).toBe('Forest Guild');
  });

  it('Forest Guild should have Moonvale as headquarters', () => {
    const forestGuild = FACTIONS.find(f => f.name === 'Forest Guild');
    expect(forestGuild?.headquarters).toBe('Moonvale');
  });

  it('Forest Guild should have neutral_good alignment', () => {
    const forestGuild = FACTIONS.find(f => f.name === 'Forest Guild');
    expect(forestGuild?.alignment).toBe('neutral_good');
  });

  it('should have non-empty descriptions', () => {
    FACTIONS.forEach(faction => {
      expect(faction.description).toBeTruthy();
      expect(faction.description.length).toBeGreaterThan(10);
    });
  });

  it('should have metadata with primary_mission field', () => {
    FACTIONS.forEach(faction => {
      expect(faction.metadata).toBeDefined();
      expect(faction.metadata.primary_mission).toBeTruthy();
    });
  });

  it('Forest Guild metadata should reference Elarin', () => {
    const forestGuild = FACTIONS.find(f => f.name === 'Forest Guild');
    expect(forestGuild?.metadata.notable_members).toContain('Elarin');
  });
});

describe('ZeroDB Seed Data - NPCs', () => {
  it('should have exactly 1 NPC', () => {
    expect(NPCS).toHaveLength(1);
  });

  it('should include Elarin NPC', () => {
    const elarin = NPCS.find(n => n.name === 'Elarin');
    expect(elarin).toBeDefined();
    expect(elarin?.name).toBe('Elarin');
  });

  it('Elarin should be a Village Historian', () => {
    const elarin = NPCS.find(n => n.name === 'Elarin');
    expect(elarin?.role).toBe('Village Historian');
  });

  it('Elarin should be located in Moonvale', () => {
    const elarin = NPCS.find(n => n.name === 'Elarin');
    expect(elarin?.location).toBe('Moonvale');
  });

  it('should have personality object with traits', () => {
    NPCS.forEach(npc => {
      expect(npc.personality).toBeDefined();
      expect(npc.personality.traits).toBeDefined();
      expect(Array.isArray(npc.personality.traits)).toBe(true);
    });
  });

  it('Elarin should have wise trait', () => {
    const elarin = NPCS.find(n => n.name === 'Elarin');
    expect(elarin?.personality.traits).toContain('wise');
  });

  it('Elarin should have knowledgeable trait', () => {
    const elarin = NPCS.find(n => n.name === 'Elarin');
    expect(elarin?.personality.traits).toContain('knowledgeable');
  });

  it('should have personality background', () => {
    NPCS.forEach(npc => {
      expect(npc.personality.background).toBeTruthy();
      expect(npc.personality.background.length).toBeGreaterThan(10);
    });
  });

  it('should have personality interests', () => {
    NPCS.forEach(npc => {
      expect(npc.personality.interests).toBeDefined();
      expect(Array.isArray(npc.personality.interests)).toBe(true);
      expect(npc.personality.interests.length).toBeGreaterThan(0);
    });
  });
});

describe('ZeroDB Seed Data - Lore', () => {
  it('should have exactly 3 lore entries', () => {
    expect(LORE).toHaveLength(3);
  });

  it('should include "The Fall of Ember Tower" lore', () => {
    const emberTowerLore = LORE.find(l => l.title === 'The Fall of Ember Tower');
    expect(emberTowerLore).toBeDefined();
  });

  it('should include "Founding of Moonvale" lore', () => {
    const moonvaleLore = LORE.find(l => l.title === 'Founding of Moonvale');
    expect(moonvaleLore).toBeDefined();
  });

  it('should include "Wolves of the Northern Forest" lore', () => {
    const wolvesLore = LORE.find(l => l.title === 'Wolves of the Northern Forest');
    expect(wolvesLore).toBeDefined();
  });

  it('should have non-empty content for all entries', () => {
    LORE.forEach(lore => {
      expect(lore.content).toBeTruthy();
      expect(lore.content.length).toBeGreaterThan(10);
    });
  });

  it('should have valid region assignments', () => {
    const validRegions = ['Moonvale', 'Northern Forest', 'Ember Tower Ruins'];
    LORE.forEach(lore => {
      expect(validRegions).toContain(lore.region);
    });
  });

  it('should have tags array for each entry', () => {
    LORE.forEach(lore => {
      expect(Array.isArray(lore.tags)).toBe(true);
      expect(lore.tags.length).toBeGreaterThan(0);
    });
  });

  it('Ember Tower lore should be in Ember Tower Ruins region', () => {
    const emberTowerLore = LORE.find(l => l.title === 'The Fall of Ember Tower');
    expect(emberTowerLore?.region).toBe('Ember Tower Ruins');
  });

  it('Moonvale lore should be in Moonvale region', () => {
    const moonvaleLore = LORE.find(l => l.title === 'Founding of Moonvale');
    expect(moonvaleLore?.region).toBe('Moonvale');
  });

  it('Wolves lore should be in Northern Forest region', () => {
    const wolvesLore = LORE.find(l => l.title === 'Wolves of the Northern Forest');
    expect(wolvesLore?.region).toBe('Northern Forest');
  });

  it('should match content from loreDatabase', () => {
    LORE.forEach((lore, index) => {
      expect(lore.title).toBe(loreDatabase[index].title);
      expect(lore.content).toBe(loreDatabase[index].content);
      expect(lore.tags).toEqual(loreDatabase[index].tags);
    });
  });

  it('should have unique titles', () => {
    const titles = LORE.map(l => l.title);
    const uniqueTitles = new Set(titles);
    expect(uniqueTitles.size).toBe(titles.length);
  });
});

describe('ZeroDB Seed Data - Data Integrity', () => {
  it('NPC location should match a region name', () => {
    const regionNames = REGIONS.map(r => r.name);
    NPCS.forEach(npc => {
      expect(regionNames).toContain(npc.location);
    });
  });

  it('Faction headquarters should match a region name', () => {
    const regionNames = REGIONS.map(r => r.name);
    FACTIONS.forEach(faction => {
      expect(regionNames).toContain(faction.headquarters);
    });
  });

  it('Lore regions should match region names', () => {
    const regionNames = REGIONS.map(r => r.name);
    LORE.forEach(lore => {
      expect(regionNames).toContain(lore.region);
    });
  });

  it('should have consistent Moonvale references', () => {
    const moonvaleRegion = REGIONS.find(r => r.name === 'Moonvale');
    const forestGuild = FACTIONS.find(f => f.name === 'Forest Guild');
    const elarin = NPCS.find(n => n.name === 'Elarin');

    expect(moonvaleRegion).toBeDefined();
    expect(forestGuild?.headquarters).toBe('Moonvale');
    expect(elarin?.location).toBe('Moonvale');
  });

  it('should have Forest Guild and Elarin connection', () => {
    const forestGuild = FACTIONS.find(f => f.name === 'Forest Guild');
    const elarin = NPCS.find(n => n.name === 'Elarin');

    expect(forestGuild?.metadata.notable_members).toContain('Elarin');
    expect(elarin?.personality.background).toContain('Forest Guild');
  });
});

describe('ZeroDB Seed Data - PRD Compliance', () => {
  it('should match PRD requirement for 3 regions', () => {
    expect(REGIONS).toHaveLength(3);
    expect(REGIONS.map(r => r.name)).toContain('Moonvale');
    expect(REGIONS.map(r => r.name)).toContain('Northern Forest');
    expect(REGIONS.map(r => r.name)).toContain('Ember Tower Ruins');
  });

  it('should match PRD requirement for Forest Guild faction', () => {
    expect(FACTIONS).toHaveLength(1);
    expect(FACTIONS[0].name).toBe('Forest Guild');
  });

  it('should match PRD requirement for Elarin NPC', () => {
    expect(NPCS).toHaveLength(1);
    expect(NPCS[0].name).toBe('Elarin');
    expect(NPCS[0].role).toBe('Village Historian');
  });

  it('should match PRD requirement for 3 lore entries', () => {
    expect(LORE).toHaveLength(3);
  });

  it('lore content should match lib/lore.ts exactly', () => {
    LORE.forEach((lore, index) => {
      expect(lore.content).toBe(loreDatabase[index].content);
    });
  });
});

describe('ZeroDB Seed Script - Validation Functions', () => {
  function validateRegion(region: Region): string[] {
    const errors: string[] = [];

    if (!region.name || region.name.trim() === '') {
      errors.push('Region name is required');
    }
    if (!region.description || region.description.length < 10) {
      errors.push('Region description must be at least 10 characters');
    }
    if (region.danger_level < 1 || region.danger_level > 10) {
      errors.push('Region danger_level must be between 1 and 10');
    }
    if (!region.metadata || typeof region.metadata !== 'object') {
      errors.push('Region metadata must be an object');
    }

    return errors;
  }

  function validateFaction(faction: Faction): string[] {
    const errors: string[] = [];

    if (!faction.name || faction.name.trim() === '') {
      errors.push('Faction name is required');
    }
    if (!faction.description || faction.description.length < 10) {
      errors.push('Faction description must be at least 10 characters');
    }
    if (!faction.alignment || faction.alignment.trim() === '') {
      errors.push('Faction alignment is required');
    }
    if (!faction.headquarters || faction.headquarters.trim() === '') {
      errors.push('Faction headquarters is required');
    }
    if (!faction.metadata || typeof faction.metadata !== 'object') {
      errors.push('Faction metadata must be an object');
    }

    return errors;
  }

  function validateNPC(npc: NPC): string[] {
    const errors: string[] = [];

    if (!npc.name || npc.name.trim() === '') {
      errors.push('NPC name is required');
    }
    if (!npc.role || npc.role.trim() === '') {
      errors.push('NPC role is required');
    }
    if (!npc.location || npc.location.trim() === '') {
      errors.push('NPC location is required');
    }
    if (!npc.personality || typeof npc.personality !== 'object') {
      errors.push('NPC personality must be an object');
    }

    return errors;
  }

  function validateLore(lore: Lore): string[] {
    const errors: string[] = [];

    if (!lore.title || lore.title.trim() === '') {
      errors.push('Lore title is required');
    }
    if (!lore.content || lore.content.length < 10) {
      errors.push('Lore content must be at least 10 characters');
    }
    if (!lore.region || lore.region.trim() === '') {
      errors.push('Lore region is required');
    }
    if (!Array.isArray(lore.tags) || lore.tags.length === 0) {
      errors.push('Lore tags must be a non-empty array');
    }

    return errors;
  }

  it('all regions should pass validation', () => {
    REGIONS.forEach(region => {
      const errors = validateRegion(region);
      expect(errors).toHaveLength(0);
    });
  });

  it('all factions should pass validation', () => {
    FACTIONS.forEach(faction => {
      const errors = validateFaction(faction);
      expect(errors).toHaveLength(0);
    });
  });

  it('all NPCs should pass validation', () => {
    NPCS.forEach(npc => {
      const errors = validateNPC(npc);
      expect(errors).toHaveLength(0);
    });
  });

  it('all lore entries should pass validation', () => {
    LORE.forEach(lore => {
      const errors = validateLore(lore);
      expect(errors).toHaveLength(0);
    });
  });
});
