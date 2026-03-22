import React, { useState, useEffect, useMemo } from 'react';
import { StockIdea, SourceType } from './types';
import { getStockHistory, getCurrentPrice, calculatePerformance, getCompanyProfile } from './services/stockService';
import IdeaCard from './components/IdeaCard';
import AddIdeaModal from './components/AddIdeaModal';
import IdeaDetailsModal from './components/IdeaDetailsModal';
import TagFilter from './components/TagFilter';
import { Plus, Search, Filter, Rocket, ArrowUpDown, Download, Upload, Moon, Sun } from 'lucide-react';

type SortOption = 'conviction' | 'entryDate' | 'return';

// Sample initial data
const INITIAL_IDEAS: StockIdea[] = [
    {
        id: '1',
        ticker: 'NVDA',
        companyName: 'NVIDIA Corporation',
        source: 'Hedge Fund Letter',
        sourceType: 'Hedge Fund',
        originalLink: 'https://example.com',
        entryDate: '2023-11-15',
        entryPrice: 48.00, // Pre-split adjusted rough estimate for demo
        currentPrice: 135.50, 
        thesis: 'AI infrastructure buildout is just beginning. Data center revenue will triple over the next 2 years.',
        summary: 'Bullish on long-term AI infrastructure dominance. Expecting data center revenue to triple.',
        conviction: 'High',
        tags: ['AI', 'Semi']
    },
    {
        id: '2',
        ticker: 'PYPL',
        companyName: 'PayPal Holdings',
        source: 'ValueInvestorsClub',
        sourceType: 'Blog',
        entryDate: '2024-02-01',
        entryPrice: 58.50,
        currentPrice: 63.00,
        thesis: 'Market is pricing this as a dying business, but FCF yield is over 8%. New CEO will cut costs.',
        summary: 'Contrarian value play. Market pessimism overstated. Strong FCF yield and turnaround potential.',
        conviction: 'Medium',
        tags: ['Value', 'Fintech']
    }
];

