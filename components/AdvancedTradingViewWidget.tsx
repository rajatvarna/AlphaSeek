import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    TradingView: any;
  }
}

const AdvancedTradingViewWidget = ({ ticker }: { ticker: string }) => {
  const containerId = useRef(`tv_widget_${Math.random().toString(36).substring(7)}`);

  useEffect(() => {
    const scriptId = 'tradingview-widget-script';
    
    const initWidget = () => {
      if (window.TradingView && document.getElementById(containerId.current)) {
        new window.TradingView.widget({
          autosize: true,
          symbol: ticker,
          interval: "D",
          timezone: "Etc/UTC",
          theme: "light",
          style: "1",
          locale: "en",
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: containerId.current,
          hide_side_toolbar: false,
        });
      }
    };

    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://s.tradingview.com/tv.js';
      script.async = true;
      script.onload = initWidget;
      document.head.appendChild(script);
    } else {
      initWidget();
    }
  }, [ticker]);

  return (
    <div className="w-full h-full tradingview-widget-container">
      <div id={containerId.current} className="w-full h-full" />
    </div>
  );
};

export default AdvancedTradingViewWidget;
