import React, { useState, useEffect } from 'react';
import { scraperAPI } from '../services/apiClient';
import { Check, X, ExternalLink, TrendingUp, TrendingDown, Minus, RefreshCw, Loader2, Filter } from 'lucide-react';

interface ScrapedIdea {
  id: number;
  source: string;
  source_type: string;
  title: string;
  body: string;
  url: string;
  author: string;
  ticker: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  sentiment_score: number;
  confidence: number;
  upvotes: number;
  num_comments: number;
  created_at: string;
}

export default function ScraperQueue() {
  const [pendingIdeas, setPendingIdeas] = useState<ScrapedIdea[]>([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [filterSource, setFilterSource] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'confidence' | 'date'>('confidence');
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const [isScraping, setIsScraping] = useState(false);

  useEffect(() => {
    loadPendingIdeas();
    loadStats();
  }, []);

  const loadPendingIdeas = async () => {
    setIsLoading(true);
    try {
      const ideas = await scraperAPI.getPendingIdeas();
      setPendingIdeas(ideas);
    } catch (error: any) {
      console.error('Failed to load pending ideas:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await scraperAPI.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleApprove = async (id: number) => {
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      await scraperAPI.approveIdea(id);
      setPendingIdeas(prev => prev.filter(idea => idea.id !== id));
      setStats(prev => ({ ...prev, pending: prev.pending - 1, approved: prev.approved + 1 }));
    } catch (error: any) {
      console.error('Failed to approve idea:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleReject = async (id: number) => {
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      await scraperAPI.rejectIdea(id);
      setPendingIdeas(prev => prev.filter(idea => idea.id !== id));
      setStats(prev => ({ ...prev, pending: prev.pending - 1, rejected: prev.rejected + 1 }));
    } catch (error: any) {
      console.error('Failed to reject idea:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleTriggerScrape = async (source: 'all' | 'reddit' | 'twitter' | 'rss' | 'vic' | 'news') => {
    setIsScraping(true);
    try {
      await scraperAPI.triggerScrape(source);
      alert(`Scraping started for ${source}. Check back in a few minutes for new ideas.`);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsScraping(false);
    }
  };

  const filteredIdeas = pendingIdeas
    .filter(idea => filterSource === 'All' || idea.source_type === filterSource)
    .sort((a, b) => {
      if (sortBy === 'confidence') {
        return b.confidence - a.confidence;
      } else {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return <TrendingUp size={16} className="text-green-600" />;
      case 'bearish':
        return <TrendingDown size={16} className="text-red-600" />;
      default:
        return <Minus size={16} className="text-gray-400" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'text-green-600 bg-green-50 dark:bg-green-900 dark:text-green-300';
    if (confidence >= 0.5) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900 dark:text-yellow-300';
    return 'text-orange-600 bg-orange-50 dark:bg-orange-900 dark:text-orange-300';
  };

  const getSourceColor = (sourceType: string) => {
    switch (sourceType) {
      case 'Reddit':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
      case 'Twitter':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'Blog':
      case 'Substack':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      case 'News':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Scraped Ideas Queue</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Review and approve stock ideas discovered by automated scrapers
          </p>
        </div>
        <button
          onClick={() => loadPendingIdeas()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Pending</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Approved</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.approved}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Rejected</div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.rejected}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
        </div>
      </div>

      {/* Trigger Scraping */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Manually Trigger Scraping</h3>
        <div className="flex flex-wrap gap-2">
          {(['all', 'reddit', 'twitter', 'rss', 'news', 'vic'] as const).map((source) => (
            <button
              key={source}
              onClick={() => handleTriggerScrape(source)}
              disabled={isScraping}
              className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-xs font-medium rounded hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50 capitalize"
            >
              {source}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={16} className="text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Source:</span>
          {(['All', 'Reddit', 'Twitter', 'Blog', 'Substack', 'News'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterSource(type)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filterSource === type
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'confidence' | 'date')}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="confidence">Confidence</option>
            <option value="date">Date</option>
          </select>
        </div>
      </div>

      {/* Ideas List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 size={48} className="animate-spin text-blue-600 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading pending ideas...</p>
        </div>
      ) : filteredIdeas.length === 0 ? (
        <div className="text-center py-20">
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Check size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No pending ideas</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {pendingIdeas.length === 0
              ? 'All caught up! Trigger a scrape to find new ideas.'
              : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredIdeas.map((idea) => (
            <div
              key={idea.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">${idea.ticker}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSourceColor(idea.source_type)}`}>
                          {idea.source_type}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getConfidenceColor(idea.confidence)}`}>
                          {Math.round(idea.confidence * 100)}% confidence
                        </span>
                        <div className="flex items-center gap-1">
                          {getSentimentIcon(idea.sentiment)}
                          <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{idea.sentiment}</span>
                        </div>
                      </div>
                      <h3 className="font-medium text-gray-900 dark:text-white line-clamp-2">{idea.title}</h3>
                    </div>
                  </div>

                  {/* Body */}
                  {idea.body && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-2">{idea.body}</p>
                  )}

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                    <span>From: {idea.source}</span>
                    <span>By: {idea.author}</span>
                    {idea.upvotes > 0 && <span>↑ {idea.upvotes}</span>}
                    {idea.num_comments > 0 && <span>💬 {idea.num_comments}</span>}
                    <a
                      href={idea.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View Source <ExternalLink size={12} />
                    </a>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex sm:flex-col gap-2 sm:min-w-[100px]">
                  <button
                    onClick={() => handleApprove(idea.id)}
                    disabled={processingIds.has(idea.id)}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check size={16} />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(idea.id)}
                    disabled={processingIds.has(idea.id)}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X size={16} />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
