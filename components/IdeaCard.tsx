import React, { useEffect, useRef } from 'react';
import { StockIdea, PerformanceMetrics } from '../types';
import { TrendingUp, TrendingDown, ExternalLink, BrainCircuit, Share2 } from 'lucide-react';

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
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    
    // Clear any existing widget
    container.current.innerHTML = '';

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      "symbol": ticker,
      "width": "100%",
      "height": "100%",
      "locale": "en",
      "dateRange": "12M",
      "colorTheme": "light",
      "isTransparent": true,
      "autosize": true,
      "largeChartUrl": ""
    });
    
    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container";
    widgetContainer.style.height = "100%";
    widgetContainer.style.width = "100%";
    
    const widgetBody = document.createElement("div");
    widgetBody.className = "tradingview-widget-container__widget";
    widgetBody.style.height = "100%";
    widgetBody.style.width = "100%";
    
    widgetContainer.appendChild(widgetBody);
    widgetContainer.appendChild(script);
    
    container.current.appendChild(widgetContainer);
  }, [ticker]);

  return <div ref={container} className="w-full h-full" />;
};

const IdeaCard: React.FC<IdeaCardProps> = ({ idea, performance }) => {
  const isProfitable = performance.Total >= 0;

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
            // In a real app we'd use a toast, but alert is acceptable fallback for this request context
            alert('Idea summary copied to clipboard!');
        }
    } catch (error) {
        console.error('Error sharing:', error);
    }
  };

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
        <div className="flex items-start gap-3">
            <div className="text-right">
              <div className={`text-2xl font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                {isProfitable ? '+' : ''}{performance.Total.toFixed(2)}%
              </div>
              <p className="text-xs text-gray-400">Total Return</p>
            </div>
            <button 
                onClick={handleShare}
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

        {/* TradingView Widget */}
        <div className="h-40 w-full border border-gray-100 rounded-lg overflow-hidden bg-white">
            <TradingViewWidget ticker={idea.ticker} />
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-4 gap-2 mt-auto">
          <PerformanceBadge label="1W" value={performance['1W']} />
          <PerformanceBadge label="1M" value={performance['1M']} />
          <PerformanceBadge label="6M" value={performance['6M']} />
          <PerformanceBadge label="1Y" value={performance['1Y']} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <PerformanceBadge label="3Y" value={performance['3Y']} />
          <PerformanceBadge label="5Y" value={performance['5Y']} />
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