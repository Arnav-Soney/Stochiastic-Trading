import React, { useState, useEffect, useRef } from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { generateMonteCarloPaths, getProbabilityAtPrice } from '../utils/mathEngine';

export const MonteCarloVisualizer: React.FC = () => {
  const { prices, selectedAsset } = useTradingStore();
  const currentPrice = prices[selectedAsset] || 100;

  const [numPaths, setNumPaths] = useState<number>(60);
  const [volatility, setVolatility] = useState<number>(0.25);
  const [drift, setDrift] = useState<number>(0.05);
  const [steps, setSteps] = useState<number>(80);
  
  const [targetUpper, setTargetUpper] = useState<number>(currentPrice * 1.05);
  const [targetLower, setTargetLower] = useState<number>(currentPrice * 0.95);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync targets with price when asset changes
  useEffect(() => {
    setTargetUpper(Math.round(currentPrice * 1.06));
    setTargetLower(Math.round(currentPrice * 0.94));
  }, [selectedAsset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background grids
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    const gridCols = 8;
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

    const paddingRight = 65;
    const chartWidth = canvas.width - paddingRight;
    const chartHeight = canvas.height;

    // Generate paths using math engine
    const paths = generateMonteCarloPaths(currentPrice, steps, numPaths, drift, volatility, 1);
    
    // Find min and max prices across all generated paths to scale chart
    const allPrices = paths.flatMap(p => p.data);
    const maxVal = Math.max(...allPrices) * 1.01;
    const minVal = Math.min(...allPrices) * 0.99;
    const priceRange = maxVal - minVal;

    const getY = (val: number) => {
      return chartHeight - ((val - minVal) / priceRange) * chartHeight;
    };

    const getX = (stepIndex: number) => {
      return (stepIndex / steps) * chartWidth;
    };

    // Draw target boundaries
    ctx.lineWidth = 1;
    
    // Target Upper (Resistance / Breakout)
    const upperY = getY(targetUpper);
    ctx.strokeStyle = 'rgba(0, 230, 118, 0.35)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, upperY);
    ctx.lineTo(chartWidth, upperY);
    ctx.stroke();
    
    // Target Lower (Support / Liquidation)
    const lowerY = getY(targetLower);
    ctx.strokeStyle = 'rgba(255, 0, 85, 0.35)';
    ctx.beginPath();
    ctx.moveTo(0, lowerY);
    ctx.lineTo(chartWidth, lowerY);
    ctx.stroke();
    ctx.setLineDash([]); // Reset

    // Draw simulated random paths
    ctx.lineWidth = 1;
    paths.forEach((path) => {
      ctx.strokeStyle = `hsla(275, 100%, 65%, ${3.5 / numPaths})`; // Faint purple branching lines
      ctx.beginPath();
      ctx.moveTo(getX(0), getY(path.data[0]));

      for (let s = 1; s <= steps; s++) {
        ctx.lineTo(getX(s), getY(path.data[s]));
      }
      ctx.stroke();
    });

    // Calculate distributions & confidence bands at final step
    const finalPrices = paths.map(p => p.data[steps]).sort((a, b) => a - b);
    
    // Percentile lines for confidence bounds
    const idx68L = Math.floor(numPaths * 0.16);
    const idx68H = Math.floor(numPaths * 0.84);
    const idx95L = Math.floor(numPaths * 0.025);
    const idx95H = Math.floor(numPaths * 0.975);

    const price68L = finalPrices[idx68L] || currentPrice;
    const price68H = finalPrices[idx68H] || currentPrice;
    const price95L = finalPrices[idx95L] || currentPrice;
    const price95H = finalPrices[idx95H] || currentPrice;

    // Draw shaded confidence range on final edge
    ctx.fillStyle = 'rgba(179, 0, 255, 0.08)';
    ctx.fillRect(chartWidth - 10, getY(price95H), 10, getY(price95L) - getY(price95H));
    ctx.fillStyle = 'rgba(0, 242, 254, 0.15)';
    ctx.fillRect(chartWidth - 10, getY(price68H), 10, getY(price68L) - getY(price68H));

    // Draw scale tags
    ctx.fillStyle = '#94a3b8';
    ctx.font = '8px Fira Code';
    ctx.textAlign = 'left';

    [maxVal, price95H, price68H, currentPrice, price68L, price95L, minVal].forEach(p => {
      const y = getY(p);
      ctx.fillText(`$${Math.round(p).toLocaleString()}`, chartWidth + 5, y + 3);
      ctx.strokeStyle = 'rgba(255,255,255,0.015)';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();
    });

    // Write Target Text labels
    ctx.font = 'bold 9px Orbitron';
    ctx.fillStyle = 'hsl(var(--neon-emerald))';
    ctx.fillText(`UPPER TAR: $${Math.round(targetUpper)}`, 10, upperY - 4);
    ctx.fillStyle = 'hsl(var(--neon-crimson))';
    ctx.fillText(`LOWER TAR: $${Math.round(targetLower)}`, 10, lowerY - 4);

  }, [numPaths, volatility, drift, steps, currentPrice, targetUpper, targetLower]);

  // Calculate zone probability outputs
  const probUpperBreakout = getProbabilityAtPrice(currentPrice, targetUpper, volatility, steps);
  const probLowerLiquidation = getProbabilityAtPrice(currentPrice, targetLower, volatility, steps);
  const probStableRange = Math.max(0, 100 - probUpperBreakout - probLowerLiquidation);

  return (
    <div style={styles.container}>
      <div style={styles.grid}>
        {/* Quantitative Controls */}
        <div className="cyber-panel" style={styles.controlsPanel}>
          <div style={styles.panelTitle}>
            <span style={{ color: 'hsl(var(--neon-purple))' }}>⚛</span> SIMULATION CONFIGURATION
          </div>

          <div style={styles.controlRow}>
            <div style={styles.labelWrapper}>
              <span style={styles.sliderLabel}>VOLATILITY (σ)</span>
              <span style={styles.sliderValue} className="glow-cyan">{(volatility * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1.50"
              step="0.05"
              value={volatility}
              onChange={(e) => setVolatility(Number(e.target.value))}
              style={styles.slider}
            />
          </div>

          <div style={styles.controlRow}>
            <div style={styles.labelWrapper}>
              <span style={styles.sliderLabel}>EXPECTED RETURN / DRIFT (μ)</span>
              <span style={styles.sliderValue} className="glow-emerald">{(drift * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="-0.80"
              max="1.00"
              step="0.05"
              value={drift}
              onChange={(e) => setDrift(Number(e.target.value))}
              style={styles.slider}
            />
          </div>

          <div style={styles.controlRow}>
            <div style={styles.labelWrapper}>
              <span style={styles.sliderLabel}>SIMULATED MONTE CARLO PATHS</span>
              <span style={styles.sliderValue} className="glow-purple">{numPaths} paths</span>
            </div>
            <input
              type="range"
              min="10"
              max="150"
              step="5"
              value={numPaths}
              onChange={(e) => setNumPaths(Number(e.target.value))}
              style={styles.slider}
            />
          </div>

          <div style={styles.controlRow}>
            <div style={styles.labelWrapper}>
              <span style={styles.sliderLabel}>TIMESTEPS AHEAD (TIME BANDS)</span>
              <span style={styles.sliderValue}>{steps} periods</span>
            </div>
            <input
              type="range"
              min="20"
              max="150"
              step="5"
              value={steps}
              onChange={(e) => setSteps(Number(e.target.value))}
              style={styles.slider}
            />
          </div>

          <div style={styles.targetsGroup}>
            <div style={styles.targetCol}>
              <label style={styles.targetLabel}>RESISTANCE TARGET</label>
              <input
                type="number"
                value={targetUpper}
                onChange={(e) => setTargetUpper(Number(e.target.value))}
                className="cyber-input"
              />
            </div>
            <div style={styles.targetCol}>
              <label style={styles.targetLabel}>SUPPORT BOUNDARY</label>
              <input
                type="number"
                value={targetLower}
                onChange={(e) => setTargetLower(Number(e.target.value))}
                className="cyber-input"
              />
            </div>
          </div>
        </div>

        {/* Visual Canvas Panel */}
        <div className="cyber-panel" style={styles.visualPanel}>
          <div style={styles.panelTitle}>
            <span style={{ color: 'hsl(var(--neon-purple))' }}>📈</span> DYNAMIC MONTE CARLO BANDS
          </div>
          <canvas
            ref={canvasRef}
            width={580}
            height={260}
            style={styles.canvas}
          />
          {/* Legend */}
          <div style={styles.legend}>
            <span style={{ color: 'rgba(0, 242, 254, 0.7)' }}>■ 68% Percentile</span>
            <span style={{ color: 'rgba(179, 0, 255, 0.7)', marginLeft: 15 }}>■ 95% Tail Range</span>
          </div>
        </div>
      </div>

      {/* Probabilities Output Panel */}
      <div className="cyber-panel accent-purple" style={styles.probPanel}>
        <div style={styles.panelTitle}>
          <span style={{ color: 'hsl(var(--neon-purple))' }}>📊</span> STOCHASTIC PROBABILITY DISTRIBUTIONS
        </div>
        <div style={styles.probGrid}>
          <div style={styles.probCard}>
            <span style={styles.probHeader}>BREAKOUT RESISTANCE</span>
            <span style={{ ...styles.probPct, color: 'hsl(var(--neon-emerald))' }}>{probUpperBreakout}%</span>
            <div style={styles.probBarBg}>
              <div style={{ ...styles.probBarFill, width: `${probUpperBreakout}%`, backgroundColor: 'hsl(var(--neon-emerald))' }}></div>
            </div>
          </div>

          <div style={styles.probCard}>
            <span style={styles.probHeader}>RETAIN STABLE RANGE</span>
            <span style={{ ...styles.probPct, color: 'hsl(var(--neon-cyan))' }}>{probStableRange}%</span>
            <div style={styles.probBarBg}>
              <div style={{ ...styles.probBarFill, width: `${probStableRange}%`, backgroundColor: 'hsl(var(--neon-cyan))' }}></div>
            </div>
          </div>

          <div style={styles.probCard}>
            <span style={styles.probHeader}>BREAK SUPPORT / LIQUIDATION</span>
            <span style={{ ...styles.probPct, color: 'hsl(var(--neon-crimson))' }}>{probLowerLiquidation}%</span>
            <div style={styles.probBarBg}>
              <div style={{ ...styles.probBarFill, width: `${probLowerLiquidation}%`, backgroundColor: 'hsl(var(--neon-crimson))' }}></div>
            </div>
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
    gridTemplateColumns: '4fr 6fr',
    gap: 16,
  },
  controlsPanel: {
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
    accentColor: 'hsl(var(--neon-purple))',
    cursor: 'pointer',
  },
  targetsGroup: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginTop: 8,
    borderTop: '1px dashed hsl(var(--border-color))',
    paddingTop: 12,
  },
  targetCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  targetLabel: {
    fontSize: '9px',
    fontWeight: 'bold',
    color: 'hsl(var(--text-muted))',
  },
  visualPanel: {
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  canvas: {
    background: 'rgba(0,0,0,0.2)',
    borderRadius: 'var(--radius-sm)',
    width: '100%',
    height: 'auto',
  },
  legend: {
    fontSize: '9px',
    color: 'hsl(var(--text-muted))',
  },
  probPanel: {
    padding: 16,
  },
  probGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 16,
    marginTop: 8,
  },
  probCard: {
    background: 'rgba(255, 255, 255, 0.01)',
    border: '1px solid rgba(255, 255, 255, 0.03)',
    borderRadius: 'var(--radius-sm)',
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  probHeader: {
    fontSize: '9px',
    fontWeight: 'bold',
    color: 'hsl(var(--text-muted))',
    letterSpacing: '0.05em',
  },
  probPct: {
    fontSize: '24px',
    fontWeight: 'bold',
    fontFamily: 'var(--font-display)',
  },
  probBarBg: {
    height: '4px',
    background: 'hsl(var(--bg-primary))',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  probBarFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width var(--transition-slow)',
  }
};
