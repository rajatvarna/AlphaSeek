import React, { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, RefreshCw, Calendar, AlertCircle } from 'lucide-react';
import { ideasAPI } from '../services/apiClient';

interface NewsArticle {
  title: string;
  link: string;
  description: string;
  publishedAt: string;
  source: string;
  ticker: string;
}

interface NewsFeedProps {
  ideaId: string;
  ticker: string;
  companyName: string;
  limit?: number;
  compact?: boolean;
}

export default function NewsFeed({ ideaId, ticker, companyName, limit = 10, compact = false }: NewsFeedProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchNews = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await ideasAPI.getNews(ideaId, limit);
      setArticles(response.articles || []);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Error fetching news:', err);
      setError(err.message || 'Failed to fetch news');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [ideaId]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      'Yahoo Finance': 'text-purple-600 bg-purple-50',
      'Google News': 'text-blue-600 bg-blue-50',
      'Benzinga': 'text-green-600 bg-green-50'
    };
    return colors[source] || 'text-gray-600 bg-gray-50';
  };

  if (compact) {
    return (
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Newspaper size={16} className="text-gray-600" />
            <h4 className="text-sm font-semibold text-gray-700">Latest News</h4>
          </div>
          <button
            onClick={fetchNews}
            disabled={loading}
            className="text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {error && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded mb-2 flex items-center gap-1">
            <AlertCircle size={12} />
            {error}
          </div>
        )}

        {loading && articles.length === 0 ? (
          <div className="text-xs text-gray-500 py-4 text-center">Loading news...</div>
        ) : articles.length === 0 ? (
          <div className="text-xs text-gray-500 py-4 text-center">No recent news found</div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {articles.slice(0, 5).map((article, idx) => (
              <a
                key={idx}
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2 bg-white rounded border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h5 className="text-xs font-medium text-gray-800 group-hover:text-blue-600 line-clamp-2 flex-1">
                    {article.title}
                  </h5>
                  <ExternalLink size={10} className="text-gray-400 mt-0.5 flex-shrink-0" />
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getSourceColor(article.source)}`}>
                    {article.source}
                  </span>
                  <span>•</span>
                  <span>{formatTimeAgo(article.publishedAt)}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Newspaper size={20} className="text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">News Feed</h3>
              <p className="text-xs text-gray-600">
                {ticker} - {companyName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Calendar size={12} />
                Updated {formatTimeAgo(lastUpdated.toISOString())}
              </div>
            )}
            <button
              onClick={fetchNews}
              disabled={loading}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {loading && articles.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <RefreshCw size={32} className="animate-spin mx-auto mb-3 text-blue-600" />
            <p>Fetching latest news...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Newspaper size={32} className="mx-auto mb-3 text-gray-400" />
            <p>No recent news found for {ticker}</p>
            <p className="text-sm mt-1">Try refreshing or check back later</p>
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map((article, idx) => (
              <div
                key={idx}
                className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all group"
              >
                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="text-base font-semibold text-gray-800 group-hover:text-blue-600 transition-colors flex-1">
                      {article.title}
                    </h4>
                    <ExternalLink size={16} className="text-gray-400 group-hover:text-blue-600 mt-1 flex-shrink-0" />
                  </div>

                  {article.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {article.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className={`px-2 py-1 rounded font-medium ${getSourceColor(article.source)}`}>
                      {article.source}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {formatTimeAgo(article.publishedAt)}
                    </span>
                  </div>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
