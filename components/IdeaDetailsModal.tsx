import React, { useState } from 'react';
import { StockIdea, PerformanceMetrics, IdeaNote } from '../types';
import { X, ExternalLink, TrendingUp, TrendingDown, Target, ShieldAlert, Plus, MessageSquare, Trash2 } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AdvancedTradingViewWidget from './AdvancedTradingViewWidget';

const TradingViewProfileWidget = ({ ticker, isDarkMode }: { ticker: string, isDarkMode?: boolean }) => {
  const config = {
    colorTheme: isDarkMode ? "dark" : "light",
    isTransparent: true,
    width: "100%",
    height: "100%",
    symbol: ticker,
    locale: "en"
  };
  const src = `https://s.tradingview.com/embed-widget/symbol-profile/?locale=en#${encodeURIComponent(JSON.stringify(config))}`;
  return (
    <div className="w-full h-[250px] tradingview-widget-container">
      <iframe src={src} width="100%" height="100%" style={{ border: 0 }} scrolling="no" />
    </div>
  );
};

const TradingViewSymbolInfoWidget = ({ ticker, isDarkMode }: { ticker: string, isDarkMode?: boolean }) => {
  const config = {
    symbol: ticker,
    width: "100%",
    locale: "en",
    colorTheme: isDarkMode ? "dark" : "light",
    isTransparent: true
  };
  const src = `https://s.tradingview.com/embed-widget/symbol-info/?locale=en#${encodeURIComponent(JSON.stringify(config))}`;
  return (
    <div className="w-full h-[100px] tradingview-widget-container">
      <iframe src={src} width="100%" height="100%" style={{ border: 0 }} scrolling="no" />
    </div>
  );
};

const TradingViewFinancialsWidget = ({ ticker, isDarkMode }: { ticker: string, isDarkMode?: boolean }) => {
  const config = {
    colorTheme: isDarkMode ? "dark" : "light",
    isTransparent: true,
    largeChartUrl: "",
    displayMode: "regular",
    width: "100%",
    height: "100%",
    symbol: ticker,
    locale: "en"
  };
  const src = `https://s.tradingview.com/embed-widget/financials/?locale=en#${encodeURIComponent(JSON.stringify(config))}`;
  return (
    <div className="w-full h-[400px] tradingview-widget-container">
      <iframe src={src} width="100%" height="100%" style={{ border: 0 }} scrolling="no" />
    </div>
  );
};

interface IdeaDetailsModalProps {
  idea: StockIdea | null;
  performance: PerformanceMetrics | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateIdea: (updatedIdea: StockIdea) => void;
  onDeleteIdea: (id: string) => void;
  isDarkMode?: boolean;
}

