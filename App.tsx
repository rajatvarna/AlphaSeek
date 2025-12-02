import React, { useState, useEffect, useMemo } from 'react';
import { StockIdea, SourceType, HistoricalDataPoint, PerformanceMetrics } from './types';
import { calculatePerformance } from './services/stockService';
import { authAPI, ideasAPI, stocksAPI } from './services/apiClient';
import IdeaCard from './components/IdeaCard';
import AddIdeaModal from './components/AddIdeaModal';
import TagFilter from './components/TagFilter';
import LoginPage from './components/LoginPage';
import PortfolioDashboard from './components/PortfolioDashboard';
import { Plus, Search, Filter, Rocket, LogOut, User, Loader2, LayoutGrid, BarChart3 } from 'lucide-react';

type ViewMode = 'ideas' | 'analytics';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(authAPI.isAuthenticated());
  const [currentUser, setCurrentUser] = useState(authAPI.getCurrentUserSync());
  const [ideas, setIdeas] = useState<StockIdea[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<SourceType | 'All'>('All');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('ideas');

  // Cache for historical data to avoid re-fetching
  const [historyCache, setHistoryCache] = useState<Record<string, HistoricalDataPoint[]>>({});

  // Load ideas on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadIdeas();
    }
  }, [isAuthenticated]);

  const loadIdeas = async () => {
    setIsLoading(true);
    setError('');

    try {
      const fetchedIdeas = await ideasAPI.getAll();

      // Convert database format to frontend format
      const formattedIdeas: StockIdea[] = fetchedIdeas.map((idea: any) => ({
        id: idea.id.toString(),
        ticker: idea.ticker,
        companyName: idea.company_name,
        source: idea.source,
        sourceType: idea.source_type,
        originalLink: idea.original_link,
        entryDate: idea.entry_date,
        entryPrice: idea.entry_price,
        currentPrice: idea.current_price,
        thesis: idea.thesis,
        summary: idea.summary,
        conviction: idea.conviction,
        tags: idea.tags
      }));

      setIdeas(formattedIdeas);

      // Populate history cache for all tickers
      const newCache: Record<string, HistoricalDataPoint[]> = {};
      await Promise.all(formattedIdeas.map(async (idea) => {
        if (!historyCache[idea.ticker]) {
          try {
            const stockData = await stocksAPI.getStockData(idea.ticker);
            newCache[idea.ticker] = stockData.history;
          } catch (err) {
            console.error(`Failed to fetch history for ${idea.ticker}`, err);
          }
        }
      }));
      setHistoryCache(prev => ({...prev, ...newCache}));

    } catch (err: any) {
      console.error('Failed to load ideas:', err);
      setError(err.message || 'Failed to load ideas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddIdea = async (newIdeaPart: Omit<StockIdea, 'id' | 'currentPrice'>) => {
    try {
      // Get current price from API
      const stockData = await stocksAPI.getStockData(newIdeaPart.ticker);

      // Create idea through API
      const createdIdea = await ideasAPI.create({
        ticker: newIdeaPart.ticker.toUpperCase(),
        companyName: newIdeaPart.companyName,
        source: newIdeaPart.source,
        sourceType: newIdeaPart.sourceType,
        originalLink: newIdeaPart.originalLink,
        entryDate: newIdeaPart.entryDate,
        entryPrice: newIdeaPart.entryPrice,
        currentPrice: stockData.currentPrice,
        thesis: newIdeaPart.thesis,
        summary: newIdeaPart.summary,
        conviction: newIdeaPart.conviction,
        tags: newIdeaPart.tags
      });

      // Convert to frontend format
      const newIdea: StockIdea = {
        id: createdIdea.id.toString(),
        ticker: createdIdea.ticker,
        companyName: createdIdea.company_name,
        source: createdIdea.source,
        sourceType: createdIdea.source_type,
        originalLink: createdIdea.original_link,
        entryDate: createdIdea.entry_date,
        entryPrice: createdIdea.entry_price,
        currentPrice: createdIdea.current_price,
        thesis: createdIdea.thesis,
        summary: createdIdea.summary,
        conviction: createdIdea.conviction,
        tags: createdIdea.tags
      };

      // Update cache for new ticker
      setHistoryCache(prev => ({
        ...prev,
        [newIdea.ticker]: stockData.history
      }));

      // Add to list
      setIdeas(prev => [newIdea, ...prev]);

    } catch (err: any) {
      console.error('Failed to add idea:', err);
      alert(`Failed to add idea: ${err.message}`);
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setIdeas([]);
    setHistoryCache({});
  };

  const handleLoginSuccess = async () => {
    setIsAuthenticated(true);
    const user = await authAPI.getCurrentUser();
    setCurrentUser(user);
  };

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    ideas.forEach(idea => idea.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [ideas]);

  const filteredIdeas = useMemo(() => {
    return ideas.filter(idea => {
      const matchesSearch =
        idea.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        idea.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        idea.summary.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter = filterSource === 'All' || idea.sourceType === filterSource;

      const matchesTags = selectedTags.length === 0 || selectedTags.some(tag => idea.tags.includes(tag));

      return matchesSearch && matchesFilter && matchesTags;
    });
  }, [ideas, searchTerm, filterSource, selectedTags]);

  // Create performance map for analytics
  const performanceMap = useMemo(() => {
    const map = new Map<string, PerformanceMetrics>();
    ideas.forEach(idea => {
      const history = historyCache[idea.ticker] || [];
      const performance = calculatePerformance(
        idea.entryPrice,
        idea.currentPrice,
        history,
        idea.entryDate
      );
      map.set(idea.id, performance);
    });
    return map;
  }, [ideas, historyCache]);

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

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
                        {/* View Mode Toggle */}
                        <div className="hidden md:flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setViewMode('ideas')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                    viewMode === 'ideas'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <LayoutGrid size={16} />
                                Ideas
                            </button>
                            <button
                                onClick={() => setViewMode('analytics')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                    viewMode === 'analytics'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <BarChart3 size={16} />
                                Analytics
                            </button>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User size={16} />
                            <span className="font-medium">{currentUser?.username}</span>
                            {currentUser?.role === 'admin' && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                                    Admin
                                </span>
                            )}
                        </div>
                        {authAPI.isAdmin() && viewMode === 'ideas' && (
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                            >
                                <Plus size={16} />
                                Add Idea
                            </button>
                        )}
                        <button
                            onClick={handleLogout}
                            className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 text-sm font-medium rounded-lg transition-colors"
                            title="Logout"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </header>

        {/* Filters Bar - Only show for ideas view */}
        {viewMode === 'ideas' && (
        <div className="border-b border-gray-200 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-center">
                        <div className="relative w-full sm:w-80">
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
                        <TagFilter
                            availableTags={allTags}
                            selectedTags={selectedTags}
                            onChange={setSelectedTags}
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                        <Filter size={16} className="text-gray-400 mr-1 flex-shrink-0" />
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
        )}

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {viewMode === 'analytics' ? (
                <PortfolioDashboard ideas={ideas} performanceMap={performanceMap} />
            ) : isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 size={48} className="animate-spin text-blue-600 mb-4" />
                    <p className="text-gray-600">Loading ideas...</p>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="bg-red-100 p-4 rounded-full mb-4">
                        <Search size={32} className="text-red-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">Error loading ideas</h3>
                    <p className="text-red-600 mt-1 max-w-sm">{error}</p>
                    <button
                        onClick={loadIdeas}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Retry
                    </button>
                </div>
            ) : filteredIdeas.length > 0 ? (
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
                        {ideas.length === 0
                            ? 'No ideas have been added yet. Click "Add Idea" to get started.'
                            : 'Try adjusting your search terms, filters or tags.'}
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
