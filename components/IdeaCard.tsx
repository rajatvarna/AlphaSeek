import React, { useEffect, useRef } from 'react';
import { StockIdea, PerformanceMetrics } from '../types';
import { TrendingUp, TrendingDown, ExternalLink, BrainCircuit, Share2, Info, Target, ShieldAlert } from 'lucide-react';

interface IdeaCardProps {
  idea: StockIdea;
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

const TradingViewWidget = ({ ticker }: { ticker: string }) => {
  const config = {
    symbol: ticker,
    width: "100%",
    height: "100%",
    locale: "en",
    dateRange: "12M",
    colorTheme: "light",
    isTransparent: true,
    autosize: true,
    largeChartUrl: ""
  };

  const src = `https://s.tradingview.com/embed-widget/mini-symbol-overview/?locale=en#${encodeURIComponent(JSON.stringify(config))}`;

  return (
    <div className="w-full h-full tradingview-widget-container">
      <iframe 
        src={src} 
        width="100%" 
        height="100%" 
        style={{ border: 0 }}
        scrolling="no" 
      />
    </div>
  );
};

const IdeaCard: React.FC<IdeaCardProps> = ({ idea, performance }) => {
  const isProfitable = performance.Total >= 0;
  const status = idea.status || 'Active';
  const currentOrExitPrice = status === 'Closed' && idea.exitPrice ? idea.exitPrice : idea.currentPrice;

  const getStatusColor = () => {
    switch (status) {
      case 'Watchlist': return 'bg-purple-100 text-purple-800';
      case 'Closed': return 'bg-gray-200 text-gray-800';
      case 'Active': default: return 'bg-blue-100 text-blue-800';
    }
  };

  const handleShare = async () => {
    const shareData: ShareData = {
        title: `AlphaSeek Idea: ${idea.ticker}`,
        text: `Check out this stock idea: ${idea.ticker} - ${idea.summary}`,
    };
    
    if (idea.originalLink) {
        shareData.url = idea.originalLink;
    }

    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            const textToCopy = `${shareData.text}${shareData.url ? `\nLink: ${shareData.url}` : ''}`;
            await navigator.clipboard.writeText(textToCopy);
            alert('Idea summary copied to clipboard!');
        }
    } catch (error) {
        console.error('Error sharing:', error);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-gray-50 flex justify-between items-start bg-gradient-to-r from-gray-50 to-white shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold text-gray-900 tracking-tight">{idea.ticker}</h3>
            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${getStatusColor()}`}>{status}</span>
            <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full font-medium">{idea.sourceType}</span>
            {idea.conviction === 'High' && (
                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium flex items-center gap-1">
                    <BrainCircuit size={10} /> High Conviction
                </span>
            )}
          </div>
          <p className="text-sm text-gray-500 font-medium truncate max-w-[200px]">{idea.companyName}</p>
        </div>
        <div className="flex items-start gap-3">
            <div className="text-right">
              <div className={`text-2xl font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                {isProfitable ? '+' : ''}{performance.Total.toFixed(2)}%
              </div>
              <p className="text-xs text-gray-400">Total Return</p>
            </div>
            <button 
                onClick={(e) => { e.stopPropagation(); handleShare(); }}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                title="Share Idea"
                aria-label="Share Idea"
            >
                <Share2 size={18} />
            </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-grow space-y-4 flex flex-col">
        
        {/* Price Info */}
        <div className="flex justify-between items-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <div className="flex flex-col">
             <span className="text-xs text-gray-400">Entry</span>
             <span className="font-semibold text-gray-800">${idea.entryPrice.toFixed(2)}</span>
             <span className="text-[10px] text-gray-400">{idea.entryDate}</span>
          </div>
          <div className="h-8 w-px bg-gray-200 mx-2"></div>
           <div className="flex flex-col text-right">
             <span className="text-xs text-gray-400">{status === 'Closed' ? 'Exit' : 'Current'}</span>
             <span className="font-semibold text-gray-800">${currentOrExitPrice.toFixed(2)}</span>
             <span className={`text-[10px] font-medium ${status === 'Closed' ? 'text-gray-500' : 'text-green-600'}`}>
                {status === 'Closed' ? idea.exitDate || 'Closed' : 'Live'}
             </span>
          </div>
        </div>

        {/* Targets */}
        {(idea.priceTarget || idea.stopLoss) && (
            <div className="flex gap-4 text-xs font-medium border-t border-gray-100 pt-3">
                {idea.priceTarget && (
                    <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                        <Target size={14} />
                        <span>Target: ${idea.priceTarget.toFixed(2)}</span>
                    </div>
                )}
                {idea.stopLoss && (
                    <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 px-2 py-1 rounded-md">
                        <ShieldAlert size={14} />
                        <span>Stop: ${idea.stopLoss.toFixed(2)}</span>
                    </div>
                )}
            </div>
        )}

        {/* Summary */}
        <div className="prose prose-sm">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Thesis Summary</h4>
          <p className="text-gray-700 text-sm leading-relaxed line-clamp-3">
            {idea.summary}
          </p>
        </div>

        {/* Company Description */}
        {idea.description && (
            <div className="mt-2 pt-2 border-t border-gray-100">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Info size={12} /> Company Profile
                </h4>
                <p className="text-gray-500 text-xs leading-relaxed line-clamp-3 hover:line-clamp-none transition-all cursor-pointer" title="Click to expand">
                    {idea.description}
                </p>
            </div>
        )}

        {/* TradingView Widget */}
        <div className="h-[220px] w-full border border-gray-100 rounded-lg overflow-hidden bg-white shrink-0">
            <TradingViewWidget ticker={idea.ticker} />
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-4 gap-2 mt-auto shrink-0">
          <PerformanceBadge label="1W" value={performance['1W']} />
          <PerformanceBadge label="1M" value={performance['1M']} />
          <PerformanceBadge label="6M" value={performance['6M']} />
          <PerformanceBadge label="YTD" value={performance.YTD} />
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
         <span className="text-xs text-gray-400 flex items-center gap-1">
            Source: <span className="font-medium text-gray-600 truncate max-w-[100px]">{idea.source}</span>
         </span>
         {idea.originalLink && (
            <a 
                href={idea.originalLink} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
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