export default function App() {
  const [ideas, setIdeas] = useState<StockIdea[]>(() => {
    const saved = localStorage.getItem('alphaseek_ideas');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse ideas from local storage');
      }
    }
    return INITIAL_IDEAS;
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<StockIdea | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<SourceType | 'All'>('All');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('entryDate');
  
  // Cache for historical data to avoid re-generating on every render
  const [historyCache, setHistoryCache] = useState<Record<string, any[]>>({});
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Save to local storage whenever ideas change
  useEffect(() => {
    localStorage.setItem('alphaseek_ideas', JSON.stringify(ideas));
  }, [ideas]);

  // Initialize/Update prices on load
  useEffect(() => {
    const initData = async () => {
        // Fetch current prices and history for initial ideas
        const updatedIdeas = await Promise.all(ideas.map(async (idea) => {
             const currentPrice = await getCurrentPrice(idea.ticker);
             let description = idea.description;
             if (!description) {
                 // Try to fetch description if missing
                 const profile = await getCompanyProfile(idea.ticker);
                 description = profile.description;
             }
             return { ...idea, currentPrice, description };
        }));
        setIdeas(updatedIdeas);

        // Populate history cache asynchronously
        const newCache: Record<string, any[]> = {};
        await Promise.all(updatedIdeas.map(async (idea) => {
            if (!historyCache[idea.ticker]) {
                const history = await getStockHistory(idea.ticker);
                newCache[idea.ticker] = history;
            }
        }));
        setHistoryCache(prev => ({...prev, ...newCache}));
    };
    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const handleAddIdea = async (newIdeaPart: Omit<StockIdea, 'id' | 'currentPrice'>) => {
    const currentPrice = await getCurrentPrice(newIdeaPart.ticker);
    const newIdea: StockIdea = {
        ...newIdeaPart,
        id: Date.now().toString(),
        currentPrice,
        status: newIdeaPart.status || 'Active'
    };
    
    if (newIdea.status === 'Closed') {
        newIdea.exitPrice = currentPrice;
        newIdea.exitDate = new Date().toISOString().split('T')[0];
    }
    
    // Update cache for new ticker
    const history = await getStockHistory(newIdea.ticker);
    setHistoryCache(prev => ({
        ...prev,
        [newIdea.ticker]: history
    }));

    setIdeas(prev => [newIdea, ...prev]);
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(ideas, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "alphaseek_ideas.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedIdeas = JSON.parse(event.target?.result as string);
        if (Array.isArray(importedIdeas)) {
          setIdeas(importedIdeas);
        }
      } catch (error) {
        console.error("Error parsing imported JSON:", error);
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const handleUpdateIdea = (updatedIdea: StockIdea) => {
    setIdeas(prev => prev.map(idea => idea.id === updatedIdea.id ? updatedIdea : idea));
    if (selectedIdea?.id === updatedIdea.id) {
        setSelectedIdea(updatedIdea);
    }
  };

  const handleDeleteIdea = (id: string) => {
    setIdeas(prev => prev.filter(idea => idea.id !== id));
    setIsDetailsModalOpen(false);
    setSelectedIdea(null);
  };

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    ideas.forEach(idea => (idea.tags || []).forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [ideas]);

  const filteredIdeas = useMemo(() => {
    const filtered = ideas.filter(idea => {
      const matchesSearch = 
        (idea.ticker || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (idea.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (idea.summary || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (idea.thesis || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (idea.source || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterSource === 'All' || idea.sourceType === filterSource;
      
      const matchesTags = selectedTags.length === 0 || selectedTags.some(tag => (idea.tags || []).includes(tag));
      
      return matchesSearch && matchesFilter && matchesTags;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'conviction') {
        const priority: Record<string, number> = { 'High': 3, 'Medium': 2, 'Low': 1 };
        return (priority[b.conviction || 'Low'] || 0) - (priority[a.conviction || 'Low'] || 0);
      }
      if (sortBy === 'entryDate') {
        return new Date(b.entryDate || 0).getTime() - new Date(a.entryDate || 0).getTime();
      }
      if (sortBy === 'return') {
        const entryA = a.entryPrice || 1;
        const entryB = b.entryPrice || 1;
        const returnA = (((a.currentPrice || 0) - entryA) / entryA);
        const returnB = (((b.currentPrice || 0) - entryB) / entryB);
        return returnB - returnA;
      }
      return 0;
    });
  }, [ideas, searchTerm, filterSource, selectedTags, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 transition-colors duration-200">
        {/* Navigation / Header */}
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors duration-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                            <Rocket size={20} />
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">AlphaSeek</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 rounded-full transition-colors"
                            title="Toggle Dark Mode"
                        >
                            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        <input 
                            type="file" 
                            accept=".json" 
                            onChange={handleImport} 
                            className="hidden" 
                            id="import-upload" 
                        />
                        <label 
                            htmlFor="import-upload"
                            className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
                        >
                            <Upload size={16} />
                            <span className="hidden sm:inline">Import</span>
                        </label>
                        <button 
                            onClick={handleExport}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors shadow-sm"
                        >
                            <Download size={16} />
                            <span className="hidden sm:inline">Export</span>
                        </button>
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-blue-600 hover:bg-gray-800 dark:hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                        >
                            <Plus size={16} />
                            Add Idea
                        </button>
                    </div>
                </div>
            </div>
        </header>

        {/* Filters Bar */}
        <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors duration-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                {/* Dashboard Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">Total Ideas</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{ideas.length}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">Active Ideas</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{ideas.filter(i => i.status === 'Active' || !i.status).length}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">Win Rate (Active)</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {(() => {
                                const active = ideas.filter(i => i.status === 'Active' || !i.status);
                                if (active.length === 0) return '0%';
                                const winners = active.filter(i => (i.currentPrice || 0) > (i.entryPrice || 0)).length;
                                return Math.round((winners / active.length) * 100) + '%';
                            })()}
                        </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">Avg Return (Active)</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {(() => {
                                const active = ideas.filter(i => i.status === 'Active' || !i.status);
                                if (active.length === 0) return '0.00%';
                                const totalReturn = active.reduce((sum, i) => {
                                    const entry = i.entryPrice || 1; // Prevent division by zero
                                    return sum + (((i.currentPrice || 0) - entry) / entry);
                                }, 0);
                                const avg = (totalReturn / active.length) * 100;
                                return (avg > 0 ? '+' : '') + avg.toFixed(2) + '%';
                            })()}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-center">
                        <div className="relative w-full sm:w-80">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search size={18} className="text-gray-400 dark:text-gray-500" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search ticker, thesis, or source..."
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg leading-5 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <TagFilter 
                            availableTags={allTags} 
                            selectedTags={selectedTags} 
                            onChange={setSelectedTags} 
                        />
                        <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-500 transition-all w-full sm:w-auto">
                            <ArrowUpDown size={16} className="text-gray-400 dark:text-gray-500" />
                            <select 
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as SortOption)}
                                className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-transparent border-none focus:ring-0 cursor-pointer p-0 pr-6"
                            >
                                <option value="entryDate">Newest First</option>
                                <option value="conviction">Highest Conviction</option>
                                <option value="return">Best Return</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                        <Filter size={16} className="text-gray-400 dark:text-gray-500 mr-1 flex-shrink-0" />
                        {(['All', 'Hedge Fund', 'X', 'Reddit', 'Blog', 'News', 'Other'] as const).map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilterSource(type)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                                    filterSource === type 
                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' 
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* Main Grid */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {filteredIdeas.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredIdeas.map(idea => {
                        const history = historyCache[idea.ticker] || [];
                        const currentOrExitPrice = idea.status === 'Closed' && idea.exitPrice ? idea.exitPrice : idea.currentPrice;
                        const performance = calculatePerformance(
                            idea.entryPrice, 
                            currentOrExitPrice, 
                            history, 
                            idea.entryDate,
                            idea.status
                        );

                        return (
                            <div 
                                key={idea.id} 
                                className="h-full cursor-pointer"
                                onClick={() => {
                                    setSelectedIdea(idea);
                                    setIsDetailsModalOpen(true);
                                }}
                            >
                                <IdeaCard 
                                    idea={idea} 
                                    performance={performance}
                                    isDarkMode={isDarkMode}
                                />
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
                        <Search size={32} className="text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">No ideas found</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
                        Try adjusting your search terms, filters or tags.
                    </p>
                </div>
            )}
        </main>

        <AddIdeaModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onAdd={handleAddIdea}
            isDarkMode={isDarkMode}
        />

        <IdeaDetailsModal
            isOpen={isDetailsModalOpen}
            onClose={() => {
                setIsDetailsModalOpen(false);
                setSelectedIdea(null);
            }}
            idea={selectedIdea}
            performance={selectedIdea ? calculatePerformance(
                selectedIdea.entryPrice,
                selectedIdea.status === 'Closed' && selectedIdea.exitPrice ? selectedIdea.exitPrice : selectedIdea.currentPrice,
                historyCache[selectedIdea.ticker] || [],
                selectedIdea.entryDate,
                selectedIdea.status
            ) : null}
            onUpdateIdea={handleUpdateIdea}
            onDeleteIdea={handleDeleteIdea}
            isDarkMode={isDarkMode}
        />
    </div>
  );
}