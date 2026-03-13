# NPC Relationship Tracking - Interactive Demo

## Quick Start Guide

This guide demonstrates the NPC Relationship Tracking System with real examples.

---

## Demo Scenario 1: First Meeting

### Initial Contact

```bash
# Player meets Elarin for the first time
curl -X POST http://localhost:3000/api/npc/talk \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "player-123",
    "message": "Hello"
  }'
```

**Response:**
```json
{
  "npcName": "Elarin",
  "response": {
    "response": "The NPC greets you courteously. I am Elarin, the village historian. How may I help you?",
    "relationshipStatus": {
      "npcId": "elarin-uuid",
      "playerId": "player-123",
      "trust": 50,
      "respect": 50,
      "fear": 0,
      "affinity": 51
    }
  }
}
```

**What Happened:**
- Neutral relationship created automatically (trust/respect/affinity: 50, fear: 0)
- Greeting gave small affinity boost (+1)
- Relationship context: "The NPC greets you courteously."

---

## Demo Scenario 2: Building Trust

### Help the Village

```bash
curl -X POST http://localhost:3000/api/relationships/update \
  -H "Content-Type: application/json" \
  -d '{
    "npcId": "elarin-uuid",
    "playerId": "player-123",
    "action": "help_village"
  }'
```

**Response:**
```json
{
  "relationship": {
    "trust": 60,
    "respect": 58,
    "fear": 0,
    "affinity": 63
  },
  "message": "Relationship updated for action: help_village"
}
```

### Complete a Quest

```bash
curl -X POST http://localhost:3000/api/relationships/update \
  -H "Content-Type: application/json" \
  -d '{
    "npcId": "elarin-uuid",
    "playerId": "player-123",
    "action": "complete_quest"
  }'
```

**Response:**
```json
{
  "relationship": {
    "trust": 68,
    "respect": 68,
    "fear": 0,
    "affinity": 71
  }
}
```

### Protect the NPC

```bash
curl -X POST http://localhost:3000/api/relationships/update \
  -H "Content-Type: application/json" \
  -d '{
    "npcId": "elarin-uuid",
    "playerId": "player-123",
    "action": "protect_npc"
  }'
```

**Response:**
```json
{
  "relationship": {
    "trust": 83,
    "respect": 78,
    "fear": 0,
    "affinity": 86
  }
}
```

### Talk Again

```bash
curl -X POST http://localhost:3000/api/npc/talk \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "player-123",
    "message": "Hello"
  }'
```

**Response:**
```json
{
  "response": "The NPC greets you warmly as a trusted friend. I am Elarin, the village historian. How may I help you?"
}
```

**What Changed:**
- Greeting context changed from "courteously" to "warmly as a trusted friend"
- High trust (83) and affinity (86) unlock friendly dialogue

---

## Demo Scenario 3: Becoming a Feared Warrior

### Start Fresh

```bash
# New player
export PLAYER_2="player-456"
```

### Defeat Many Wolves

```bash
# First wolf kill
curl -X POST http://localhost:3000/api/relationships/update \
  -H "Content-Type: application/json" \
  -d '{
    "npcId": "elarin-uuid",
    "playerId": "player-456",
    "action": "wolf_kill"
  }'

# Response: trust: 50, respect: 62, fear: 3, affinity: 50

# Second wolf kill
curl -X POST http://localhost:3000/api/relationships/update \
  -H "Content-Type: application/json" \
  -d '{
    "npcId": "elarin-uuid",
    "playerId": "player-456",
    "action": "wolf_kill"
  }'

# Response: trust: 50, respect: 74, fear: 6, affinity: 50

# Third wolf kill
curl -X POST http://localhost:3000/api/relationships/update \
  -H "Content-Type: application/json" \
  -d '{
    "npcId": "elarin-uuid",
    "playerId": "player-456",
    "action": "wolf_kill"
  }'

# Response: trust: 50, respect: 86, fear: 9, affinity: 50
```

### Defeat a Boss

```bash
curl -X POST http://localhost:3000/api/relationships/update \
  -H "Content-Type: application/json" \
  -d '{
    "npcId": "elarin-uuid",
    "playerId": "player-456",
    "action": "defeat_boss"
  }'

# Response: trust: 50, respect: 100 (clamped), fear: 17, affinity: 55
```

