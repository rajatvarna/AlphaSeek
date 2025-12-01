import React, { useMemo } from 'react';
import { StockIdea, PerformanceMetrics, HistoricalDataPoint } from '../types';
import { TrendingUp, TrendingDown, ExternalLink, Calendar, DollarSign, BrainCircuit } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface IdeaCardProps {
  idea: StockIdea;
  history: HistoricalDataPoint[];
  performance: PerformanceMetrics;
}

const PerformanceBadge = ({ label, value }: { label: string, value: number }) => {
  const isPositive = value >= 0;
  return (
    <div className={`flex flex-col items-center p-2 rounded-lg ${isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'} border ${isPositive ? 'border-green-100' : 'border-red-100'} min-w-[60px]`}>
      <span className="text-[10px] font-semibold opacity-70 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-bold flex items-center gap-0.5">
        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {Math.abs(value).toFixed(1)}%
      </span>
    </div>
  );
};

const IdeaCard: React.FC<IdeaCardProps> = ({ idea, history, performance }) => {
  const chartData = useMemo(() => {
    // Downsample for sparkline
    if (history.length < 50) return history;
    return history.filter((_, i) => i % Math.ceil(history.length / 50) === 0);
  }, [history]);

  const isProfitable = performance.Total >= 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-gray-50 flex justify-between items-start bg-gradient-to-r from-gray-50 to-white">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold text-gray-900 tracking-tight">{idea.ticker}</h3>
            <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full font-medium">{idea.sourceType}</span>
            {idea.conviction === 'High' && (
                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium flex items-center gap-1">
                    <BrainCircuit size={10} /> High Conviction
                </span>
            )}
          </div>
          <p className="text-sm text-gray-500 font-medium truncate max-w-[200px]">{idea.companyName}</p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
            {isProfitable ? '+' : ''}{performance.Total.toFixed(2)}%
          </div>
          <p className="text-xs text-gray-400">Total Return</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-grow space-y-4">
        
        {/* Price Info */}
        <div className="flex justify-between items-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <div className="flex flex-col">
             <span className="text-xs text-gray-400">Entry</span>
             <span className="font-semibold text-gray-800">${idea.entryPrice.toFixed(2)}</span>
             <span className="text-[10px] text-gray-400">{idea.entryDate}</span>
          </div>
          <div className="h-8 w-px bg-gray-200 mx-2"></div>
           <div className="flex flex-col text-right">
             <span className="text-xs text-gray-400">Current</span>
             <span className="font-semibold text-gray-800">${idea.currentPrice.toFixed(2)}</span>
             <span className="text-[10px] text-green-600 font-medium">Live</span>
          </div>
        </div>

        {/* Summary */}
        <div className="prose prose-sm">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Thesis Summary</h4>
          <p className="text-gray-700 text-sm leading-relaxed line-clamp-3">
            {idea.summary}
          </p>
        </div>

        {/* Chart Sparkline */}
        <div className="h-24 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke={isProfitable ? '#16a34a' : '#dc2626'} 
                    strokeWidth={2} 
                    dot={false} 
                />
                <YAxis domain={['auto', 'auto']} hide />
              </LineChart>
            </ResponsiveContainer>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-4 gap-2">
          <PerformanceBadge label="1W" value={performance['1W']} />
          <PerformanceBadge label="1M" value={performance['1M']} />
          <PerformanceBadge label="6M" value={performance['6M']} />
          <PerformanceBadge label="YTD" value={performance.YTD} />
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
         <span className="text-xs text-gray-400 flex items-center gap-1">
            Source: <span className="font-medium text-gray-600 truncate max-w-[100px]">{idea.source}</span>
         </span>
         {idea.originalLink && (
            <a 
                href={idea.originalLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1 transition-colors"
            >
                Original Link <ExternalLink size={12} />
            </a>
         )}
      </div>
    </div>
  );
};

export default IdeaCard;
