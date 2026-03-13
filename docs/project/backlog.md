# AI Game Master

# Agile Product Backlog

Product: **AI Game Master – Moonvale Demo**
Platform: **ZeroDB + AIKit**

Goal: Build a **persistent AI-driven narrative game engine**.

---

# Epic 1

# World Foundation & Core Schema

## Objective

Create the persistent game world data layer using ZeroDB.

This includes:

* player identity
* NPC entities
* lore knowledge
* world regions
* factions
* gameplay telemetry

---

## Feature 1.1

### Database Schema Implementation

### User Story

**As a developer**
I want to deploy the ZeroDB schema
so that the AI Game Master can store persistent world data.

### Acceptance Criteria

* All core tables exist
* Foreign keys validated
* Vector extension enabled
* Seed data loads successfully

### Tasks

* Create migration file
* Install vector extension
* Apply schema
* Validate table relationships

---

## Feature 1.2

### World Seed Data

### User Story

**As a game master system**
I need the world seeded with regions, NPCs, and lore
so that the narrative system has context.

### Acceptance Criteria

Seed data includes:

* Moonvale region
* Northern Forest region
* Ember Tower Ruins
* Forest Guild faction
* NPC: Elarin
* 3 lore entries

### Tasks

* Create seed script
* Insert regions
* Insert faction
* Insert NPC
* Insert lore

---

## Feature 1.3

### Player Creation

### User Story

**As a player**
I want to create a character
so that I can interact with the game world.

### Acceptance Criteria

* Player record created
* Player profile created
* Default inventory created

### Tasks

* Create API endpoint `/player/create`
* Insert into `players`
* Insert into `player_profiles`

---

# Epic 2

# Gameplay Telemetry System

## Objective

Capture player actions and world interactions.

These events power:

* AI Game Master decisions
* quest generation
* NPC memory
* world simulation

---

## Feature 2.1

### Gameplay Event Logging

### User Story

**As the game engine**
I want to store player actions
so that the system can react to gameplay behavior.

### Acceptance Criteria

Events stored in `game_events`.

Supported types:

* explore
* combat
* conversation
* quest
* discovery

### Tasks

* Create `/api/event/create`
* Write to `game_events`
* Create event index

---

## Feature 2.2

### Game Session Tracking

### User Story

**As the game system**
I want to group events into sessions
so that gameplay can be replayed and analyzed.

### Acceptance Criteria

* Session created on login
* Events reference session id

### Tasks

* Create `game_sessions`
* Implement session lifecycle

---

# Epic 3

# NPC Memory Engine

## Objective

NPCs should remember player behavior and reference it later.

This creates **persistent character relationships**.

---

## Feature 3.1

### NPC Memory Storage

### User Story

**As an NPC**
I want to remember player actions
so that I can reference them in dialogue.

### Acceptance Criteria

Memories created when:

* player asks about lore
* player helps NPC
* player defeats enemies
* player completes quests

### Tasks

* Insert into `npc_memories`
* Avoid duplicate memories
* Add importance scoring

---

## Feature 3.2

### NPC Relationship Tracking

### User Story

**As an NPC system**
I want to track affinity with players
so that NPC responses evolve over time.

### Acceptance Criteria

Track:

* trust
* respect
* fear
* affinity

### Tasks

* Implement `npc_relationships`
* Update relationship scores

---

# Epic 4

# AI Game Master Engine

## Objective

Create the **core narrative AI engine**.

The AI Game Master will:

* interpret player actions
* generate narrative responses
* reference memory
* generate quests
* update world state

---

## Feature 4.1

### Context Retrieval Engine

### User Story

**As the AI Game Master**
I want to retrieve relevant world context
so that narration is grounded in the world.

### Acceptance Criteria

Retrieve:

* player data
* NPC memory
* lore entries
* world events
* recent gameplay events

### Tasks

* Query ZeroDB
* Build context object
* Pass context to AIKit

---

## Feature 4.2

### Narrative Generation

### User Story

**As a player**
I want the game master to narrate outcomes
so that my actions feel meaningful.

### Acceptance Criteria

Narration includes:

* location description
* action outcome
* world reaction
* possible quest hooks

### Tasks

