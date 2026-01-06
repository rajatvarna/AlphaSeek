import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, AlertCircle, RefreshCw, DollarSign } from 'lucide-react';
import { earningsAPI } from '../services/apiClient';

interface EarningsEvent {
  id: string;
  ticker: string;
  company_name: string;
  next_earnings_date: string;
  next_earnings_date_raw: number;
  estimated_eps: number | null;
  status: string;
}

interface EarningsCalendarProps {
  compact?: boolean;
  daysAhead?: number;
}

export default function EarningsCalendar({ compact = false, daysAhead = 30 }: EarningsCalendarProps) {
  const [upcoming, setUpcoming] = useState<EarningsEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUpcoming = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await earningsAPI.getUpcoming(daysAhead);
      setUpcoming(response.upcoming || []);
    } catch (err: any) {
      console.error('Error fetching upcoming earnings:', err);
      setError(err.message || 'Failed to fetch upcoming earnings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcoming();
  }, [daysAhead]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const getDaysUntil = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUrgencyColor = (daysUntil: number) => {
    if (daysUntil === 0) return 'bg-red-50 border-red-300 text-red-800';
    if (daysUntil === 1) return 'bg-orange-50 border-orange-300 text-orange-800';
    if (daysUntil <= 7) return 'bg-yellow-50 border-yellow-300 text-yellow-800';
    return 'bg-blue-50 border-blue-300 text-blue-800';
  };

  // Group earnings by date
  const groupedEarnings = upcoming.reduce((groups, event) => {
    const dateKey = event.next_earnings_date;
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(event);
    return groups;
  }, {} as Record<string, EarningsEvent[]>);

  if (compact) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-600" />
            <h4 className="text-sm font-semibold text-gray-700">Upcoming Earnings</h4>
          </div>
          <button
            onClick={fetchUpcoming}
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

        {loading && upcoming.length === 0 ? (
          <div className="text-xs text-gray-500 py-4 text-center">Loading earnings...</div>
        ) : upcoming.length === 0 ? (
          <div className="text-xs text-gray-500 py-4 text-center">No upcoming earnings in next {daysAhead} days</div>
        ) : (
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {upcoming.slice(0, 5).map((event, idx) => {
              const daysUntil = getDaysUntil(event.next_earnings_date);
              return (
                <div
                  key={idx}
                  className={`p-2 rounded border ${getUrgencyColor(daysUntil)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate">{event.ticker}</div>
                      <div className="text-xs opacity-75 truncate">{event.company_name}</div>
                    </div>
                    <div className="text-right ml-2">
                      <div className="text-xs font-semibold">{formatDate(event.next_earnings_date)}</div>
                      {event.estimated_eps !== null && (
                        <div className="text-xs opacity-75">EPS: ${event.estimated_eps.toFixed(2)}</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {upcoming.length > 5 && (
              <div className="text-xs text-gray-500 text-center pt-1">
                +{upcoming.length - 5} more
              </div>
            )}
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
            <Calendar size={20} className="text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Earnings Calendar</h3>
              <p className="text-xs text-gray-600">
                Next {daysAhead} days - {upcoming.length} scheduled
              </p>
            </div>
          </div>
          <button
            onClick={fetchUpcoming}
            disabled={loading}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
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

        {loading && upcoming.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <RefreshCw size={32} className="animate-spin mx-auto mb-3 text-blue-600" />
            <p>Loading earnings calendar...</p>
          </div>
        ) : upcoming.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Calendar size={32} className="mx-auto mb-3 text-gray-400" />
            <p>No upcoming earnings in the next {daysAhead} days</p>
            <p className="text-sm mt-1">Check back later or try a longer timeframe</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedEarnings).map(([date, events]) => {
              const daysUntil = getDaysUntil(date);
              return (
                <div key={date} className="border-l-4 border-blue-500 pl-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-gray-800">{formatDate(date)}</h4>
                    {daysUntil <= 7 && (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
                        {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {events.map((event, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <div className="font-bold text-gray-900">{event.ticker}</div>
                            <div className="text-xs text-gray-600 line-clamp-1">{event.company_name}</div>
                          </div>
                          <TrendingUp size={16} className="text-blue-600 flex-shrink-0" />
                        </div>
                        {event.estimated_eps !== null && (
                          <div className="flex items-center gap-1 text-xs text-gray-700 mt-2">
                            <DollarSign size={12} />
                            <span>Est. EPS: <strong>${event.estimated_eps.toFixed(2)}</strong></span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
