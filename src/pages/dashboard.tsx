import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiBook, FiSearch, FiTrash2, FiArrowLeft, FiRefreshCw } from 'react-icons/fi';
import { motion } from 'framer-motion';

interface Memory {
  id: string;
  type: string;
  content: string;
  importance: number;
  confidence: number;
  created_at: string;
  updated_at: string;
  tags: string[];
}

interface DashboardPageProps {
  userId: string;
}

export default function DashboardPage({ userId }: DashboardPageProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filteredMemories, setFilteredMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    byType: {} as Record<string, number>,
    avgImportance: 0,
  });

  const memoryTypes = [
    { id: 'user_profile', label: 'User Profile', color: 'bg-blue-100 text-blue-800' },
    { id: 'goal', label: 'Goals', color: 'bg-green-100 text-green-800' },
    { id: 'preference', label: 'Preferences', color: 'bg-purple-100 text-purple-800' },
    { id: 'progress', label: 'Progress', color: 'bg-accent-100 text-accent-800' },
    { id: 'task', label: 'Tasks', color: 'bg-orange-100 text-orange-800' },
    { id: 'episodic', label: 'Events', color: 'bg-pink-100 text-pink-800' },
    { id: 'semantic', label: 'Knowledge', color: 'bg-indigo-100 text-indigo-800' },
  ];

  // Fetch memories
  useEffect(() => {
    fetchMemories();
  }, [userId]);

  // Filter memories
  useEffect(() => {
    let filtered = memories;

    if (selectedType) {
      filtered = filtered.filter((m) => m.type === selectedType);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (m) =>
          m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredMemories(filtered);
  }, [memories, selectedType, searchQuery]);

  const fetchMemories = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ userId });
      const response = await fetch(`/api/memories?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to fetch memories');

      const data = await response.json();
      setMemories(data.memories || []);

      // Calculate stats
      const total = data.memories?.length || 0;
      const byType: Record<string, number> = {};
      let totalImportance = 0;

      data.memories?.forEach((m: Memory) => {
        byType[m.type] = (byType[m.type] || 0) + 1;
        totalImportance += m.importance;
      });

      setStats({
        total,
        byType,
        avgImportance: total > 0 ? totalImportance / total : 0,
      });
    } catch (error) {
      console.error('Failed to fetch memories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (memoryId: string) => {
    if (!confirm('Are you sure you want to delete this memory?')) return;

    try {
      const response = await fetch('/api/memories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, id: memoryId }),
      });

      if (response.ok) {
        setMemories(memories.filter((m) => m.id !== memoryId));
      }
    } catch (error) {
      console.error('Failed to delete memory:', error);
    }
  };

  const getMemoryTypeInfo = (typeId: string) => {
    return memoryTypes.find((t) => t.id === typeId);
  };

  const getImportanceColor = (importance: number) => {
    if (importance >= 5) return 'bg-red-100 text-red-800';
    if (importance >= 4) return 'bg-orange-100 text-orange-800';
    if (importance >= 3) return 'bg-blue-100 text-blue-800';
    return 'bg-slate-100 text-slate-800';
  };

  const getImportanceLabel = (importance: number) => {
    return ['Trivial', 'Low', 'Medium', 'High', 'Critical'][importance - 1] || 'Unknown';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-slate-100">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <FiArrowLeft />
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-accent-500 rounded-lg flex items-center justify-center">
              <FiBook className="text-white" size={20} />
            </div>
            MemoryFlow
          </Link>
          <button
            onClick={fetchMemories}
            disabled={loading}
            className="p-2 hover:bg-slate-100 rounded-lg transition disabled:opacity-50"
          >
            <FiRefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-accent-600 bg-clip-text text-transparent">
            Memory Dashboard
          </h1>
          <p className="text-slate-600">
            Visualize and manage your persistent memories across all conversations
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-4 gap-4 mb-12"
        >
          <div className="bg-white rounded-xl p-6 border border-slate-200 hover:border-blue-300 transition">
            <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
            <p className="text-slate-600 mt-2">Total Memories</p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-slate-200 hover:border-blue-300 transition">
            <div className="text-3xl font-bold text-accent-600">
              {Object.keys(stats.byType).length}
            </div>
            <p className="text-slate-600 mt-2">Memory Types</p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-slate-200 hover:border-blue-300 transition">
            <div className="text-3xl font-bold text-purple-600">
              {stats.avgImportance.toFixed(1)}
            </div>
            <p className="text-slate-600 mt-2">Avg. Importance</p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-slate-200 hover:border-blue-300 transition">
            <Link href="/chat">
              <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold">
                Back to Chat
              </button>
            </Link>
          </div>
        </motion.div>

        {/* Search and Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8 space-y-4"
        >
          {/* Search */}
          <div className="relative">
            <FiSearch className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories by content or tags..."
              className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Type Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedType(null)}
              className={`px-4 py-2 rounded-full transition ${
                selectedType === null
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border border-slate-300 hover:border-blue-300'
              }`}
            >
              All Types ({stats.total})
            </button>
            {memoryTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`px-4 py-2 rounded-full transition ${
                  selectedType === type.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border border-slate-300 hover:border-blue-300'
                }`}
              >
                {type.label} ({stats.byType[type.id] || 0})
              </button>
            ))}
          </div>
        </motion.div>

        {/* Memories Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin">
                <FiRefreshCw size={32} className="text-blue-500" />
              </div>
              <p className="text-slate-600 mt-4">Loading memories...</p>
            </div>
          ) : filteredMemories.length === 0 ? (
            <div className="bg-white rounded-xl p-12 border border-slate-200 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiBook className="text-slate-400" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                No memories found
              </h3>
              <p className="text-slate-600 mb-6">
                {memories.length === 0
                  ? "Start a conversation to build your memory."
                  : 'Try adjusting your search filters.'}
              </p>
              <Link href="/chat">
                <button className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
                  Start Chatting
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMemories.map((memory, index) => {
                const typeInfo = getMemoryTypeInfo(memory.type);
                return (
                  <motion.div
                    key={memory.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-xl p-6 border border-slate-200 hover:border-blue-300 hover:shadow-lg transition"
                  >
                    {/* Type Badge */}
                    <div className="flex justify-between items-start mb-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${typeInfo?.color}`}>
                        {typeInfo?.label}
                      </span>
                      <button
                        onClick={() => handleDelete(memory.id)}
                        className="p-1 hover:bg-red-50 rounded-lg transition text-red-600"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>

                    {/* Content */}
                    <p className="text-slate-700 mb-4 line-clamp-3">{memory.content}</p>

                    {/* Tags */}
                    {memory.tags && memory.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {memory.tags.map((tag, i) => (
                          <span key={i} className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="space-y-2 pt-4 border-t border-slate-200">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">Importance</span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getImportanceColor(memory.importance)}`}>
                          {getImportanceLabel(memory.importance)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">Confidence</span>
                        <span className="text-slate-700 font-semibold">
                          {(memory.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>
                          Created {new Date(memory.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
