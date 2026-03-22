import React, { useEffect, useRef, useState } from 'react';
import { StockIdea, PerformanceMetrics } from '../types';
import { TrendingUp, TrendingDown, ExternalLink, BrainCircuit, Share2, Info, Target, ShieldAlert } from 'lucide-react';

interface IdeaCardProps {
  idea: StockIdea;
  performance: PerformanceMetrics;
}

const PerformanceBadge = ({ label, value }: { label: string, value: number }) => {
  const isPositive = value >= 0;
  return (
    <div className={`flex flex-col items-center p-1.5 sm:p-2 rounded-lg ${isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'} border ${isPositive ? 'border-green-100' : 'border-red-100'} min-w-0 w-full`}>
      <span className="text-[10px] font-semibold opacity-70 uppercase tracking-wider">{label}</span>
      <span className="text-xs sm:text-sm font-bold flex items-center gap-0.5 truncate max-w-full">
        {isPositive ? <TrendingUp size={12} className="shrink-0" /> : <TrendingDown size={12} className="shrink-0" />}
        <span className="truncate">{Math.abs(value).toFixed(1)}%</span>
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

  const [copied, setCopied] = useState(false);

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
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    } catch (error) {
        console.error('Error sharing:', error);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-gray-50 flex justify-between items-start bg-gradient-to-r from-gray-50 to-white shrink-0 gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
            <div className="flex items-baseline flex-wrap gap-1.5 sm:gap-2 min-w-0 max-w-full">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight shrink-0">{idea.ticker}</h3>
              <span className="text-xs sm:text-sm text-gray-500 font-medium break-words">{idea.companyName}</span>
            </div>
            <span className={`px-2 py-0.5 text-[10px] sm:text-xs rounded-full font-medium whitespace-nowrap ${getStatusColor()}`}>{status}</span>
            <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-[10px] sm:text-xs rounded-full font-medium whitespace-nowrap">{idea.sourceType}</span>
            {idea.conviction === 'High' && (
                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] sm:text-xs rounded-full font-medium flex items-center gap-1 whitespace-nowrap">
                    <BrainCircuit size={10} /> High Conviction
                </span>
            )}
          </div>
        </div>
        <div className="flex items-start gap-2 sm:gap-3 shrink-0">
            <div className="text-right">
              <div className={`text-2xl font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                {isProfitable ? '+' : ''}{(performance.Total || 0).toFixed(2)}%
              </div>
              <p className="text-xs text-gray-400">Total Return</p>
            </div>
            <button 
                onClick={(e) => { e.stopPropagation(); handleShare(); }}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors relative"
                title="Share Idea"
                aria-label="Share Idea"
            >
                <Share2 size={18} />
                {copied && (
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded shadow-sm whitespace-nowrap">
                        Copied!
                    </span>
                )}
            </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 flex-grow space-y-4 flex flex-col min-w-0">
        
        {/* Price Info */}
        <div className="flex justify-between items-center text-sm text-gray-600 bg-gray-50 p-2.5 sm:p-3 rounded-lg">
          <div className="flex flex-col min-w-0">
             <span className="text-[10px] sm:text-xs text-gray-400">Entry</span>
             <span className="font-semibold text-gray-800 text-xs sm:text-sm truncate">${(idea.entryPrice || 0).toFixed(2)}</span>
             <span className="text-[9px] sm:text-[10px] text-gray-400 truncate">{idea.entryDate}</span>
          </div>
          <div className="h-8 w-px bg-gray-200 mx-2 shrink-0"></div>
           <div className="flex flex-col text-right min-w-0">
             <span className="text-[10px] sm:text-xs text-gray-400">{status === 'Closed' ? 'Exit' : 'Current'}</span>
             <span className="font-semibold text-gray-800 text-xs sm:text-sm truncate">${(currentOrExitPrice || 0).toFixed(2)}</span>
             <span className={`text-[9px] sm:text-[10px] font-medium truncate ${status === 'Closed' ? 'text-gray-500' : 'text-green-600'}`}>
                {status === 'Closed' ? idea.exitDate || 'Closed' : 'Live'}
             </span>
          </div>
        </div>

        {/* Targets */}
        {(idea.priceTarget || idea.stopLoss) && (
            <div className="flex flex-wrap gap-2 sm:gap-4 text-xs font-medium border-t border-gray-100 pt-3">
                {idea.priceTarget && (
                    <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md min-w-0">
                        <Target size={14} className="shrink-0" />
                        <span className="truncate">Target: ${(idea.priceTarget || 0).toFixed(2)}</span>
                    </div>
                )}
                {idea.stopLoss && (
                    <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 px-2 py-1 rounded-md min-w-0">
                        <ShieldAlert size={14} className="shrink-0" />
                        <span className="truncate">Stop: ${(idea.stopLoss || 0).toFixed(2)}</span>
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
      <div className="p-3 sm:p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center shrink-0 gap-2">
         <span className="text-[10px] sm:text-xs text-gray-400 flex items-center gap-1 min-w-0">
            Source: <span className="font-medium text-gray-600 truncate">{idea.source}</span>
         </span>
         {idea.originalLink && (
            <a 
                href={idea.originalLink} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-blue-600 hover:text-blue-800 text-[10px] sm:text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
            >
                Original Link <ExternalLink size={12} />
            </a>
         )}
      </div>
    </div>
  );
};

export default IdeaCard;