* Create `/api/gm/action`
* Integrate AIKit
* Log response in `narrative_logs`

---

## Feature 4.3

### Narrative History Storage

### User Story

**As the game system**
I want to store narrative history
so that past story events can influence future narration.

### Acceptance Criteria

Each action stored in:

`narrative_logs`

### Tasks

* Insert player input
* Insert GM response
* Store retrieved context metadata

---

# Epic 5

# Dynamic Quest Generation

## Objective

Generate quests dynamically based on gameplay.

---

## Feature 5.1

### AI Generated Quests

### User Story

**As the AI Game Master**
I want to generate quests based on player actions
so that the story evolves naturally.

### Acceptance Criteria

Quest generated when:

* major events occur
* player explores new region
* faction reputation increases

### Tasks

* Create `/api/gm/quest`
* Insert into `quests`

---

## Feature 5.2

### Quest Objectives

### User Story

**As a player**
I want quests with clear objectives
so that I know how to progress.

### Acceptance Criteria

Objectives stored in:

`quest_objectives`

### Tasks

* Insert quest objectives
* Track progress

---

## Feature 5.3

### Quest Progress Tracking

### User Story

**As the game system**
I want to track objective completion
so that quests update automatically.

### Acceptance Criteria

Quest progress updated when events occur.

Example:

* wolf_kill increments objective

### Tasks

* Update `quest_progress`
* Check completion status

---

# Epic 6

# Emergent World Simulation

## Objective

Allow player actions to influence the world.

---

## Feature 6.1

### World State Engine

### User Story

**As the world simulation**
I want to store global and regional variables
so that the game world evolves.

### Acceptance Criteria

State stored in:

`world_state`

Example:

* wolf_population
* village_safety
* forest_danger_level

---

## Feature 6.2

### World Event Triggers

### User Story

**As the world system**
I want events triggered by gameplay thresholds
so that the world reacts to player behavior.

### Acceptance Criteria

Example rule:

```
IF wolf_kills >= 3
THEN world_event = Wolf Pack Retreat
```

### Tasks

* Query event counts
* Insert `world_events`
* Update `world_state`

---

# Epic 7

# Lore Knowledge System

## Objective

Provide semantic lore retrieval for storytelling.

---

## Feature 7.1

### Lore Vector Search

### User Story

**As the AI Game Master**
I want to retrieve lore entries semantically
so that narration references world history.

### Acceptance Criteria

Vector search returns:

* Ember Tower lore
* Moonvale history
* wolf lore

### Tasks

* Store embeddings
* Query vector index

---

# Epic 8

# Player Feedback & RLHF

## Objective

Collect player feedback to improve narrative AI.

---

## Feature 8.1

### Feedback Submission

### User Story

**As a player**
I want to rate AI responses
so that the system improves over time.

### Acceptance Criteria

Ratings stored in:

`player_feedback`

### Tasks

* Create feedback API
* Insert rating

---

# Epic 9

# AI GM Console UI

## Objective

Provide the UI interface for interacting with the AI Game Master.

---

## Feature 9.1

### Action Input

### User Story

**As a player**
I want to type actions
so that the AI GM can narrate results.

Example:

```
Investigate Ember Tower
Follow wolf tracks
```

---

## Feature 9.2

### Narrative Output

### User Story

**As a player**
I want to see narrative responses
so that gameplay feels immersive.

---

## Feature 9.3

### Quest Display

### User Story

**As a player**
I want to see active quests
so that I know my objectives.

---

## Feature 9.4

### World Events Display

### User Story

**As a player**
I want to see world events
so that I understand how the world evolves.

---

# Epic 10

# Demo & Workshop Mode

## Objective

Ensure the system works reliably for the **Moonvale workshop demo**.

---

## Feature 10.1

### Demo Scenario

### User Story

**As an instructor**
I want a predefined scenario
so that I can demonstrate AI-native gameplay.

Scenario:

1 Ask about Ember Tower
2 Explore forest
3 Fight wolves
4 Trigger world event
5 NPC remembers actions

---

## Feature 10.2

### Demo Reset

### User Story

**As an instructor**
I want to reset the world
so that multiple demos can run cleanly.

---
