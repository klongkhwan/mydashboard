import React, { useEffect, useRef, memo } from 'react';

function TradingViewWidget() {
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
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      script.type = "text/javascript";
      script.async = true;
      script.innerHTML = `
        {
          "allow_symbol_change": true,
          "calendar": false,
          "details": false,
          "hide_side_toolbar": true,
          "hide_top_toolbar": false,
          "hide_legend": false,
          "hide_volume": false,
          "hotlist": false,
          "interval": "240",
          "locale": "th_TH",
          "save_image": true,
          "style": "1",
          "symbol": "BINANCE:BTCUSDT",
          "theme": "dark",
          "timezone": "Asia/Bangkok",
          "backgroundColor": "#0F0F0F",
          "gridColor": "rgba(242, 242, 242, 0.06)",
          "watchlist": [
            "OANDA:XAUUSD",
            "BINANCE:BTCUSDT",
            "BINANCE:ETHUSDT",
            "BINANCE:DOGEUSDT",
            "BINANCE:BNBUSDT",
            "BINANCE:SOLUSDT",
            "BINANCE:XRPUSDT",
            "BINANCE:AVAXUSDT",
            "BINANCE:SUIUSDT",
            "BINANCE:HBARUSDT",
            "NASDAQ:AAPL",
            "NASDAQ:MSFT",
            "NASDAQ:GOOGL",
            "NASDAQ:AMZN",
            "NASDAQ:TSLA",
            "NASDAQ:META",
            "NASDAQ:NVDA",
            "NASDAQ:NFLX",
            "NYSE:BRK.B",
            "NYSE:JPM"
          ],
          "withdateranges": false,
          "compareSymbols": [],
          "studies": [
            "STD;Stochastic_RSI",
            "STD;Divergence%1Indicator"          
          ],
          "autosize": true
        }`;

      if (container.current) {
        container.current.appendChild(script);
        scriptAdded.current = true;
      }
    },
    []
  );

  return (
    <div className="tradingview-widget-container" ref={container} style={{ height: "100%", width: "100%" }}>
      <div className="tradingview-widget-container__widget" style={{ height: "calc(100% - 32px)", width: "100%" }}></div>
      <div className="tradingview-widget-copyright"><a href="https://th.tradingview.com/symbols/BTCUSDT/?exchange=BINANCE" rel="noopener nofollow" target="_blank"><span className="blue-text">Track all markets on TradingView</span></a></div>
    </div>
  );
}

export default memo(TradingViewWidget);