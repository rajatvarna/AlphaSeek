import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Target, Award, AlertCircle, RefreshCw, BarChart3, PieChart } from 'lucide-react';
import { analyticsAPI } from '../services/apiClient';

interface PerformanceData {
  overall: {
    totalIdeas: number;
    profitableIdeas: number;
    losingIdeas: number;
    winRate: number;
    avgReturn: number;
    avgWin: number;
    avgLoss: number;
  };
  bestPerformers: Array<{
    ticker: string;
    companyName: string;
    return: number;
    entryDate: string;
    status: string;
  }>;
  worstPerformers: Array<{
    ticker: string;
    companyName: string;
    return: number;
    entryDate: string;
    status: string;
  }>;
  bySourceType: Record<string, {
    count: number;
    avgReturn: number;
    winRate: number;
    profitable: number;
  }>;
  byConviction: Record<string, {
    count: number;
    avgReturn: number;
    winRate: number;
    profitable: number;
  }>;
}

interface SectorData {
  total: number;
  sectors: Array<{
    name: string;
    count: number;
    percentage: number;
    ideas: Array<{ ticker: string; companyName: string }>;
  }>;
}

export default function PerformanceDashboard() {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [sectorData, setSectorData] = useState<SectorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'attribution' | 'sectors'>('overview');

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [performance, sectors] = await Promise.all([
        analyticsAPI.getPerformance(),
        analyticsAPI.getSectors()
      ]);

      setPerformanceData(performance);
      setSectorData(sectors);
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError(err.message || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getSourceTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'Reddit': 'bg-orange-100 text-orange-800',
      'X': 'bg-blue-100 text-blue-800',
      'Hedge Fund': 'bg-purple-100 text-purple-800',
      'Blog': 'bg-green-100 text-green-800',
      'News': 'bg-red-100 text-red-800',
      'Other': 'bg-gray-100 text-gray-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getSectorColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-indigo-500',
      'bg-pink-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-cyan-500'
    ];
    return colors[index % colors.length];
  };

  if (loading && !performanceData) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
        <RefreshCw size={32} className="animate-spin mx-auto mb-3 text-blue-600" />
        <p className="text-gray-500">Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-2 text-red-700 mb-2">
          <AlertCircle size={20} />
          <span className="font-semibold">Error Loading Analytics</span>
        </div>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (!performanceData) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={24} className="text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-800">Performance Dashboard</h2>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('attribution')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'attribution'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            Attribution
          </button>
          <button
            onClick={() => setActiveTab('sectors')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'sectors'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            Sectors
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Win Rate</span>
                <Target size={20} className="text-green-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {performanceData.overall.winRate.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {performanceData.overall.profitableIdeas} / {performanceData.overall.totalIdeas} profitable
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Avg Return</span>
                {performanceData.overall.avgReturn >= 0 ? (
                  <TrendingUp size={20} className="text-green-600" />
                ) : (
                  <TrendingDown size={20} className="text-red-600" />
                )}
              </div>
              <div className={`text-3xl font-bold ${performanceData.overall.avgReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {performanceData.overall.avgReturn >= 0 ? '+' : ''}{performanceData.overall.avgReturn.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                across {performanceData.overall.totalIdeas} ideas
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Avg Win</span>
                <TrendingUp size={20} className="text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-600">
                +{performanceData.overall.avgWin.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {performanceData.overall.profitableIdeas} winning ideas
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Avg Loss</span>
                <TrendingDown size={20} className="text-red-600" />
              </div>
              <div className="text-3xl font-bold text-red-600">
                {performanceData.overall.avgLoss.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {performanceData.overall.losingIdeas} losing ideas
              </div>
            </div>
          </div>

          {/* Best and Worst Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Best Performers */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award size={20} className="text-green-600" />
                <h3 className="text-lg font-semibold text-gray-800">Top Performers</h3>
              </div>
              <div className="space-y-2">
                {performanceData.bestPerformers.slice(0, 5).map((idea, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex-1">
                      <div className="font-bold text-gray-900">{idea.ticker}</div>
                      <div className="text-xs text-gray-600 truncate">{idea.companyName}</div>
                    </div>
                    <div className="text-right ml-2">
                      <div className="font-bold text-green-600">+{idea.return.toFixed(2)}%</div>
                      <div className="text-xs text-gray-500">{idea.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Worst Performers */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown size={20} className="text-red-600" />
                <h3 className="text-lg font-semibold text-gray-800">Underperformers</h3>
              </div>
              <div className="space-y-2">
                {performanceData.worstPerformers.slice(0, 5).map((idea, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex-1">
                      <div className="font-bold text-gray-900">{idea.ticker}</div>
                      <div className="text-xs text-gray-600 truncate">{idea.companyName}</div>
                    </div>
                    <div className="text-right ml-2">
                      <div className="font-bold text-red-600">{idea.return.toFixed(2)}%</div>
                      <div className="text-xs text-gray-500">{idea.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Attribution Tab */}
      {activeTab === 'attribution' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Source Type */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance by Source</h3>
            <div className="space-y-3">
              {Object.entries(performanceData.bySourceType).map(([type, data]) => (
                <div key={type} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 rounded text-sm font-medium ${getSourceTypeColor(type)}`}>
                      {type}
                    </span>
                    <span className="text-xs text-gray-500">{data.count} ideas</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-gray-500">Avg Return</div>
                      <div className={`font-bold ${data.avgReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {data.avgReturn >= 0 ? '+' : ''}{data.avgReturn.toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Win Rate</div>
                      <div className="font-bold text-gray-900">{data.winRate.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By Conviction */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance by Conviction</h3>
            <div className="space-y-3">
              {Object.entries(performanceData.byConviction).map(([level, data]) => (
                <div key={level} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                      level === 'High' ? 'bg-yellow-100 text-yellow-800' :
                      level === 'Medium' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {level} Conviction
                    </span>
                    <span className="text-xs text-gray-500">{data.count} ideas</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-gray-500">Avg Return</div>
                      <div className={`font-bold ${data.avgReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {data.avgReturn >= 0 ? '+' : ''}{data.avgReturn.toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Win Rate</div>
                      <div className="font-bold text-gray-900">{data.winRate.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sectors Tab */}
      {activeTab === 'sectors' && sectorData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <PieChart size={20} className="text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">Sector Allocation</h3>
            <span className="text-sm text-gray-500 ml-auto">{sectorData.total} active ideas</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sectorData.sectors.map((sector, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-4 h-4 rounded ${getSectorColor(idx)}`}></div>
                  <span className="font-semibold text-gray-800">{sector.name}</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {sector.percentage.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-500 mb-3">
                  {sector.count} {sector.count === 1 ? 'idea' : 'ideas'}
                </div>
                <div className="space-y-1">
                  {sector.ideas.slice(0, 3).map((idea, i) => (
                    <div key={i} className="text-xs text-gray-600 truncate">
                      {idea.ticker} - {idea.companyName}
                    </div>
                  ))}
                  {sector.ideas.length > 3 && (
                    <div className="text-xs text-gray-400">
                      +{sector.ideas.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
