import React, { useMemo } from 'react';
import { StockIdea, PerformanceMetrics } from '../types';
import { calculatePortfolioStats, PortfolioStats } from '../services/analyticsService';
import { TrendingUp, TrendingDown, Target, Award, BarChart3, PieChart } from 'lucide-react';

interface PortfolioDashboardProps {
  ideas: StockIdea[];
  performanceMap: Map<string, PerformanceMetrics>;
}

const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}> = ({ title, value, subtitle, icon, trend, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-3">
          {trend === 'up' && (
            <div className="flex items-center text-green-600 text-sm font-medium">
              <TrendingUp size={16} className="mr-1" />
              <span>Positive trend</span>
            </div>
          )}
          {trend === 'down' && (
            <div className="flex items-center text-red-600 text-sm font-medium">
              <TrendingDown size={16} className="mr-1" />
              <span>Negative trend</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const PortfolioDashboard: React.FC<PortfolioDashboardProps> = ({ ideas, performanceMap }) => {
  const stats: PortfolioStats = useMemo(() => {
    return calculatePortfolioStats(ideas, performanceMap);
  }, [ideas, performanceMap]);

  if (ideas.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
        <BarChart3 size={48} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Ideas Yet</h3>
        <p className="text-gray-500">Add some stock ideas to see portfolio analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Portfolio Analytics</h2>
          <p className="text-gray-500 mt-1">Performance overview and insights</p>
        </div>
        <div className="text-sm text-gray-500">
          {stats.totalIdeas} {stats.totalIdeas === 1 ? 'idea' : 'ideas'} tracked
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Average Return"
          value={`${stats.averageReturn >= 0 ? '+' : ''}${stats.averageReturn.toFixed(2)}%`}
          icon={<BarChart3 size={24} />}
          trend={stats.averageReturn >= 0 ? 'up' : 'down'}
          color={stats.averageReturn >= 0 ? 'green' : 'red'}
        />

        <StatCard
          title="Win Rate"
          value={`${stats.winRate.toFixed(1)}%`}
          subtitle={`${stats.winningIdeas} wins, ${stats.losingIdeas} losses`}
          icon={<Target size={24} />}
          color={stats.winRate >= 60 ? 'green' : stats.winRate >= 40 ? 'yellow' : 'red'}
        />

        {stats.bestPerformer && (
          <StatCard
            title="Best Performer"
            value={stats.bestPerformer.ticker}
            subtitle={`+${stats.bestPerformer.return.toFixed(2)}%`}
            icon={<Award size={24} />}
            color="green"
          />
        )}

        {stats.worstPerformer && (
          <StatCard
            title="Worst Performer"
            value={stats.worstPerformer.ticker}
            subtitle={`${stats.worstPerformer.return.toFixed(2)}%`}
            icon={<TrendingDown size={24} />}
            color="red"
          />
        )}
      </div>

      {/* Performance by Timeframe */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 size={20} />
          Average Performance by Timeframe
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {Object.entries(stats.byTimeframe).map(([timeframe, avgReturn]) => (
            <div key={timeframe} className="text-center">
              <div className="text-xs font-medium text-gray-500 mb-1">{timeframe}</div>
              <div
                className={`text-xl font-bold ${
                  avgReturn >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {avgReturn >= 0 ? '+' : ''}
                {avgReturn.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance by Source */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <PieChart size={20} />
          Performance by Source
        </h3>
        <div className="space-y-3">
          {Object.entries(stats.bySource)
            .sort((a, b) => b[1].avgReturn - a[1].avgReturn)
            .map(([source, data]) => (
              <div key={source} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{source}</div>
                  <div className="text-sm text-gray-500">{data.count} ideas</div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-lg font-bold ${
                      data.avgReturn >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {data.avgReturn >= 0 ? '+' : ''}
                    {data.avgReturn.toFixed(2)}%
                  </div>
                  <div className="text-xs text-gray-500">avg return</div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Performance by Conviction */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Award size={20} />
          Performance by Conviction Level
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['High', 'Medium', 'Low'] as const).map((conviction) => {
            const data = stats.byConviction[conviction];
            if (!data) return null;

            return (
              <div key={conviction} className="p-4 bg-gray-50 rounded-lg">
                <div className="text-center mb-3">
                  <div className="text-sm font-medium text-gray-500">{conviction} Conviction</div>
                  <div
                    className={`text-2xl font-bold mt-1 ${
                      data.avgReturn >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {data.avgReturn >= 0 ? '+' : ''}
                    {data.avgReturn.toFixed(2)}%
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Ideas:</span>
                  <span className="font-medium">{data.count}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500">Win Rate:</span>
                  <span className="font-medium">{data.winRate.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PortfolioDashboard;