const IdeaDetailsModal: React.FC<IdeaDetailsModalProps> = ({ idea, performance, isOpen, onClose, onUpdateIdea, onDeleteIdea, isDarkMode }) => {
  const [newNote, setNewNote] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen || !idea || !performance) return null;

  const isProfitable = performance.Total >= 0;
  const status = idea.status || 'Active';
  const currentOrExitPrice = status === 'Closed' && idea.exitPrice ? idea.exitPrice : idea.currentPrice;

  const handleAddNote = () => {
    if (!newNote.trim()) return;

    const note: IdeaNote = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      content: newNote.trim()
    };

    const updatedIdea = {
      ...idea,
      notes: [note, ...(idea.notes || [])]
    };

    onUpdateIdea(updatedIdea);
    setNewNote('');
  };

  const handleStatusChange = (newStatus: 'Watchlist' | 'Active' | 'Closed') => {
    let updatedIdea = { ...idea, status: newStatus };
    
    if (newStatus === 'Closed' && !idea.exitPrice) {
        updatedIdea.exitPrice = idea.currentPrice;
        updatedIdea.exitDate = new Date().toISOString().split('T')[0];
    } else if (newStatus !== 'Closed') {
        updatedIdea.exitPrice = undefined;
        updatedIdea.exitDate = undefined;
    }

    onUpdateIdea(updatedIdea);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gradient-to-r from-gray-50 to-white shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight">{idea.ticker}</h2>
              <select 
                value={status}
                onChange={(e) => handleStatusChange(e.target.value as any)}
                className={`px-3 py-1 text-sm font-medium rounded-full border-none cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none
                  ${status === 'Watchlist' ? 'bg-purple-100 text-purple-800' : 
                    status === 'Closed' ? 'bg-gray-200 text-gray-800' : 
                    'bg-blue-100 text-blue-800'}`}
              >
                <option value="Watchlist">Watchlist</option>
                <option value="Active">Active</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
            <p className="text-gray-600 font-medium">{idea.companyName}</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className={`text-3xl font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                {isProfitable ? '+' : ''}{(performance.Total || 0).toFixed(2)}%
              </div>
              <p className="text-sm text-gray-500">Total Return</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowDeleteConfirm(true)} className="p-2 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors text-gray-400" title="Delete Idea">
                <Trash2 size={20} />
              </button>
              <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500" title="Close">
                <X size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-grow overflow-y-auto p-6 bg-gray-50/50">
          
          {/* Symbol Info Widget */}
          <div className="mb-6 -mx-2">
            <TradingViewSymbolInfoWidget ticker={idea.ticker} isDarkMode={isDarkMode} />
          </div>

          {/* Advanced Chart Section */}
          <div className="mb-8 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-[500px]">
            <AdvancedTradingViewWidget ticker={idea.ticker} isDarkMode={isDarkMode} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Thesis & Notes */}
            <div className="lg:col-span-2 space-y-8">
                
                {/* Thesis Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Investment Thesis</h3>
                    <div className="prose prose-blue max-w-none prose-sm sm:prose-base text-gray-700">
                        <Markdown remarkPlugins={[remarkGfm]}>{idea.thesis}</Markdown>
                    </div>
                </div>

                {/* Journaling / Notes Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
                        <MessageSquare size={18} /> Trade Journal & Updates
                    </h3>
                    
                    <div className="mb-6">
                        <textarea
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="Add an update, earnings note, or change in conviction..."
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none text-sm"
                            rows={3}
                        />
                        <div className="flex justify-end mt-2">
                            <button 
                                onClick={handleAddNote}
                                disabled={!newNote.trim()}
                                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors shadow-sm flex items-center gap-2"
                            >
                                <Plus size={16} /> Add Note
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {idea.notes && idea.notes.length > 0 ? (
                            idea.notes.map(note => (
                                <div key={note.id} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                    <div className="text-xs text-gray-500 mb-2 font-medium">
                                        {new Date(note.date).toLocaleString()}
                                    </div>
                                    <div className="text-sm text-gray-800 whitespace-pre-wrap">
                                        {note.content}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500 italic text-center py-4">No notes added yet.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column: Metadata & Chart */}
            <div className="space-y-6">
                
                {/* Price & Targets */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Trade Details</h4>
                    
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Entry Price</span>
                            <span className="font-semibold text-gray-900">${(idea.entryPrice || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">{status === 'Closed' ? 'Exit Price' : 'Current Price'}</span>
                            <span className="font-semibold text-gray-900">${(currentOrExitPrice || 0).toFixed(2)}</span>
                        </div>
                        
                        {(idea.priceTarget || idea.stopLoss) && <div className="h-px bg-gray-100 my-2" />}
                        
                        {idea.priceTarget && (
                            <div className="flex justify-between items-center text-emerald-700">
                                <span className="text-sm flex items-center gap-1"><Target size={14}/> Target</span>
                                <span className="font-semibold">${(idea.priceTarget || 0).toFixed(2)}</span>
                            </div>
                        )}
                        {idea.stopLoss && (
                            <div className="flex justify-between items-center text-rose-700">
                                <span className="text-sm flex items-center gap-1"><ShieldAlert size={14}/> Stop Loss</span>
                                <span className="font-semibold">${(idea.stopLoss || 0).toFixed(2)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Company Profile */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 border-b border-gray-100 dark:border-gray-700 pb-2">Company Profile</h3>
                    <TradingViewProfileWidget ticker={idea.ticker} isDarkMode={isDarkMode} />
                </div>

                {/* Financials */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 border-b border-gray-100 dark:border-gray-700 pb-2">Financials</h3>
                    <TradingViewFinancialsWidget ticker={idea.ticker} isDarkMode={isDarkMode} />
                </div>

                {/* Metadata */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-4">
                    <div>
                        <span className="text-xs text-gray-500 block mb-1">Source</span>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">{idea.source}</span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{idea.sourceType}</span>
                        </div>
                        {idea.originalLink && (
                            <a href={idea.originalLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs mt-1 inline-flex items-center gap-1">
                                View Original <ExternalLink size={10} />
                            </a>
                        )}
                    </div>
                    
                    <div>
                        <span className="text-xs text-gray-500 block mb-1">Tags</span>
                        <div className="flex flex-wrap gap-1">
                            {(idea.tags || []).map(tag => (
                                <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">{tag}</span>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Idea</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to permanently delete this idea for <strong>{idea.ticker}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  onDeleteIdea(idea.id);
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IdeaDetailsModal;
