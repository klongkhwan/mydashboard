import React, { useEffect, useRef, memo } from 'react';

function TradingViewTechnicalWidget() {
  const container = useRef<HTMLDivElement>(null);
  const scriptAdded = useRef(false);

  useEffect(
    () => {
      if (scriptAdded.current) return;

      // Clear any existing content
      if (container.current) {
        container.current.innerHTML = '';
      }

      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js";
      script.type = "text/javascript";
      script.async = true;
      script.innerHTML = `
        {
          "colorTheme": "dark",
          "displayMode": "single",
          "isTransparent": false,
          "locale": "th_TH",
          "interval": "1D",
          "disableInterval": false,
          "width": 425,
          "height": 450,
          "symbol": "BINANCE:BTCUSDT",
          "showIntervalTabs": true
        }`;

      if (container.current) {
        container.current.appendChild(script);
        scriptAdded.current = true;
      }
    },
    []
  );

  return (
    <div className="tradingview-widget-container flex justify-center items-center" ref={container}>
      <div className="tradingview-widget-container__widget"></div>
      <div className="tradingview-widget-copyright"><a href="https://th.tradingview.com/symbols/BTCUSDT/?exchange=BINANCE" rel="noopener nofollow" target="_blank"><span className="blue-text">Track all markets on TradingView</span></a></div>
    </div>
  );
}

export default memo(TradingViewTechnicalWidget);