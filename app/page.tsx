'use client';

import { useState, useEffect } from 'react';
import type { Player, NPCMemory, GameEvent, WorldEvent } from '@/lib/types';

export default function Home() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [npcMessage, setNpcMessage] = useState('');
  const [npcResponse, setNpcResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [memories, setMemories] = useState<NPCMemory[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [worldEvents, setWorldEvents] = useState<WorldEvent[]>([]);
  const [wolfKills, setWolfKills] = useState(0);
  const [lore, setLore] = useState<any[]>([]);
  const [loreSearchQuery, setLoreSearchQuery] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [showAIKitDemo, setShowAIKitDemo] = useState(false);
  const [aiKitPrompt, setAIKitPrompt] = useState('');

  useEffect(() => {
    fetchPlayer();
    fetchMemories();
    fetchEvents();
    fetchWorldState();
    fetchLore();
    fetchStats();
  }, []);

  const fetchPlayer = async () => {
    try {
      const res = await fetch('/api/player/current');
      if (res.ok) {
        const data = await res.json();
        setPlayer(data);
      }
    } catch (error) {
      console.error('Error fetching player:', error);
    }
  };

  const createPlayer = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/player/create', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setPlayer(data);
        await fetchWorldState();
      }
    } catch (error) {
      console.error('Error creating player:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendNPCMessage = async () => {
    if (!npcMessage.trim() || !player) return;

    setLoading(true);
    try {
      const res = await fetch('/api/npc/talk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: player.id,
          message: npcMessage
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNpcResponse(data.response?.response || data.response || 'No response');
        setNpcMessage('');
        await fetchMemories();
        await fetchEvents();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (type: string, description: string) => {
    if (!player) {
      if (typeof window !== 'undefined') {
        window.alert('Please create a player first!');
      }
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/event/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: player.id,
          eventType: type,
          description,
          location: 'moonvale'
        }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchEvents();
        await fetchWorldState();
        await fetchMemories();

        if (data.worldEvent && typeof window !== 'undefined') {
          window.alert(`World Event Triggered: ${data.worldEvent.name || 'Wolf Pack Retreat'}!`);
        }
      }
    } catch (error) {
      console.error('Error creating event:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemories = async () => {
    if (!player) return;
    try {
      const res = await fetch(`/api/memories?playerId=${player.id}`);
      if (res.ok) {
        const data = await res.json();
        setMemories(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching memories:', error);
    }
  };

  const fetchEvents = async () => {
    if (!player) return;
    try {
      const res = await fetch(`/api/events?playerId=${player.id}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchWorldState = async () => {
    if (!player) return;
    try {
      const res = await fetch(`/api/world?playerId=${player.id}`);
      if (res.ok) {
        const data = await res.json();
        setWorldEvents(Array.isArray(data.worldEvents) ? data.worldEvents : []);
        setWolfKills(data.wolfKills || 0);
      }
    } catch (error) {
      console.error('Error fetching world state:', error);
    }
  };

  const fetchLore = async (query?: string) => {
    try {
      const url = query ? `/api/lore?query=${encodeURIComponent(query)}` : '/api/lore';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLore(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching lore:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const searchLoreHandler = () => {
    if (loreSearchQuery.trim()) {
      fetchLore(loreSearchQuery);
    } else {
      fetchLore();
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Section 1: Header */}
        <header className="text-center py-8 border-b border-purple-500/30">
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Moonvale Demo
          </h1>
          <h2 className="text-xl text-purple-300 mb-4">
            AI-Native Game World Prototype
          </h2>
          <p className="text-gray-300 max-w-3xl mx-auto mb-4">
            This demo shows persistent player state, NPC memory, lore retrieval,
            gameplay telemetry, and emergent world events powered by ZeroDB.
          </p>
          <a
            href="/api-reference"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-teal-500/50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View API Reference & AIKit Examples
          </a>
        </header>

        {/* Section 2: Player Panel */}
        <section className="bg-slate-800/50 backdrop-blur rounded-lg p-6 border border-purple-500/20 shadow-xl">
          <h3 className="text-2xl font-bold mb-4 text-purple-300">Player Panel</h3>

          {!player ? (
            <button
              onClick={createPlayer}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-purple-500/50"
            >
              {loading ? 'Creating...' : 'Create Demo Player'}
            </button>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-700/50 p-4 rounded-lg">
                <p className="text-gray-400 text-sm">Username</p>
                <p className="text-xl font-semibold">{player.username}</p>
              </div>
              <div className="bg-slate-700/50 p-4 rounded-lg">
                <p className="text-gray-400 text-sm">Class</p>
                <p className="text-xl font-semibold">{player.class}</p>
              </div>
              <div className="bg-slate-700/50 p-4 rounded-lg">
                <p className="text-gray-400 text-sm">Level</p>
                <p className="text-xl font-semibold">{player.level}</p>
              </div>
              <div className="bg-slate-700/50 p-4 rounded-lg">
                <p className="text-gray-400 text-sm">XP</p>
                <p className="text-xl font-semibold">{player.xp}</p>
              </div>
            </div>
          )}
        </section>

        {/* Section 3: NPC Chat Panel */}
        <section className="bg-slate-800/50 backdrop-blur rounded-lg p-6 border border-purple-500/20 shadow-xl">
          <h3 className="text-2xl font-bold mb-4 text-purple-300">Talk to Elarin</h3>

          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={npcMessage}
                onChange={(e) => setNpcMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendNPCMessage()}
                placeholder="Ask Elarin something..."
                disabled={!player || loading}
                className="flex-1 bg-slate-700 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />
              <button
                onClick={sendNPCMessage}
                disabled={!player || !npcMessage.trim() || loading}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-200"
              >
                Send
              </button>
            </div>

            {npcResponse && (
              <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4">
                <p className="text-sm text-purple-300 font-semibold mb-2">Elarin says:</p>
                <p className="text-gray-100">{npcResponse}</p>
              </div>
            )}
          </div>
        </section>

        {/* Section 4: Actions Panel */}
        <section className="bg-slate-800/50 backdrop-blur rounded-lg p-6 border border-purple-500/20 shadow-xl">
          <h3 className="text-2xl font-bold mb-4 text-purple-300">Actions</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => createEvent('explore', 'Player explored the northern forest')}
              disabled={!player || loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 shadow-lg"
            >
              Explore Forest
            </button>
            <button
              onClick={() => createEvent('wolf_kill', 'Player defeated a wolf near Moonvale')}
              disabled={!player || loading}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 shadow-lg"
            >
              Fight Wolf {wolfKills > 0 && `(${wolfKills}/3)`}
            </button>
            <button
              onClick={() => createEvent('help_village', 'Player helped the villagers with their tasks')}
              disabled={!player || loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 shadow-lg"
            >
              Help Village
            </button>
          </div>
        </section>

        {/* Section 5: World Events Panel */}
        <section className="bg-slate-800/50 backdrop-blur rounded-lg p-6 border border-purple-500/20 shadow-xl">
          <h3 className="text-2xl font-bold mb-4 text-purple-300">World Events</h3>

          {worldEvents.length === 0 ? (
            <p className="text-gray-400 italic">No world events triggered yet...</p>
          ) : (
            <div className="space-y-3">
              {worldEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-500/30 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xl font-bold text-yellow-300">{event.name}</h4>
                      <p className="text-gray-300 mt-1">{event.description}</p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 6: NPC Memory Viewer */}
        <section className="bg-slate-800/50 backdrop-blur rounded-lg p-6 border border-purple-500/20 shadow-xl">
          <h3 className="text-2xl font-bold mb-4 text-purple-300">
            NPC Memory Viewer
            <span className="text-sm font-normal text-gray-400 ml-3">(The "wow" moment)</span>
          </h3>

          {memories.length === 0 ? (
            <p className="text-gray-400 italic">No memories recorded yet...</p>
          ) : (
            <div className="space-y-2">
              {memories.map((memory) => (
                <div
                  key={memory.id}
                  className="bg-pink-900/20 border border-pink-500/20 rounded-lg p-4 hover:bg-pink-900/30 transition-colors duration-200"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-gray-100">{memory.memory}</p>
                    <div className="flex items-center gap-3 ml-4">
                      <span className="text-xs text-pink-400">
                        Importance: {memory.importance}
                      </span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {new Date(memory.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 7: Event Log */}
        <section className="bg-slate-800/50 backdrop-blur rounded-lg p-6 border border-purple-500/20 shadow-xl">
          <h3 className="text-2xl font-bold mb-4 text-purple-300">Event Log</h3>

          {events.length === 0 ? (
            <p className="text-gray-400 italic">No events recorded yet...</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-3 hover:bg-slate-700/50 transition-colors duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        event.type === 'wolf_kill' ? 'bg-red-600/30 text-red-300' :
                        event.type === 'explore' ? 'bg-green-600/30 text-green-300' :
                        event.type === 'help_village' ? 'bg-blue-600/30 text-blue-300' :
                        'bg-purple-600/30 text-purple-300'
                      }`}>
                        {event.type.replace('_', ' ').toUpperCase()}
                      </span>
                      <p className="text-gray-300">{event.description}</p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 8: Database Statistics Dashboard */}
        <section className="bg-slate-800/50 backdrop-blur rounded-lg p-6 border border-purple-500/20 shadow-xl">
          <h3 className="text-2xl font-bold mb-4 text-purple-300">
            Database Statistics
            <span className="text-sm font-normal text-gray-400 ml-3">(ZeroDB API Demo)</span>
          </h3>

          {!stats ? (
            <p className="text-gray-400 italic">Loading statistics...</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-900/30 to-blue-700/20 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-300 text-sm mb-1">Total Players</p>
                <p className="text-3xl font-bold text-white">{stats.players || 0}</p>
              </div>
              <div className="bg-gradient-to-br from-green-900/30 to-green-700/20 border border-green-500/30 rounded-lg p-4">
                <p className="text-green-300 text-sm mb-1">Game Events</p>
                <p className="text-3xl font-bold text-white">{stats.gameEvents || 0}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-900/30 to-purple-700/20 border border-purple-500/30 rounded-lg p-4">
                <p className="text-purple-300 text-sm mb-1">NPC Memories</p>
                <p className="text-3xl font-bold text-white">{stats.npcMemories || 0}</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-700/20 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-yellow-300 text-sm mb-1">Lore Entries</p>
                <p className="text-3xl font-bold text-white">{stats.lore || 0}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-900/30 to-orange-700/20 border border-orange-500/30 rounded-lg p-4">
                <p className="text-orange-300 text-sm mb-1">World Events</p>
                <p className="text-3xl font-bold text-white">{stats.worldEvents || 0}</p>
              </div>
              <div className="bg-gradient-to-br from-red-900/30 to-red-700/20 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-300 text-sm mb-1">Wolf Kills</p>
                <p className="text-3xl font-bold text-white">{wolfKills}</p>
              </div>
              <div className="bg-gradient-to-br from-indigo-900/30 to-indigo-700/20 border border-indigo-500/30 rounded-lg p-4">
                <p className="text-indigo-300 text-sm mb-1">Total Files</p>
                <p className="text-3xl font-bold text-white">{stats.totalFiles || 0}</p>
              </div>
              <div className="bg-gradient-to-br from-teal-900/30 to-teal-700/20 border border-teal-500/30 rounded-lg p-4">
                <p className="text-teal-300 text-sm mb-1">Total Records</p>
                <p className="text-3xl font-bold text-white">
                  {(stats.players || 0) + (stats.gameEvents || 0) + (stats.npcMemories || 0) + (stats.lore || 0) + (stats.worldEvents || 0)}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Section 9: Lore Database Browser */}
        <section className="bg-slate-800/50 backdrop-blur rounded-lg p-6 border border-purple-500/20 shadow-xl">
          <h3 className="text-2xl font-bold mb-4 text-purple-300">
            Lore Database Browser
            <span className="text-sm font-normal text-gray-400 ml-3">(Semantic Search)</span>
          </h3>

          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={loreSearchQuery}
                onChange={(e) => setLoreSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchLoreHandler()}
                placeholder="Search lore by keywords (e.g., 'tower', 'wolves', 'moonvale')..."
                className="flex-1 bg-slate-700 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />
              <button
                onClick={searchLoreHandler}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-200"
              >
                Search
              </button>
              <button
                onClick={() => {
                  setLoreSearchQuery('');
                  fetchLore();
                }}
                className="bg-slate-600 hover:bg-slate-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-200"
              >
                Clear
              </button>
            </div>

            {lore.length === 0 ? (
              <p className="text-gray-400 italic">No lore entries found...</p>
            ) : (
              <div className="space-y-3">
                {lore.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 rounded-lg p-5 hover:from-indigo-900/30 hover:to-purple-900/30 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-xl font-bold text-indigo-300">{entry.title}</h4>
                      <span className="text-xs text-gray-400 bg-slate-700/50 px-2 py-1 rounded">
                        {entry.region}
                      </span>
                    </div>
                    <p className="text-gray-300 mb-3">{entry.content}</p>
                    <div className="flex flex-wrap gap-2">
                      {entry.tags && entry.tags.map((tag: string, idx: number) => (
                        <span
                          key={idx}
                          className="text-xs bg-purple-600/20 text-purple-300 px-2 py-1 rounded border border-purple-500/30"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Section 10: AIKit Interactive Demos */}
        <section className="bg-gradient-to-r from-teal-900/30 to-cyan-900/30 backdrop-blur rounded-lg p-6 border border-teal-500/30 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold text-teal-300">
              AIKit Live Demos
              <span className="text-sm font-normal text-gray-400 ml-3">(Interactive Examples)</span>
            </h3>
            <button
              onClick={() => setShowAIKitDemo(!showAIKitDemo)}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors duration-200"
            >
              {showAIKitDemo ? 'Hide Demos' : 'Show Demos'}
            </button>
          </div>

          {showAIKitDemo && (
            <div className="space-y-6 mt-6">

              {/* Demo 1: Player Stats Card */}
              <div className="bg-black/30 rounded-lg p-5 border border-teal-500/20">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-xl font-bold text-teal-200 mb-1">Demo 1: Enhanced Player Stats</h4>
                    <p className="text-gray-400 text-sm">Generated with AIKit prompt</p>
                  </div>
                  <button
                    onClick={() => setAIKitPrompt('demo1')}
                    className="text-xs bg-teal-600/20 hover:bg-teal-600/40 px-3 py-1 rounded border border-teal-500/30 transition-colors"
                  >
                    {aiKitPrompt === 'demo1' ? '✓ Prompt Shown' : 'Show Prompt'}
                  </button>
                </div>

                {aiKitPrompt === 'demo1' && (
                  <div className="bg-black/50 rounded p-3 mb-4">
                    <pre className="text-xs text-cyan-300 whitespace-pre-wrap">
{`AIKit Prompt: "Create a player stats card showing level progress,
XP bar with percentage, and character class icon. Use the existing
player state and style with teal gradients."`}
                    </pre>
                  </div>
                )}

                {player && (
                  <div className="bg-gradient-to-br from-teal-900/40 to-cyan-900/40 border border-teal-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-2xl font-bold">
                        {player.class[0]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-lg font-bold text-teal-200">{player.username}</span>
                          <span className="text-sm text-gray-400">Level {player.level}</span>
                        </div>
                        <div className="relative w-full h-3 bg-black/50 rounded-full overflow-hidden">
                          <div
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500"
                            style={{ width: `${(player.xp % 100)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-400">{player.xp} XP</span>
                          <span className="text-xs text-teal-300">{player.xp % 100}% to next level</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Demo 2: Event Timeline */}
              <div className="bg-black/30 rounded-lg p-5 border border-teal-500/20">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-xl font-bold text-teal-200 mb-1">Demo 2: Event Timeline Visualization</h4>
                    <p className="text-gray-400 text-sm">Real-time event tracking with visual timeline</p>
                  </div>
                  <button
                    onClick={() => setAIKitPrompt('demo2')}
                    className="text-xs bg-teal-600/20 hover:bg-teal-600/40 px-3 py-1 rounded border border-teal-500/30 transition-colors"
                  >
                    {aiKitPrompt === 'demo2' ? '✓ Prompt Shown' : 'Show Prompt'}
                  </button>
                </div>

                {aiKitPrompt === 'demo2' && (
                  <div className="bg-black/50 rounded p-3 mb-4">
                    <pre className="text-xs text-cyan-300 whitespace-pre-wrap">
{`AIKit Prompt: "Create a vertical timeline showing the last 5 events
with connecting lines, timestamps, and color-coded icons based on
event type. Use the events state array."`}
                    </pre>
                  </div>
                )}

                <div className="space-y-3">
                  {events.slice(-5).reverse().map((event, idx) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          event.type === 'wolf_kill' ? 'bg-red-600/30 border-red-500' :
                          event.type === 'explore' ? 'bg-green-600/30 border-green-500' :
                          event.type === 'help_village' ? 'bg-blue-600/30 border-blue-500' :
                          'bg-purple-600/30 border-purple-500'
                        } border-2`}>
                          {event.type === 'wolf_kill' && '⚔️'}
                          {event.type === 'explore' && '🗺️'}
                          {event.type === 'help_village' && '🏘️'}
                          {event.type === 'npc_conversation' && '💬'}
                        </div>
                        {idx < events.slice(-5).length - 1 && (
                          <div className="w-0.5 h-full bg-teal-500/30 my-1" />
                        )}
                      </div>
                      <div className="flex-1 bg-slate-800/50 rounded-lg p-3 border border-teal-500/20">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-teal-200">{event.type.replace('_', ' ').toUpperCase()}</span>
                          <span className="text-xs text-gray-400">{new Date(event.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-sm text-gray-300">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Demo 3: Lore Tag Cloud */}
              <div className="bg-black/30 rounded-lg p-5 border border-teal-500/20">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-xl font-bold text-teal-200 mb-1">Demo 3: Interactive Tag Cloud</h4>
                    <p className="text-gray-400 text-sm">Click tags to filter lore entries</p>
                  </div>
                  <button
                    onClick={() => setAIKitPrompt('demo3')}
                    className="text-xs bg-teal-600/20 hover:bg-teal-600/40 px-3 py-1 rounded border border-teal-500/30 transition-colors"
                  >
                    {aiKitPrompt === 'demo3' ? '✓ Prompt Shown' : 'Show Prompt'}
                  </button>
                </div>

                {aiKitPrompt === 'demo3' && (
                  <div className="bg-black/50 rounded p-3 mb-4">
                    <pre className="text-xs text-cyan-300 whitespace-pre-wrap">
{`AIKit Prompt: "Extract all unique tags from the lore array and
display them as an interactive tag cloud. Make tags clickable to
filter lore. Show tag frequency with varying sizes."`}
                    </pre>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(lore.flatMap(entry => entry.tags || []))).map((tag: string) => {
                    const count = lore.filter(entry => entry.tags?.includes(tag)).length;
                    return (
                      <button
                        key={tag}
                        onClick={() => {
                          setLoreSearchQuery(tag);
                          fetchLore(tag);
                        }}
                        className="bg-gradient-to-r from-teal-600/20 to-cyan-600/20 hover:from-teal-600/40 hover:to-cyan-600/40 border border-teal-500/30 rounded-full px-4 py-2 text-teal-200 font-semibold transition-all duration-200 hover:scale-110"
                        style={{ fontSize: `${Math.min(12 + count * 2, 18)}px` }}
                      >
                        {tag} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Demo 4: Achievement Badges */}
              <div className="bg-black/30 rounded-lg p-5 border border-teal-500/20">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-xl font-bold text-teal-200 mb-1">Demo 4: Achievement System</h4>
                    <p className="text-gray-400 text-sm">Unlock badges based on your actions</p>
                  </div>
                  <button
                    onClick={() => setAIKitPrompt('demo4')}
                    className="text-xs bg-teal-600/20 hover:bg-teal-600/40 px-3 py-1 rounded border border-teal-500/30 transition-colors"
                  >
                    {aiKitPrompt === 'demo4' ? '✓ Prompt Shown' : 'Show Prompt'}
                  </button>
                </div>

                {aiKitPrompt === 'demo4' && (
                  <div className="bg-black/50 rounded p-3 mb-4">
                    <pre className="text-xs text-cyan-300 whitespace-pre-wrap">
{`AIKit Prompt: "Create an achievement system that checks events
array for milestones: First Blood (1 wolf kill), Wolf Hunter
(3 wolves), Explorer (5 explore events), Village Hero (help_village).
Display as badge cards with unlock status."`}
                    </pre>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { name: 'First Blood', icon: '⚔️', condition: events.filter(e => e.type === 'wolf_kill').length >= 1, description: 'Defeat your first wolf' },
                    { name: 'Wolf Hunter', icon: '🏆', condition: wolfKills >= 3, description: 'Trigger Wolf Pack Retreat' },
                    { name: 'Explorer', icon: '🗺️', condition: events.filter(e => e.type === 'explore').length >= 3, description: 'Explore 3 locations' },
                    { name: 'Village Hero', icon: '🌟', condition: events.filter(e => e.type === 'help_village').length >= 1, description: 'Help the villagers' }
                  ].map((achievement) => (
                    <div
                      key={achievement.name}
                      className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                        achievement.condition
                          ? 'bg-gradient-to-br from-teal-900/40 to-cyan-900/40 border-teal-500 shadow-lg shadow-teal-500/20'
                          : 'bg-slate-800/30 border-slate-600 opacity-50 grayscale'
                      }`}
                    >
                      <div className="text-3xl mb-2 text-center">{achievement.icon}</div>
                      <div className="text-center">
                        <div className="font-bold text-sm text-teal-200">{achievement.name}</div>
                        <div className="text-xs text-gray-400 mt-1">{achievement.description}</div>
                        {achievement.condition && (
                          <div className="text-xs text-teal-300 mt-2 font-semibold">✓ UNLOCKED</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Learn More Link */}
              <div className="bg-gradient-to-r from-teal-600/20 to-cyan-600/20 border border-teal-500/30 rounded-lg p-4 text-center">
                <p className="text-teal-200 mb-3">
                  These demos were built using AIKit prompts in under 5 minutes each!
                </p>
                <a
                  href="/api-reference#aikit-examples"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  See More AIKit Examples
                </a>
              </div>
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
