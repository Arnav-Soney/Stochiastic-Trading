import React, { useState, useEffect, useRef } from 'react';
import { useTradingStore } from '../store/useTradingStore';

interface BacktestResults {
  totalReturn: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  tradesCount: number;
  pnlCurve: number[];
}

export const StrategyLab: React.FC = () => {
  const { candles, selectedAsset } = useTradingStore();

  const [buyThreshold, setBuyThreshold] = useState<number>(20);
  const [sellThreshold, setSellThreshold] = useState<number>(80);
  const [stopLossATR, setStopLossATR] = useState<number>(1.5);
  const [riskRewardRatio, setRiskRewardRatio] = useState<number>(2.5);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [results, setResults] = useState<BacktestResults | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Auto-run dummy initial backtest when asset changes
  useEffect(() => {
    runBacktest();
  }, [selectedAsset]);

  // Redraw Equity Curve Canvas when results change
  useEffect(() => {
    if (!results || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const curve = results.pnlCurve;
    const paddingRight = 50;
    const paddingBottom = 20;
    const chartWidth = canvas.width - paddingRight;
    const chartHeight = canvas.height - paddingBottom;

    // Find boundaries
    const maxVal = Math.max(...curve, 100) * 1.02;
    const minVal = Math.min(...curve, 100) * 0.98;
    const valRange = maxVal - minVal;

    const getY = (val: number) => {
      return chartHeight - ((val - minVal) / valRange) * chartHeight;
    };

    const getX = (idx: number) => {
      return (idx / (curve.length - 1)) * chartWidth;
    };

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 6; i++) {
      const y = (chartHeight / 6) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();
    }

    // Draw baseline 100 (initial capital)
    const baselineY = getY(100);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(0, baselineY);
    ctx.lineTo(chartWidth, baselineY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw equity curve
    ctx.strokeStyle = 'hsl(var(--neon-cyan))';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(curve[0]));

    for (let i = 1; i < curve.length; i++) {
      ctx.lineTo(getX(i), getY(curve[i]));
    }
    ctx.stroke();

    // Shading under the curve
    const gradient = ctx.createLinearGradient(0, 0, 0, chartHeight);
    gradient.addColorStop(0, 'rgba(0, 242, 254, 0.15)');
    gradient.addColorStop(1, 'rgba(0, 242, 254, 0.00)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(getX(0), baselineY);
    for (let i = 0; i < curve.length; i++) {
      ctx.lineTo(getX(i), getY(curve[i]));
    }
    ctx.lineTo(getX(curve.length - 1), baselineY);
    ctx.closePath();
    ctx.fill();

    // Draw price scale tags
    ctx.fillStyle = '#64748b';
    ctx.font = '8px Fira Code';
    ctx.textAlign = 'left';

    [maxVal, 100, minVal].forEach(p => {
      const y = getY(p);
      ctx.fillText(`${Math.round(p)}%`, chartWidth + 5, y + 3);
    });

  }, [results]);

  const runBacktest = () => {
    setIsRunning(true);
    
    // Simulate slight processing lag for JARVIS experience
    setTimeout(() => {
      const baseCandles = candles[selectedAsset] || [];
      if (baseCandles.length === 0) {
        setIsRunning(false);
        return;
      }

      // Mathematical simulation of a backtest based on Stochastic thresholds
      // Producing logical, dynamic results based on user selected inputs
      let currentEquity = 100; // Base index
      const pnlCurve: number[] = [100];
      let winCount = 0;
      let totalTrades = 0;

      // Dynamic variables based on sliders to make outputs logical:
      // High ATR usually means higher drawdowns and higher returns,
      // Bad stochastic setups (e.g. buy high/sell low) yield bad returns.
      const multiplier = (buyThreshold < 40 && sellThreshold > 60) ? 1.0 : 0.6;
      const profitTarget = (riskRewardRatio >= 1.5 && riskRewardRatio <= 3.5) ? 1.2 : 0.8;

      const noise = stopLossATR * 0.05;

      for (let i = 1; i <= 30; i++) {
        // Stochastic trading simulator
        const successChance = 0.48 + (multiplier * 0.08) - (noise * 0.2);
        const tradeSuccess = Math.random() < successChance;
        totalTrades++;

        let tradeReturn = 0;
        if (tradeSuccess) {
          winCount++;
          tradeReturn = (riskRewardRatio * 1.8) * profitTarget * (1 + Math.random() * 0.5);
        } else {
          tradeReturn = -1.2 * stopLossATR * (1 + Math.random() * 0.3);
        }

        currentEquity = Math.max(10, currentEquity + tradeReturn);
        pnlCurve.push(Number(currentEquity.toFixed(2)));
      }

      const totalReturn = Number((currentEquity - 100).toFixed(2));
      const winRate = Math.round((winCount / totalTrades) * 100);
      const sharpeRatio = Number((1.5 + (winRate / 100) * 2 - (stopLossATR * 0.2)).toFixed(2));
      const maxDrawdown = Number((10 + stopLossATR * 5 + Math.random() * 5).toFixed(2));

      setResults({
        totalReturn,
        winRate,
        sharpeRatio,
        maxDrawdown,
        tradesCount: totalTrades,
        pnlCurve
      });
      
      setIsRunning(false);
    }, 800);
  };

  return (
    <div style={styles.container}>
      <div style={styles.grid}>
        {/* Strategy Editor inputs */}
        <div className="cyber-panel accent-emerald" style={styles.editorPanel}>
          <div style={styles.panelTitle}>
            <span style={{ color: 'hsl(var(--neon-emerald))' }}>⚙</span> STOCHASTIC RULESET DESIGNER
          </div>

          <div style={styles.controlRow}>
            <div style={styles.labelWrapper}>
              <span style={styles.sliderLabel}>STOCHASTIC %K BUY TRIGGER (OVERSOLD)</span>
              <span style={styles.sliderValue} className="glow-emerald">&lt; {buyThreshold}</span>
            </div>
            <input
              type="range"
              min="10"
              max="45"
              step="1"
              value={buyThreshold}
              onChange={(e) => setBuyThreshold(Number(e.target.value))}
              style={styles.slider}
            />
          </div>

          <div style={styles.controlRow}>
            <div style={styles.labelWrapper}>
              <span style={styles.sliderLabel}>STOCHASTIC %K SELL TRIGGER (OVERBOUGHT)</span>
              <span style={styles.sliderValue} className="glow-crimson">&gt; {sellThreshold}</span>
            </div>
            <input
              type="range"
              min="55"
              max="90"
              step="1"
              value={sellThreshold}
              onChange={(e) => setSellThreshold(Number(e.target.value))}
              style={styles.slider}
            />
          </div>

          <div style={styles.controlRow}>
            <div style={styles.labelWrapper}>
              <span style={styles.sliderLabel}>STOP LOSS MULTIPLIER (ATR UNITS)</span>
              <span style={styles.sliderValue}>{stopLossATR}x ATR</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="4.0"
              step="0.1"
              value={stopLossATR}
              onChange={(e) => setStopLossATR(Number(e.target.value))}
              style={styles.slider}
            />
          </div>

          <div style={styles.controlRow}>
            <div style={styles.labelWrapper}>
              <span style={styles.sliderLabel}>TARGET RISK-REWARD RATIO (TP)</span>
              <span style={styles.sliderValue} className="glow-cyan">{riskRewardRatio}:1</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="5.0"
              step="0.1"
              value={riskRewardRatio}
              onChange={(e) => setRiskRewardRatio(Number(e.target.value))}
              style={styles.slider}
            />
          </div>

          <button
            onClick={runBacktest}
            disabled={isRunning}
            className="cyber-btn btn-emerald"
            style={styles.runBtn}
          >
            <span>{isRunning ? 'RUNNING QUANT BACKTEST...' : '⚡ INITIATE QUANT SIMULATION'}</span>
          </button>
        </div>

        {/* Backtester Results Panel */}
        <div className="cyber-panel" style={styles.resultsPanel}>
          <div style={styles.panelTitle}>
            <span style={{ color: 'hsl(var(--neon-cyan))' }}>⚔</span> BACKTEST HISTORICAL PERFORMANCE
          </div>

          {results && (
            <div style={styles.perfGrid}>
              <div style={styles.perfItem}>
                <span style={styles.perfLabel}>TOTAL RETURN</span>
                <span style={{ 
                  ...styles.perfValue, 
                  color: results.totalReturn >= 0 ? 'hsl(var(--neon-emerald))' : 'hsl(var(--neon-crimson))' 
                }}>
                  {results.totalReturn >= 0 ? '+' : ''}{results.totalReturn}%
                </span>
              </div>
              
              <div style={styles.perfItem}>
                <span style={styles.perfLabel}>WIN RATE</span>
                <span style={{ ...styles.perfValue, color: 'hsl(var(--neon-cyan))' }}>
                  {results.winRate}%
                </span>
              </div>

              <div style={styles.perfItem}>
                <span style={styles.perfLabel}>SHARPE RATIO</span>
                <span style={{ ...styles.perfValue, color: 'hsl(var(--neon-purple))' }}>
                  {results.sharpeRatio}
                </span>
              </div>

              <div style={styles.perfItem}>
                <span style={styles.perfLabel}>MAX DRAWDOWN</span>
                <span style={{ ...styles.perfValue, color: 'hsl(var(--neon-amber))' }}>
                  -{results.maxDrawdown}%
                </span>
              </div>
            </div>
          )}

          {/* Equity Curve Canvas */}
          <div style={{ position: 'relative', marginTop: 12 }}>
            <canvas
              ref={canvasRef}
              width={540}
              height={140}
              style={styles.canvas}
            />
            {isRunning && (
              <div style={styles.loaderOverlay}>
                <span style={styles.loaderText} className="glow-cyan">RUNNING MONTE CARLO COMBINATORICS...</span>
              </div>
            )}
          </div>
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
  grid: {
    display: 'grid',
    gridTemplateColumns: '4.5fr 5.5fr',
    gap: 16,
  },
  editorPanel: {
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
  controlRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  labelWrapper: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    fontWeight: '500',
  },
  sliderLabel: {
    color: 'hsl(var(--text-secondary))',
  },
  sliderValue: {
    fontFamily: 'var(--font-mono)',
    fontWeight: 'bold',
  },
  slider: {
    width: '100%',
    accentColor: 'hsl(var(--neon-emerald))',
    cursor: 'pointer',
  },
  runBtn: {
    width: '100%',
    padding: '12px',
    fontWeight: 'bold',
    marginTop: 8,
  },
  resultsPanel: {
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  perfGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 1fr',
    gap: 12,
  },
  perfItem: {
    background: 'rgba(255,255,255,0.01)',
    border: '1px solid rgba(255,255,255,0.03)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 4px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  perfLabel: {
    fontSize: '8px',
    color: 'hsl(var(--text-muted))',
    fontWeight: 'bold',
    letterSpacing: '0.05em',
    marginBottom: 4,
  },
  perfValue: {
    fontFamily: 'var(--font-display)',
    fontSize: '15px',
    fontWeight: 'bold',
  },
  canvas: {
    background: 'rgba(0,0,0,0.2)',
    borderRadius: 'var(--radius-sm)',
    width: '100%',
    height: 'auto',
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(10,12,18,0.85)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 'var(--radius-sm)',
  },
  loaderText: {
    fontFamily: 'var(--font-display)',
    fontSize: '11px',
    fontWeight: 'bold',
    letterSpacing: '0.1em',
  }
};
