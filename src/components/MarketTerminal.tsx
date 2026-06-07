import React, { useState, useEffect, useRef } from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { REGIMES } from '../utils/mathEngine';
import { createChart, ColorType, type IChartApi, type ISeriesApi } from 'lightweight-charts';
import { Maximize2, Minimize2, CalendarRange } from 'lucide-react';

export const MarketTerminal: React.FC = () => {
  const {
    selectedAsset, setSelectedAsset, prices, candles, currentRegime,
    orderBook, placeOrder, tradingMode, liveAssets,
    timeframe, setTimeframe, setCustomDateRange
  } = useTradingStore();

  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
  const [orderAmount, setOrderAmount] = useState<number>(1000);

  // Custom Date Picker State
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Maximize state
  const [isMaximized, setIsMaximized] = useState(false);

  // Drawing mode state
  const [drawMode, setDrawMode] = useState<'NONE' | 'SOLID' | 'DOTTED'>('NONE');

  type Trendline = {
    id: string;
    start: { logical: number; price: number };
    end: { logical: number; price: number };
    style: 'SOLID' | 'DOTTED';
  };

  const [trendlines, setTrendlines] = useState<Trendline[]>([]);
  const [drawingLine, setDrawingLine] = useState<{ start: { logical: number; price: number }, endX: number, endY: number } | null>(null);
  const [, forceRender] = useState({});

  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const lastAssetRef = useRef<string>('');

  // Chart height: normal vs maximized
  const chartHeight = isMaximized ? 600 : 340;

  // Initialize TradingView Lightweight Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'rgba(0,0,0,0)' },
        textColor: '#94a3b8',
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: 'rgba(0,242,254,0.3)', style: 1, width: 1 },
        horzLine: { color: 'rgba(0,242,254,0.3)', style: 1, width: 1 },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: 'rgba(255,255,255,0.08)',
        rightOffset: 5,
        fixLeftEdge: false,
        fixRightEdge: false,
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        autoScale: true,          // FIX #1: auto-scales Y axis to data
        scaleMargins: { top: 0.1, bottom: 0.1 },
        entireTextOnly: false,
      },
      handleScroll: true,
      handleScale: true,
      width: chartContainerRef.current.clientWidth || 600,
      height: chartHeight,
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#00e676',
      downColor: '#ff1744',
      borderVisible: false,
      wickUpColor: '#00e676',
      wickDownColor: '#ff1744',
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    const handleChartChange = () => forceRender({});
    chart.timeScale().subscribeVisibleTimeRangeChange(handleChartChange);
    chart.timeScale().subscribeSizeChange(handleChartChange);

    // Resize observer to keep chart responsive
    const observer = new ResizeObserver((entries) => {
      if (entries[0] && chart) {
        chart.applyOptions({ width: entries[0].contentRect.width });
      }
    });
    observer.observe(chartContainerRef.current);

    return () => {
      observer.disconnect();
      chart.timeScale().unsubscribeVisibleTimeRangeChange(handleChartChange);
      chart.timeScale().unsubscribeSizeChange(handleChartChange);
      chart.remove();
    };
  }, []); // only mount once

  // Re-apply height when maximize changes
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({ height: chartHeight });
    }
  }, [chartHeight]);

  // FIX #3: Update chart data whenever candles OR selectedAsset changes.
  useEffect(() => {
    if (!candlestickSeriesRef.current || !chartRef.current) return;

    const assetCandles = candles[selectedAsset] || [];
    const isNewAsset = lastAssetRef.current !== selectedAsset;

    // Clear existing data only when switching to a new asset
    if (isNewAsset) {
      lastAssetRef.current = selectedAsset;
      try {
        candlestickSeriesRef.current.setData([]);
      } catch (_) { /* ignore */ }
    }

    if (assetCandles.length === 0) return;

    const seenTimes = new Set<number>();
    const formattedData: { time: number; open: number; high: number; low: number; close: number }[] = [];

    assetCandles.forEach((c) => {
      let ts: number;
      if (c.time) {
        ts = Math.floor(new Date(c.time).getTime() / 1000);
      } else {
        ts = Math.floor(Date.now() / 1000) - (assetCandles.length * 60);
      }

      while (seenTimes.has(ts)) ts++;
      seenTimes.add(ts);

      formattedData.push({
        time: ts,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      });
    });

    formattedData.sort((a, b) => a.time - b.time);

    try {
      candlestickSeriesRef.current.setData(formattedData as any);
      if (isNewAsset) {
        chartRef.current.timeScale().fitContent(); // Only zoom to fit on initial load
      }
    } catch (err) {
      console.error('Chart setData error:', err);
    }
  }, [candles, selectedAsset]);



  const handlePlaceOrder = () => {
    if (orderAmount <= 0) return;
    placeOrder(selectedAsset, orderType, orderAmount);
  };

  const handleApplyCustomRange = () => {
    if (customStart && customEnd) {
      setCustomDateRange({
        start: new Date(customStart).toISOString(),
        end: new Date(customEnd).toISOString(),
      });
      setShowCustomPicker(false);
    }
  };

  const activeBook = orderBook[selectedAsset] || { bids: [], asks: [] };
  const isLiveArena = window.location.pathname.includes('/trade/live');
  const currentPrice = prices[selectedAsset] || 0;

  return (
    <div style={styles.container}>
      {/* Asset Selector Header – hidden in Live Arena which has a global search bar */}
      {!isLiveArena && (
        <div style={styles.header}>
          <div style={styles.assetList}>
            {(tradingMode === 'LIVE' ? liveAssets : ['BTC', 'ETH', 'SOL']).map(asset => {
              const isActive = asset === selectedAsset;
              const price = prices[asset] || 0;
              return (
                <button
                  key={asset}
                  onClick={() => setSelectedAsset(asset)}
                  style={{
                    ...styles.assetBtn,
                    borderColor: isActive ? 'hsl(var(--neon-cyan))' : 'transparent',
                    background: isActive ? 'hsl(var(--bg-tertiary))' : 'transparent',
                  }}
                >
                  <span style={styles.assetName}>{asset}{tradingMode === 'SIMULATION' ? '/USD' : ''}</span>
                  <span style={{
                    ...styles.assetPrice,
                    color: isActive ? 'hsl(var(--neon-cyan))' : 'hsl(var(--text-primary))'
                  }}>
                    {tradingMode === 'LIVE' ? '₹' : '$'}{price.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>
          <div style={styles.regimeBox}>
            <span style={styles.regimeLabel}>MARKET STATE:</span>
            <span style={{
              ...styles.regimeValue,
              color: currentRegime === 'STABLE_BULL' ? 'hsl(var(--neon-emerald))' :
                currentRegime === 'MEAN_REVERTING' ? 'hsl(var(--neon-cyan))' :
                  currentRegime === 'VOLATILE_BEAR' ? 'hsl(var(--neon-crimson))' : 'hsl(var(--neon-amber))'
            }}>
              {REGIMES[currentRegime].label}
            </span>
          </div>
        </div>
      )}

      {/* FIX #2: Timeframe selector + FIX (custom date picker in absolute popover) */}
      {tradingMode === 'LIVE' && (
        <div className="flex items-center gap-2 px-3 py-2 bg-bgSecondary border-b border-white/5">
          <span className="text-[10px] text-gray-500 font-bold font-mono tracking-widest mr-1">TIMEFRAME</span>
          {['1D', '1W', '1M', '1Y'].map(tf => (
            <button
              key={tf}
              onClick={() => {
                setTimeframe(tf);
                setShowCustomPicker(false);
              }}
              className={`px-3 py-1 text-xs font-bold rounded transition-all duration-150
                ${timeframe === tf
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/60 shadow-[0_0_8px_rgba(0,242,254,0.3)]'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
                }`}
            >
              {tf}
            </button>
          ))}

          {/* CUSTOM button with absolute popover — FIX #2 */}
          <div className="relative">
            <button
              onClick={() => {
                setTimeframe('CUSTOM');
                setShowCustomPicker(prev => !prev);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded transition-all duration-150
                ${timeframe === 'CUSTOM'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-400/60 shadow-[0_0_8px_rgba(168,85,247,0.3)]'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
                }`}
            >
              <CalendarRange size={12} />
              CUSTOM
            </button>

            {showCustomPicker && (
              <div className="absolute top-full mt-2 left-0 z-[200] bg-[#0d1525] border border-purple-500/40 rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.6)] p-4 min-w-[340px]">
                <div className="text-[10px] font-bold text-purple-400 tracking-widest mb-3">SELECT DATE RANGE</div>
                <div className="flex gap-4 items-end">
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-[9px] font-bold text-gray-500 tracking-wider">START DATE</label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={e => setCustomStart(e.target.value)}
                      className="bg-white/5 text-white text-xs px-3 py-2 rounded border border-white/10 outline-none focus:border-purple-400/60 transition-colors [color-scheme:dark]"
                    />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-[9px] font-bold text-gray-500 tracking-wider">END DATE</label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={e => setCustomEnd(e.target.value)}
                      className="bg-white/5 text-white text-xs px-3 py-2 rounded border border-white/10 outline-none focus:border-purple-400/60 transition-colors [color-scheme:dark]"
                    />
                  </div>
                  <button
                    onClick={handleApplyCustomRange}
                    disabled={!customStart || !customEnd}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-bold rounded transition-colors"
                  >
                    APPLY
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FIX #4: Chart panel with Maximize button */}
      <div style={styles.bodyGrid}>
        <div className="cyber-panel" style={{ ...styles.chartPanel, gridColumn: isMaximized ? '1 / -1' : undefined }}>
          <div style={styles.panelTitle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'hsl(var(--neon-cyan))' }}>⚡</span>
              <span>{selectedAsset} — LIVE TERMINAL</span>
              {currentPrice > 0 && (
                <span style={{ color: 'hsl(var(--neon-cyan))', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                  {tradingMode === 'LIVE' ? '₹' : '$'}{currentPrice.toLocaleString()}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={() => setDrawMode(drawMode === 'SOLID' ? 'NONE' : 'SOLID')}
                style={{
                  background: drawMode === 'SOLID' ? 'rgba(0,230,118,0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${drawMode === 'SOLID' ? 'rgba(0,230,118,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 6,
                  padding: '4px 8px',
                  cursor: 'pointer',
                  color: drawMode === 'SOLID' ? '#00e676' : 'hsl(var(--text-secondary))',
                  fontSize: 10,
                  fontWeight: 'bold',
                }}
                title={drawMode === 'SOLID' ? 'Click on chart to draw' : 'Add Solid Trendline'}
              >
                — SOLID
              </button>
              <button
                onClick={() => setDrawMode(drawMode === 'DOTTED' ? 'NONE' : 'DOTTED')}
                style={{
                  background: drawMode === 'DOTTED' ? 'rgba(0,230,118,0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${drawMode === 'DOTTED' ? 'rgba(0,230,118,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 6,
                  padding: '4px 8px',
                  cursor: 'pointer',
                  color: drawMode === 'DOTTED' ? '#00e676' : 'hsl(var(--text-secondary))',
                  fontSize: 10,
                  fontWeight: 'bold',
                }}
                title={drawMode === 'DOTTED' ? 'Click on chart to draw' : 'Add Dotted Trendline'}
              >
                ••• DOTTED
              </button>
              <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
              {/* FIX #4: Maximize toggle button */}
              <button
                onClick={() => setIsMaximized(v => !v)}
                title={isMaximized ? 'Minimize chart' : 'Maximize chart'}
                style={{
                  background: 'rgba(0,242,254,0.08)',
                  border: '1px solid rgba(0,242,254,0.2)',
                  borderRadius: 6,
                  padding: '4px 8px',
                  cursor: 'pointer',
                  color: 'hsl(var(--neon-cyan))',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.2s',
                }}
              >
                {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                <span style={{ fontSize: 9, fontWeight: 'bold', letterSpacing: '0.05em' }}>
                  {isMaximized ? 'COLLAPSE' : 'EXPAND'}
                </span>
              </button>
            </div>
          </div>

          {/* Chart container with SVG overlay for trendlines */}
          <div style={{ position: 'relative', width: '100%', height: chartHeight, background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
            <div
              ref={chartContainerRef}
              style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
                transition: 'height 0.3s ease',
              }}
            />
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: drawMode === 'NONE' ? 'none' : 'auto',
                zIndex: 10,
                cursor: 'crosshair'
              }}
              onMouseDown={(e) => {
                if (!chartRef.current || !candlestickSeriesRef.current || drawMode === 'NONE') return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const logical = chartRef.current.timeScale().coordinateToLogical(x);
                const price = candlestickSeriesRef.current.coordinateToPrice(y);
                
                if (logical !== null && price !== null) {
                  setDrawingLine({
                    start: { logical, price },
                    endX: x,
                    endY: y
                  });
                }
              }}
              onMouseMove={(e) => {
                if (!drawingLine || drawMode === 'NONE') return;
                const rect = e.currentTarget.getBoundingClientRect();
                setDrawingLine(prev => prev ? { ...prev, endX: e.clientX - rect.left, endY: e.clientY - rect.top } : null);
              }}
              onMouseUp={(e) => {
                if (!drawingLine || !chartRef.current || !candlestickSeriesRef.current || drawMode === 'NONE') return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const logical = chartRef.current.timeScale().coordinateToLogical(x);
                const price = candlestickSeriesRef.current.coordinateToPrice(y);
                
                if (logical !== null && price !== null) {
                  setTrendlines(prev => [...prev, {
                    id: Math.random().toString(),
                    start: drawingLine.start,
                    end: { logical, price },
                    style: drawMode as 'SOLID' | 'DOTTED'
                  }]);
                }
                setDrawingLine(null);
                setDrawMode('NONE');
              }}
              onMouseLeave={() => setDrawingLine(null)}
            >
              {trendlines.map(line => {
                if (!chartRef.current || !candlestickSeriesRef.current) return null;
                const x1 = chartRef.current.timeScale().logicalToCoordinate(line.start.logical as any);
                const y1 = candlestickSeriesRef.current.priceToCoordinate(line.start.price);
                const x2 = chartRef.current.timeScale().logicalToCoordinate(line.end.logical as any);
                const y2 = candlestickSeriesRef.current.priceToCoordinate(line.end.price);
                
                if (x1 === null || y1 === null || x2 === null || y2 === null) return null;
                return (
                  <line 
                    key={line.id}
                    x1={x1} y1={y1} x2={x2} y2={y2} 
                    stroke="#00e676" 
                    strokeWidth={2} 
                    strokeDasharray={line.style === 'DOTTED' ? '6,6' : 'none'} 
                    opacity={0.8}
                  />
                );
              })}
              
              {/* Currently drawing line */}
              {drawingLine && chartRef.current && candlestickSeriesRef.current && (
                <line 
                  x1={chartRef.current.timeScale().logicalToCoordinate(drawingLine.start.logical as any) || 0} 
                  y1={candlestickSeriesRef.current.priceToCoordinate(drawingLine.start.price) || 0} 
                  x2={drawingLine.endX} 
                  y2={drawingLine.endY} 
                  stroke="#00e676" 
                  strokeWidth={2} 
                  strokeDasharray={drawMode === 'DOTTED' ? '6,6' : 'none'} 
                  opacity={0.8}
                />
              )}
            </svg>
          </div>

          <div style={styles.chartLegend}>
            <span style={{ color: 'rgba(0,230,118,0.7)' }}>▲ Bull</span>
            <span style={{ color: 'rgba(255,23,68,0.7)' }}>▼ Bear</span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
            <span style={{ color: 'rgba(0,242,254,0.5)' }}>■ Lightweight Charts Engine</span>
          </div>
        </div>

        {/* Order Book Side Panel — pushed below if maximized */}
        {!isMaximized && (
          <div className="cyber-panel" style={styles.orderBookPanel}>
            <div style={styles.panelTitle}>
              <span style={{ color: 'hsl(var(--neon-cyan))' }}>☰</span> LIQUIDITY DEPTH
            </div>
            <div style={styles.bookHeaders}>
              <span>PRICE</span>
              <span>SIZE</span>
              <span>TOTAL</span>
            </div>
            <div style={styles.bookContainer}>
              {/* Asks */}
              <div style={styles.asksList}>
                {[...activeBook.asks].reverse().slice(0, 5).map((ask, idx) => (
                  <div key={`ask-${idx}`} style={styles.bookRow}>
                    <span style={{ color: 'hsl(var(--neon-crimson))' }}>{ask.price.toLocaleString()}</span>
                    <span style={styles.bookMono}>{ask.size}</span>
                    <span style={styles.bookMono}>{ask.total}</span>
                  </div>
                ))}
              </div>
              <div style={styles.spreadRow}>
                <span style={styles.spreadLabel}>SPREAD:</span>
                <span style={styles.spreadVal}>
                  {((activeBook.asks[0]?.price - activeBook.bids[0]?.price) || 0.1).toFixed(2)}
                </span>
              </div>
              <div style={styles.bidsList}>
                {activeBook.bids.slice(0, 5).map((bid, idx) => (
                  <div key={`bid-${idx}`} style={styles.bookRow}>
                    <span style={{ color: 'hsl(var(--neon-emerald))' }}>{bid.price.toLocaleString()}</span>
                    <span style={styles.bookMono}>{bid.size}</span>
                    <span style={styles.bookMono}>{bid.total}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Order Book below chart when maximized */}
      {isMaximized && (
        <div className="cyber-panel" style={{ ...styles.orderBookPanel, maxHeight: 'none', flexDirection: 'row', gap: 32 }}>
          <div style={{ flex: 1 }}>
            <div style={styles.panelTitle}><span style={{ color: 'hsl(var(--neon-cyan))' }}>☰</span> LIQUIDITY DEPTH</div>
            <div style={styles.bookHeaders}><span>PRICE</span><span>SIZE</span><span>TOTAL</span></div>
            <div style={styles.bookContainer}>
              <div style={styles.asksList}>
                {[...activeBook.asks].reverse().slice(0, 7).map((ask, idx) => (
                  <div key={`ask-max-${idx}`} style={styles.bookRow}>
                    <span style={{ color: 'hsl(var(--neon-crimson))' }}>{ask.price.toLocaleString()}</span>
                    <span style={styles.bookMono}>{ask.size}</span>
                    <span style={styles.bookMono}>{ask.total}</span>
                  </div>
                ))}
              </div>
              <div style={styles.spreadRow}>
                <span style={styles.spreadLabel}>SPREAD:</span>
                <span style={styles.spreadVal}>{((activeBook.asks[0]?.price - activeBook.bids[0]?.price) || 0.1).toFixed(2)}</span>
              </div>
              <div style={styles.bidsList}>
                {activeBook.bids.slice(0, 7).map((bid, idx) => (
                  <div key={`bid-max-${idx}`} style={styles.bookRow}>
                    <span style={{ color: 'hsl(var(--neon-emerald))' }}>{bid.price.toLocaleString()}</span>
                    <span style={styles.bookMono}>{bid.size}</span>
                    <span style={styles.bookMono}>{bid.total}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Execution panel */}
      <div className="cyber-panel" style={styles.executionPanel}>
        <div style={styles.panelTitle}>
          <span style={{ color: 'hsl(var(--neon-cyan))' }}>⨂</span> PAPER TRADING MATCHING ENGINE
        </div>
        <div style={styles.execGrid}>
          <div style={styles.orderTypeSelector}>
            <button
              onClick={() => setOrderType('BUY')}
              style={{
                ...styles.typeBtn,
                background: orderType === 'BUY' ? 'hsl(var(--neon-emerald) / 0.15)' : 'transparent',
                borderColor: orderType === 'BUY' ? 'hsl(var(--neon-emerald))' : 'hsl(var(--border-color))',
                color: orderType === 'BUY' ? 'hsl(var(--neon-emerald))' : 'hsl(var(--text-secondary))'
              }}
            >
              BUY / LONG
            </button>
            <button
              onClick={() => setOrderType('SELL')}
              style={{
                ...styles.typeBtn,
                background: orderType === 'SELL' ? 'hsl(var(--neon-crimson) / 0.15)' : 'transparent',
                borderColor: orderType === 'SELL' ? 'hsl(var(--neon-crimson))' : 'hsl(var(--border-color))',
                color: orderType === 'SELL' ? 'hsl(var(--neon-crimson))' : 'hsl(var(--text-secondary))'
              }}
            >
              SELL / SHORT
            </button>
          </div>

          <div style={styles.inputWrapper}>
            <label style={styles.inputLabel}>ALLOCATE CAPITAL ({tradingMode === 'LIVE' ? 'INR' : 'USD'})</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="number"
                value={orderAmount}
                onChange={(e) => setOrderAmount(Number(e.target.value))}
                className="cyber-input"
                style={{ flex: 1 }}
              />
              <div style={styles.presetButtons}>
                {[1000, 5000, 10000].map(amt => (
                  <button key={amt} onClick={() => setOrderAmount(amt)} style={styles.presetBtn}>
                    {tradingMode === 'LIVE' ? '₹' : '$'}{amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handlePlaceOrder}
            className={`cyber-btn ${orderType === 'BUY' ? 'btn-emerald' : 'btn-crimson'}`}
            style={styles.submitOrderBtn}
          >
            <span>PLACE {orderType} ORDER</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    width: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'hsl(var(--bg-secondary))',
    border: '1px solid hsl(var(--border-color))',
    borderRadius: 'var(--radius-md)',
    padding: '8px 16px',
    flexWrap: 'wrap',
    gap: 12,
  },
  assetList: { display: 'flex', gap: 12 },
  assetBtn: {
    border: '1px solid transparent',
    borderRadius: 'var(--radius-sm)',
    padding: '6px 16px',
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all var(--transition-fast)',
  },
  assetName: { fontSize: '10px', color: 'hsl(var(--text-muted))', fontWeight: 'bold' },
  assetPrice: { fontSize: '15px', fontWeight: 'bold', fontFamily: 'var(--font-display)' },
  regimeBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(255,255,255,0.02)',
    padding: '6px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
  },
  regimeLabel: { fontSize: '11px', fontWeight: 'bold', color: 'hsl(var(--text-secondary))', letterSpacing: '0.05em' },
  regimeValue: { fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.05em' },
  bodyGrid: {
    display: 'grid',
    gridTemplateColumns: '7fr 3fr',
    gap: 16,
  },
  chartPanel: {
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  panelTitle: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: 'hsl(var(--text-secondary))',
    letterSpacing: '0.05em',
    borderBottom: '1px solid hsl(var(--border-color))',
    paddingBottom: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  chartLegend: { fontSize: '10px', color: 'hsl(var(--text-muted))', display: 'flex', gap: 12 },
  orderBookPanel: {
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxHeight: 410,
  },
  bookHeaders: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    fontSize: '9px',
    color: 'hsl(var(--text-muted))',
    fontWeight: 'bold',
    paddingBottom: 4,
    borderBottom: '1px solid hsl(var(--border-color))',
  },
  bookContainer: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    justifyContent: 'space-between',
    overflowY: 'hidden',
  },
  asksList: { display: 'flex', flexDirection: 'column', gap: 4 },
  bidsList: { display: 'flex', flexDirection: 'column', gap: 4 },
  bookRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: '11px', padding: '2px 0' },
  bookMono: { fontFamily: 'var(--font-mono)', color: 'hsl(var(--text-secondary))', textAlign: 'left' },
  spreadRow: {
    display: 'flex',
    justifyContent: 'space-between',
    background: 'rgba(255,255,255,0.01)',
    borderTop: '1px solid rgba(255,255,255,0.03)',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    padding: '6px 4px',
    fontSize: '11px',
    margin: '6px 0',
  },
  spreadLabel: { color: 'hsl(var(--text-muted))', fontWeight: 'bold' },
  spreadVal: { fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: 'hsl(var(--neon-cyan))' },
  executionPanel: { padding: 16 },
  execGrid: {
    display: 'grid',
    gridTemplateColumns: '3fr 4fr 3fr',
    gap: 16,
    alignItems: 'center',
  },
  orderTypeSelector: { display: 'flex', gap: 10 },
  typeBtn: {
    flex: 1,
    padding: '10px',
    border: '1px solid',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '11px',
    letterSpacing: '0.05em',
    transition: 'all var(--transition-fast)',
  },
  inputWrapper: { display: 'flex', flexDirection: 'column', gap: 6 },
  inputLabel: { fontSize: '9px', color: 'hsl(var(--text-muted))', fontWeight: 'bold', letterSpacing: '0.05em' },
  presetButtons: { display: 'flex', gap: 6 },
  presetBtn: {
    background: 'hsl(var(--bg-tertiary))',
    border: '1px solid hsl(var(--border-color))',
    color: 'hsl(var(--text-secondary))',
    padding: '8px 10px',
    fontSize: '11px',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
    transition: 'all var(--transition-fast)',
  },
  submitOrderBtn: { width: '100%', padding: '12px', fontWeight: 'bold' },
};
