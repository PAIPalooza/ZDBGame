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

  useEffect(() => {
    fetchPlayer();
    fetchMemories();
    fetchEvents();
    fetchWorldState();
  }, []);

  const fetchPlayer = async () => {
    try {
      const res = await fetch('/api/player/current');
      const data: any = await res.json();
      if (data.success && data.player) {
        setPlayer(data.player);
      }
    } catch (error) {
      console.error('Error fetching player:', error);
    }
  };

  const createPlayer = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/player/create', { method: 'POST' });
      const data: any = await res.json();
      if (data.success) {
        setPlayer(data.player);
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
        body: JSON.stringify({ message: npcMessage }),
      });
      const data: any = await res.json();
      if (data.success) {
        setNpcResponse(data.response);
        setNpcMessage('');
        fetchMemories();
        fetchEvents();
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
        body: JSON.stringify({ type, description }),
      });
      const data: any = await res.json();
      if (data.success) {
        fetchEvents();
        fetchWorldState();
        fetchMemories();

        if (data.worldEvent && typeof window !== 'undefined') {
          window.alert(`World Event Triggered: ${data.worldEvent.name}`);
        }
      }
    } catch (error) {
      console.error('Error creating event:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemories = async () => {
    try {
      const res = await fetch('/api/memories');
      const data: any = await res.json();
      if (data.success) {
        setMemories(data.memories);
      }
    } catch (error) {
      console.error('Error fetching memories:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      const data: any = await res.json();
      if (data.success) {
        setEvents(data.events);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchWorldState = async () => {
    try {
      const res = await fetch('/api/world');
      const data: any = await res.json();
      if (data.success) {
        setWorldEvents(data.worldEvents);
        setWolfKills(data.wolfKills);
      }
    } catch (error) {
      console.error('Error fetching world state:', error);
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
          <p className="text-gray-300 max-w-3xl mx-auto">
            This demo shows persistent player state, NPC memory, lore retrieval,
            gameplay telemetry, and emergent world events powered by ZeroDB.
          </p>
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

      </div>
    </main>
  );
}
