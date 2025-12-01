import React, { useState, useEffect, useMemo } from 'react';
import { StockIdea, SourceType } from './types';
import { getMockStockHistory, getCurrentPrice, calculatePerformance } from './services/stockService';
import IdeaCard from './components/IdeaCard';
import AddIdeaModal from './components/AddIdeaModal';
import { Plus, Search, Filter, LayoutGrid, List, Rocket } from 'lucide-react';

// Sample initial data
const INITIAL_IDEAS: StockIdea[] = [
    {
        id: '1',
        ticker: 'NVDA',
        companyName: 'NVIDIA Corporation',
        source: 'Hedge Fund Letter',
        sourceType: 'Hedge Fund',
        originalLink: 'https://example.com',
        entryDate: '2023-05-15',
        entryPrice: 280.00,
        currentPrice: 460.12, // Will be updated by mock fetch
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
        entryDate: '2023-08-01',
        entryPrice: 64.50,
        currentPrice: 58.20,
        thesis: 'Market is pricing this as a dying business, but FCF yield is over 8%. New CEO will cut costs.',
        summary: 'Contrarian value play. Market pessimism overstated. Strong FCF yield and turnaround potential.',
        conviction: 'Medium',
        tags: ['Value', 'Fintech']
    }
];

export default function App() {
  const [ideas, setIdeas] = useState<StockIdea[]>(INITIAL_IDEAS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<SourceType | 'All'>('All');
  
  // Cache for historical data to avoid re-generating on every render
  const [historyCache, setHistoryCache] = useState<Record<string, any[]>>({});

  // Initialize/Update prices on load
  useEffect(() => {
    const initData = async () => {
        const updatedIdeas = await Promise.all(ideas.map(async (idea) => {
             // Simulate "Live" price update
             const currentPrice = await getCurrentPrice(idea.ticker);
             return { ...idea, currentPrice };
        }));
        setIdeas(updatedIdeas);

        // Populate history cache
        const newCache: Record<string, any[]> = {};
        updatedIdeas.forEach(idea => {
            if (!historyCache[idea.ticker]) {
                newCache[idea.ticker] = getMockStockHistory(idea.ticker, idea.entryDate);
            }
        });
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
        currentPrice
    };
    
    // Update cache for new ticker
    setHistoryCache(prev => ({
        ...prev,
        [newIdea.ticker]: getMockStockHistory(newIdea.ticker, newIdea.entryDate)
    }));

    setIdeas(prev => [newIdea, ...prev]);
  };

  const filteredIdeas = useMemo(() => {
    return ideas.filter(idea => {
      const matchesSearch = 
        idea.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        idea.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        idea.summary.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterSource === 'All' || idea.sourceType === filterSource;
      
      return matchesSearch && matchesFilter;
    });
  }, [ideas, searchTerm, filterSource]);

  return (
    <div className="min-h-screen bg-gray-50/50">
        {/* Navigation / Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                            <Rocket size={20} />
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight">AlphaSeek</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                        >
                            <Plus size={16} />
                            Add Idea
                        </button>
                    </div>
                </div>
            </div>
        </header>

        {/* Filters Bar */}
        <div className="border-b border-gray-200 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full sm:w-96">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={18} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search ticker, thesis, or source..."
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                        <Filter size={16} className="text-gray-400 mr-1" />
                        {(['All', 'Hedge Fund', 'X', 'Reddit', 'Blog', 'News', 'Other'] as const).map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilterSource(type)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                                    filterSource === type 
                                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
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
                        const performance = calculatePerformance(
                            idea.entryPrice, 
                            idea.currentPrice, 
                            history, 
                            idea.entryDate
                        );

                        return (
                            <div key={idea.id} className="h-full">
                                <IdeaCard 
                                    idea={idea} 
                                    history={history}
                                    performance={performance}
                                />
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="bg-gray-100 p-4 rounded-full mb-4">
                        <Search size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No ideas found</h3>
                    <p className="text-gray-500 mt-1 max-w-sm">
                        Try adjusting your search terms or filters, or add a new stock idea to get started.
                    </p>
                </div>
            )}
        </main>

        <AddIdeaModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onAdd={handleAddIdea}
        />
    </div>
  );
}