### Threaten the NPC

```bash
curl -X POST http://localhost:3000/api/relationships/update \
  -H "Content-Type: application/json" \
  -d '{
    "npcId": "elarin-uuid",
    "playerId": "player-456",
    "action": "threaten_npc"
  }'

# Response: trust: 30, respect: 100, fear: 37, affinity: 40
```

### Check Relationship Description

```bash
curl "http://localhost:3000/api/relationships/query?npcId=elarin-uuid&playerId=player-456&includeDescription=true"
```

**Response:**
```json
{
  "relationship": {
    "trust": 30,
    "respect": 100,
    "fear": 37,
    "affinity": 40
  },
  "description": {
    "trust": "low",
    "respect": "very high",
    "fear": "low",
    "affinity": "neutral",
    "overall": "The NPC is wary of you."
  }
}
```

### Talk to NPC

```bash
curl -X POST http://localhost:3000/api/npc/talk \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "player-456",
    "message": "Hello"
  }'
```

**Response:**
```json
{
  "response": "The NPC seems nervous and keeps their distance from you. I am Elarin, the village historian. How may I help you?"
}
```

**What Happened:**
- High fear (37) overrides other factors
- Despite maximum respect (100), NPC is nervous
- Low trust (30) contributes to wariness

---

## Demo Scenario 4: Loss of Trust

### Start with Good Relationship

```bash
export PLAYER_3="player-789"

# Build trust
curl -X POST http://localhost:3000/api/relationships/update \
  -H "Content-Type: application/json" \
  -d '{
    "npcId": "elarin-uuid",
    "playerId": "player-789",
    "action": "help_village"
  }'

curl -X POST http://localhost:3000/api/relationships/update \
  -H "Content-Type: application/json" \
  -d '{
    "npcId": "elarin-uuid",
    "playerId": "player-789",
    "action": "complete_quest"
  }'

# Current: trust: 68, respect: 68, affinity: 71
```

### Lie to NPC

```bash
curl -X POST http://localhost:3000/api/relationships/update \
  -H "Content-Type: application/json" \
  -d '{
    "npcId": "elarin-uuid",
    "playerId": "player-789",
    "action": "lie_to_npc"
  }'

# Response: trust: 53, respect: 68, affinity: 61
```

### Break a Promise

```bash
curl -X POST http://localhost:3000/api/relationships/update \
  -H "Content-Type: application/json" \
  -d '{
    "npcId": "elarin-uuid",
    "playerId": "player-789",
    "action": "break_promise"
  }'

# Response: trust: 33, respect: 53, affinity: 46
```

### Steal from NPC

```bash
curl -X POST http://localhost:3000/api/relationships/update \
  -H "Content-Type: application/json" \
  -d '{
    "npcId": "elarin-uuid",
    "playerId": "player-789",
    "action": "steal_from_npc"
  }'

# Response: trust: 8, respect: 43, fear: 5, affinity: 26
```

### Check Current Status

```bash
curl "http://localhost:3000/api/relationships/query?npcId=elarin-uuid&playerId=player-789&includeDescription=true"
```

**Response:**
```json
{
  "description": {
    "trust": "very low",
    "respect": "neutral",
    "fear": "very low",
    "affinity": "low",
    "overall": "The NPC distrusts or fears you."
  }
}
```

### Attempt Conversation

```bash
curl -X POST http://localhost:3000/api/npc/talk \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "player-789",
    "message": "Hello"
  }'
```

**Response:**
```json
{
  "response": "The NPC regards you with suspicion. I am Elarin, the village historian. How may I help you?"
}
```

---

## Demo Scenario 5: Query All Relationships

### Get All Relationships for Elarin

```bash
curl "http://localhost:3000/api/relationships/query?npcId=elarin-uuid"
```

