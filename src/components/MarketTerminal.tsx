import React, { useState, useEffect, useRef } from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { REGIMES } from '../utils/mathEngine';

export const MarketTerminal: React.FC = () => {
  const {
    prices,
    candles,
    orderBook,
    selectedAsset,
    setSelectedAsset,
    placeOrder,
    currentRegime
  } = useTradingStore();

  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
  const [orderAmount, setOrderAmount] = useState<number>(1000);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Redraw canvas chart when prices or selected asset changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const assetCandles = candles[selectedAsset] || [];
    if (assetCandles.length === 0) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid background
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    const gridCols = 10;
    const gridRows = 6;
    for (let i = 0; i < gridCols; i++) {
      const x = (canvas.width / gridCols) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < gridRows; i++) {
      const y = (canvas.height / gridRows) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Chart margins
    const paddingRight = 60;
    const paddingBottom = 40;
    const chartWidth = canvas.width - paddingRight;
    const chartHeight = canvas.height - paddingBottom;

    // Find price limits
    const highs = assetCandles.map(c => c.high);
    const lows = assetCandles.map(c => c.low);
    const maxPrice = Math.max(...highs) * 1.002;
    const minPrice = Math.min(...lows) * 0.998;
    const priceRange = maxPrice - minPrice;

    // Helper to map price to Y coordinates
    const getY = (price: number) => {
      return chartHeight - ((price - minPrice) / priceRange) * chartHeight;
    };

    // Draw price scale on right
    ctx.fillStyle = '#64748b';
    ctx.font = '9px Fira Code';
    ctx.textAlign = 'left';
    const priceSteps = 5;
    for (let i = 0; i <= priceSteps; i++) {
      const price = minPrice + (priceRange / priceSteps) * i;
      const y = getY(price);
      ctx.fillText(Math.round(price).toLocaleString(), chartWidth + 5, y + 3);
      
      // Dashed horizontal guidelines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();
    }

    // Draw candles
    const candleWidth = (chartWidth / assetCandles.length) * 0.7;
    const spacing = chartWidth / assetCandles.length;

    assetCandles.forEach((candle, idx) => {
      const x = idx * spacing + spacing / 2;
      const openY = getY(candle.open);
      const closeY = getY(candle.close);
      const highY = getY(candle.high);
      const lowY = getY(candle.low);
      const isBullish = candle.close >= candle.open;

      // Color scheme based on bullish/bearish
      const neonEmerald = '#00e676';
      const neonCrimson = '#ff0055';
      ctx.strokeStyle = isBullish ? neonEmerald : neonCrimson;
      ctx.fillStyle = isBullish ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 0, 85, 0.15)';
      ctx.lineWidth = 1.5;

      // Draw wick (high to low)
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Draw real body
      ctx.lineWidth = 1;
      const bodyHeight = Math.abs(closeY - openY) || 1;
      const bodyY = Math.min(openY, closeY);
      ctx.beginPath();
      ctx.rect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight);
      ctx.fill();
      ctx.stroke();

      // Glow effect on recent candle
      if (idx === assetCandles.length - 1) {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = isBullish ? neonEmerald : neonCrimson;
        ctx.strokeStyle = isBullish ? neonEmerald : neonCrimson;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight);
        ctx.restore();
      }
    });

    // Draw overlay: Stochastic Envelopes (high/low probabilities)
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    assetCandles.forEach((candle, idx) => {
      const x = idx * spacing + spacing / 2;
      const avgPrice = (candle.high + candle.low) / 2;
      const envOffset = avgPrice * (REGIMES[currentRegime].volatility * 0.08);
      const upperEnv = getY(avgPrice + envOffset);
      if (idx === 0) ctx.moveTo(x, upperEnv);
      else ctx.lineTo(x, upperEnv);
    });
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 145, 0, 0.25)';
    ctx.beginPath();
    assetCandles.forEach((candle, idx) => {
      const x = idx * spacing + spacing / 2;
      const avgPrice = (candle.high + candle.low) / 2;
      const envOffset = avgPrice * (REGIMES[currentRegime].volatility * 0.08);
      const lowerEnv = getY(avgPrice - envOffset);
      if (idx === 0) ctx.moveTo(x, lowerEnv);
      else ctx.lineTo(x, lowerEnv);
    });
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash

    // Draw active price horizontal tag
    const lastCandle = assetCandles[assetCandles.length - 1];
    if (lastCandle) {
      const currentY = getY(lastCandle.close);
      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, currentY);
      ctx.lineTo(chartWidth, currentY);
      ctx.stroke();

      // Glowing tag box on scale
      ctx.fillStyle = '#00f2fe';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#00f2fe';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(chartWidth + 3, currentY - 7, 50, 14, 2);
      } else {
        ctx.rect(chartWidth + 3, currentY - 7, 50, 14);
      }
      ctx.fill();
      ctx.shadowBlur = 0; // Reset shadow

      ctx.fillStyle = '#0a0c12';
      ctx.font = 'bold 9px Orbitron';
      ctx.textAlign = 'center';
      ctx.fillText(Math.round(lastCandle.close).toLocaleString(), chartWidth + 28, currentY + 3);
    }

  }, [candles, selectedAsset, currentRegime]);

  const handlePlaceOrder = () => {
    if (orderAmount <= 0) return;
    placeOrder(selectedAsset, orderType, orderAmount);
  };

  const activeBook = orderBook[selectedAsset] || { bids: [], asks: [] };

  return (
    <div style={styles.container}>
      {/* Asset Selector Header */}
      <div style={styles.header}>
        <div style={styles.assetList}>
          {['BTC', 'ETH', 'SOL'].map(asset => {
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
                <span style={styles.assetName}>{asset}/USD</span>
                <span style={{
                  ...styles.assetPrice,
                  color: isActive ? 'hsl(var(--neon-cyan))' : 'hsl(var(--text-primary))'
                }}>
                  ${price.toLocaleString()}
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

      <div style={styles.bodyGrid}>
        {/* Live Chart Panel */}
        <div className="cyber-panel" style={styles.chartPanel}>
          <div style={styles.panelTitle}>
            <span style={{ color: 'hsl(var(--neon-cyan))' }}>⚡</span> STOCHASTIC LIVE TERMINAL
          </div>
          <canvas
            ref={canvasRef}
            width={720}
            height={340}
            style={styles.canvas}
          />
          {/* Chart info badges */}
          <div style={styles.chartLegend}>
            <span style={{ color: 'rgba(0, 242, 254, 0.7)' }}>■ Breakout Probability Envelope (68% Confidence)</span>
            <span style={{ color: 'rgba(255, 145, 0, 0.7)', marginLeft: 15 }}>■ Volatility Shock Zone</span>
          </div>
        </div>

        {/* Order Book Side Panel */}
        <div className="cyber-panel" style={styles.orderBookPanel}>
          <div style={styles.panelTitle}>
            <span style={{ color: 'hsl(var(--neon-cyan))' }}>☰</span> REAL-TIME LIQUIDITY DEPTH
          </div>
          <div style={styles.bookHeaders}>
            <span>PRICE (USD)</span>
            <span>SIZE ({selectedAsset})</span>
            <span>TOTAL ({selectedAsset})</span>
          </div>
          
          <div style={styles.bookContainer}>
            {/* Asks (Sell Orders - Top of orderbook) */}
            <div style={styles.asksList}>
              {[...activeBook.asks].reverse().slice(0, 5).map((ask, idx) => (
                <div key={`ask-${idx}`} style={styles.bookRow}>
                  <span style={{ color: 'hsl(var(--neon-crimson))' }}>{ask.price.toLocaleString()}</span>
                  <span style={styles.bookMono}>{ask.size}</span>
                  <span style={styles.bookMono}>{ask.total}</span>
                </div>
              ))}
            </div>

            {/* Spread Row */}
            <div style={styles.spreadRow}>
              <span style={styles.spreadLabel}>SPREAD:</span>
              <span style={styles.spreadVal}>
                ${((activeBook.asks[0]?.price - activeBook.bids[0]?.price) || 0.1).toFixed(2)}
              </span>
            </div>

            {/* Bids (Buy Orders - Bottom of orderbook) */}
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
      </div>

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
            <label style={styles.inputLabel}>ALLOCATE CAPITAL (USD)</label>
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
                  <button
                    key={amt}
                    onClick={() => setOrderAmount(amt)}
                    style={styles.presetBtn}
                  >
                    ${amt.toLocaleString()}
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
            <span>PLACE SIMULATED {orderType} POSITION</span>
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
  assetList: {
    display: 'flex',
    gap: 12,
  },
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
  assetName: {
    fontSize: '10px',
    color: 'hsl(var(--text-muted))',
    fontWeight: 'bold',
  },
  assetPrice: {
    fontSize: '15px',
    fontWeight: 'bold',
    fontFamily: 'var(--font-display)',
  },
  regimeBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(255,255,255,0.02)',
    padding: '6px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
  },
  regimeLabel: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: 'hsl(var(--text-secondary))',
    letterSpacing: '0.05em',
  },
  regimeValue: {
    fontFamily: 'var(--font-display)',
    fontSize: '12px',
    fontWeight: 'bold',
    letterSpacing: '0.05em',
  },
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
    gap: 6,
  },
  canvas: {
    background: 'rgba(0,0,0,0.2)',
    borderRadius: 'var(--radius-sm)',
    width: '100%',
    height: 'auto',
  },
  chartLegend: {
    fontSize: '10px',
    color: 'hsl(var(--text-muted))',
    display: 'flex',
    gap: 12,
  },
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
  asksList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  bidsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  bookRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    fontSize: '11px',
    padding: '2px 0',
  },
  bookMono: {
    fontFamily: 'var(--font-mono)',
    color: 'hsl(var(--text-secondary))',
    textAlign: 'left',
  },
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
  spreadLabel: {
    color: 'hsl(var(--text-muted))',
    fontWeight: 'bold',
  },
  spreadVal: {
    fontFamily: 'var(--font-mono)',
    fontWeight: 'bold',
    color: 'hsl(var(--neon-cyan))',
  },
  executionPanel: {
    padding: 16,
  },
  execGrid: {
    display: 'grid',
    gridTemplateColumns: '3fr 4fr 3fr',
    gap: 16,
    alignItems: 'center',
  },
  orderTypeSelector: {
    display: 'flex',
    gap: 10,
  },
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
  inputWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  inputLabel: {
    fontSize: '9px',
    color: 'hsl(var(--text-muted))',
    fontWeight: 'bold',
    letterSpacing: '0.05em',
  },
  presetButtons: {
    display: 'flex',
    gap: 6,
  },
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
  submitOrderBtn: {
    width: '100%',
    padding: '12px',
    fontWeight: 'bold',
  }
};
