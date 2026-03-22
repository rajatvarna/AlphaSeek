import React from 'react';

const AdvancedTradingViewWidget = ({ ticker, isDarkMode }: { ticker: string, isDarkMode?: boolean }) => {
  const theme = isDarkMode ? "dark" : "light";
  const src = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=${encodeURIComponent(ticker)}&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=${isDarkMode ? '131722' : 'f1f3f6'}&studies=%5B%5D&theme=${theme}&style=1&timezone=Etc%2FUTC&withdateranges=1&showpopupbutton=1&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&showpopupbutton=1&locale=en`;

  return (
    <div className="w-full h-full tradingview-widget-container">
      <iframe 
        src={src} 
        width="100%" 
        height="100%" 
        style={{ border: 0 }}
        allowFullScreen
      />
    </div>
  );
};

export default AdvancedTradingViewWidget;