**Response:**
```json
{
  "relationships": [
    {
      "playerId": "player-123",
      "trust": 83,
      "respect": 78,
      "fear": 0,
      "affinity": 86
    },
    {
      "playerId": "player-456",
      "trust": 30,
      "respect": 100,
      "fear": 37,
      "affinity": 40
    },
    {
      "playerId": "player-789",
      "trust": 8,
      "respect": 43,
      "fear": 5,
      "affinity": 26
    }
  ],
  "count": 3
}
```

### Get All Relationships for a Player

```bash
curl "http://localhost:3000/api/relationships/query?playerId=player-123"
```

**Response:**
```json
{
  "relationships": [
    {
      "npcId": "elarin-uuid",
      "trust": 83,
      "respect": 78,
      "fear": 0,
      "affinity": 86
    }
  ],
  "count": 1
}
```

---

## Quick Action Reference

### Helpful Actions
```bash
# Help village: +10 trust, +8 respect, +12 affinity
curl -X POST .../update -d '{"action": "help_village", ...}'

# Complete quest: +8 trust, +10 respect, +8 affinity
curl -X POST .../update -d '{"action": "complete_quest", ...}'

# Protect NPC: +15 trust, +10 respect, +15 affinity, -5 fear
curl -X POST .../update -d '{"action": "protect_npc", ...}'
```

### Combat Actions
```bash
# Wolf kill: +12 respect, +3 fear
curl -X POST .../update -d '{"action": "wolf_kill", ...}'

# Defeat boss: +20 respect, +8 fear, +5 affinity
curl -X POST .../update -d '{"action": "defeat_boss", ...}'
```

### Negative Actions
```bash
# Lie: -15 trust, -10 affinity
curl -X POST .../update -d '{"action": "lie_to_npc", ...}'

# Threaten: -20 trust, +20 fear, -15 affinity
curl -X POST .../update -d '{"action": "threaten_npc", ...}'

# Steal: -25 trust, -10 respect, +5 fear, -20 affinity
curl -X POST .../update -d '{"action": "steal_from_npc", ...}'

# Break promise: -20 trust, -15 respect, -15 affinity
curl -X POST .../update -d '{"action": "break_promise", ...}'
```

---

## Expected Behavior

### Relationship Context Messages

| Scores | Context Message |
|--------|----------------|
| Fear ≥ 80 | "The NPC seems nervous and keeps their distance from you." |
| Trust ≥ 80 & Affinity ≥ 80 | "The NPC greets you warmly as a trusted friend." |
| Respect ≥ 95 | "The NPC looks at you with admiration and respect." |
| Trust ≥ 60 & Affinity ≥ 60 | "The NPC acknowledges you with a friendly nod." |
| Trust ≤ 40 | "The NPC regards you with suspicion." |
| Default | "The NPC greets you courteously." |

### Score Categories

| Range | Category |
|-------|----------|
| 80-100 | Very High |
| 60-80 | High |
| 40-60 | Neutral |
| 20-40 | Low |
| 0-20 | Very Low |

---

## Testing Checklist

- [ ] First meeting creates neutral relationship
- [ ] Helpful actions increase trust and affinity
- [ ] Combat actions increase respect and fear
- [ ] Negative actions decrease trust and affinity
- [ ] Scores clamp at 0 and 100
- [ ] High fear changes dialogue context
- [ ] High trust/affinity creates friendly greeting
- [ ] Low trust creates suspicious greeting
- [ ] Query endpoints return correct data
- [ ] Relationship descriptions are accurate

---

## Troubleshooting

### Relationship Not Created
- Check that player and NPC IDs are valid
- Ensure `.data/` directory exists and is writable
- Check server logs for errors

### Scores Not Updating
- Verify action name is spelled correctly
- Check that action is in the valid actions list
- Ensure request body is valid JSON

### Context Not Changing
- Scores need to cross thresholds (40, 60, 80)
- Fear overrides other positive factors
- Multiple conversations may be needed to see change

---

## Summary

The NPC Relationship Tracking System provides:
- ✅ Automatic relationship creation on first interaction
- ✅ Multi-dimensional scoring (trust, respect, fear, affinity)
- ✅ Dynamic dialogue based on relationship status
- ✅ Persistent storage across sessions
- ✅ RESTful API for queries and updates
- ✅ Human-readable relationship descriptions

Try the demos above to see the system in action!
