import React from 'react';
import { useTradingStore } from '../store/useTradingStore';

export const RiskHUD: React.FC = () => {
  const {
    wallet,
    prices,
    positions,
    closePosition,
    emotionalMetrics,
    clearEmotionalAlerts,
    triggerMarketShock
  } = useTradingStore();

  // Convert assets to USD values
  const btcUSD = wallet.btc * prices.BTC;
  const ethUSD = wallet.eth * prices.ETH;
  const solUSD = wallet.sol * prices.SOL;
  const totalBalance = wallet.usd + btcUSD + ethUSD + solUSD;

  // Calculate total positions margin exposure
  const activeExposure = positions.reduce((sum, p) => sum + p.margin, 0);
  const exposurePct = totalBalance > 0 ? (activeExposure / totalBalance) * 100 : 0;

  // Emotional alerts check
  const isAlertActive =
    emotionalMetrics.overExposureAlert ||
    emotionalMetrics.revengeTradingAlert ||
    emotionalMetrics.panicClosingAlert;

  return (
    <div style={styles.container}>
      {/* Dynamic Warning HUD Overlay */}
      {isAlertActive && (
        <div style={{
          ...styles.hudOverlay,
          borderColor: emotionalMetrics.revengeTradingAlert ? 'hsl(var(--neon-crimson))' : 'hsl(var(--neon-amber))',
          boxShadow: emotionalMetrics.revengeTradingAlert 
            ? '0 0 20px rgba(255, 0, 85, 0.25), inset 0 0 20px rgba(255, 0, 85, 0.1)' 
            : '0 0 20px rgba(255, 145, 0, 0.2), inset 0 0 15px rgba(255, 145, 0, 0.08)'
        }}>
          <div style={styles.overlayHeader}>
            <span style={{
              ...styles.pulseText,
              color: emotionalMetrics.revengeTradingAlert ? 'hsl(var(--neon-crimson))' : 'hsl(var(--neon-amber))'
            }}>
              ⚠️ EMOTIONAL TRADING ANOMALY DETECTED
            </span>
            <button onClick={clearEmotionalAlerts} style={styles.resetBtn}>
              DISMISS AND RESET HUD
            </button>
          </div>
          <p style={styles.overlayBody}>
            {emotionalMetrics.revengeTradingAlert && (
              <span>• HIGH FREQUENCY ORDER CLUSTERING: You are placing trades too quickly. High risk of emotional revenge trading. Trade execution engine recommends systematic cooling periods.</span>
            )}
            {emotionalMetrics.overExposureAlert && !emotionalMetrics.revengeTradingAlert && (
              <span>• POSITION EXPOSURE CAP EXCEEDED: Single order size exceeds 25% of absolute portfolio net worth. Margin call probabilities elevated.</span>
            )}
          </p>
        </div>
      )}

      {/* Main Grid: Wallet Portfolio on left, Active Positions on right */}
      <div style={styles.grid}>
        {/* Portfolio Balances */}
        <div className="cyber-panel accent-emerald" style={styles.portfolioPanel}>
          <div style={styles.panelTitle}>
            <span style={{ color: 'hsl(var(--neon-emerald))' }}>💼</span> QUANT PORTFOLIO INTELLIGENCE
          </div>

          <div style={styles.balanceSummary}>
            <span style={styles.totalLabel}>NET PORTFOLIO VAL (USD)</span>
            <span style={styles.totalValue} className="glow-emerald">${Number(totalBalance.toFixed(2)).toLocaleString()}</span>
          </div>

          <div style={styles.assetsGrid}>
            <div style={styles.assetCard}>
              <span style={styles.assetHeader}>USD CASH</span>
              <span style={styles.assetVal}>${Number(wallet.usd.toFixed(2)).toLocaleString()}</span>
            </div>
            
            <div style={styles.assetCard}>
              <span style={styles.assetHeader}>BITCOIN (BTC)</span>
              <span style={styles.assetVal}>{wallet.btc.toFixed(3)} <span style={styles.assetUsd}>(${Math.round(btcUSD).toLocaleString()})</span></span>
            </div>

            <div style={styles.assetCard}>
              <span style={styles.assetHeader}>ETHEREUM (ETH)</span>
              <span style={styles.assetVal}>{wallet.eth.toFixed(3)} <span style={styles.assetUsd}>(${Math.round(ethUSD).toLocaleString()})</span></span>
            </div>

            <div style={styles.assetCard}>
              <span style={styles.assetHeader}>SOLANA (SOL)</span>
              <span style={styles.assetVal}>{wallet.sol.toFixed(2)} <span style={styles.assetUsd}>(${Math.round(solUSD).toLocaleString()})</span></span>
            </div>
          </div>

          {/* Risk Metrics */}
          <div style={styles.riskTelemetry}>
            <div style={styles.telemetryItem}>
              <span style={styles.telemetryLabel}>CAPITAL LEVERAGE</span>
              <span style={styles.telemetryVal}>{exposurePct.toFixed(1)}%</span>
            </div>
            <div style={styles.telemetryItem}>
              <span style={styles.telemetryLabel}>EMOTIONAL STATE</span>
              <span style={{
                ...styles.telemetryVal,
                color: emotionalMetrics.revengeTradingAlert ? 'hsl(var(--neon-crimson))' :
                       emotionalMetrics.overExposureAlert ? 'hsl(var(--neon-amber))' : 'hsl(var(--neon-emerald))'
              }}>
                {emotionalMetrics.revengeTradingAlert ? 'HYPER-VOLATILE' :
                 emotionalMetrics.overExposureAlert ? 'STRESSED EXPOSURE' : 'OPTIMAL COGNITIVE'}
              </span>
            </div>
            
            <button
              onClick={triggerMarketShock}
              className="cyber-btn btn-crimson"
              style={styles.shockBtn}
            >
              <span>💥 INJECT LIQUIDITY SHOCK</span>
            </button>
          </div>
        </div>

        {/* Active open positions list */}
        <div className="cyber-panel" style={styles.positionsPanel}>
          <div style={styles.panelTitle}>
            <span style={{ color: 'hsl(var(--neon-cyan))' }}>◈</span> ACTIVE STOCHASTIC CONTRACTS
          </div>

          <div style={styles.tableWrapper}>
            {positions.length === 0 ? (
              <div style={styles.emptyState}>
                <span>NO ACTIVE POSITIONS RUNNING ON THE SIMULATION ENGINE.</span>
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={styles.th}>ASSET</th>
                    <th style={styles.th}>TYPE</th>
                    <th style={styles.th}>ENTRY</th>
                    <th style={styles.th}>CURRENT</th>
                    <th style={styles.th}>MARGIN</th>
                    <th style={styles.th}>UNREALIZED PNL</th>
                    <th style={styles.th}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map(pos => (
                    <tr key={pos.id} style={styles.tbodyRow}>
                      <td style={{ ...styles.td, fontWeight: 'bold' }}>{pos.asset}/USD</td>
                      <td style={{ 
                        ...styles.td, 
                        color: pos.type === 'BUY' ? 'hsl(var(--neon-emerald))' : 'hsl(var(--neon-crimson))',
                        fontWeight: 'bold'
                      }}>
                        {pos.type === 'BUY' ? 'LONG' : 'SHORT'}
                      </td>
                      <td style={styles.tdMono}>${pos.entryPrice.toLocaleString()}</td>
                      <td style={styles.tdMono}>${pos.currentPrice.toLocaleString()}</td>
                      <td style={styles.tdMono}>${pos.margin.toLocaleString()}</td>
                      <td style={{
                        ...styles.tdMono,
                        color: pos.pnl >= 0 ? 'hsl(var(--neon-emerald))' : 'hsl(var(--neon-crimson))',
                        fontWeight: 'bold'
                      }} className={pos.pnl >= 0 ? 'glow-emerald' : 'glow-crimson'}>
                        {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toLocaleString()}
                      </td>
                      <td style={styles.td}>
                        <button
                          onClick={() => closePosition(pos.id)}
                          className="cyber-btn btn-crimson"
                          style={styles.closeBtn}
                        >
                          <span>CLOSE</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
  hudOverlay: {
    background: 'rgba(10,12,18,0.92)',
    border: '1.5px solid',
    borderRadius: 'var(--radius-md)',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  overlayHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pulseText: {
    fontFamily: 'var(--font-display)',
    fontWeight: 'bold',
    fontSize: '12px',
    letterSpacing: '0.1em',
    animation: 'pulse-glow 1.5s infinite ease-in-out',
  },
  resetBtn: {
    background: 'hsl(var(--bg-tertiary))',
    border: '1px solid hsl(var(--border-color))',
    color: 'hsl(var(--text-secondary))',
    padding: '4px 10px',
    fontSize: '9px',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontWeight: 'bold',
    letterSpacing: '0.05em',
    transition: 'all var(--transition-fast)',
  },
  overlayBody: {
    fontSize: '12px',
    color: 'hsl(var(--text-secondary))',
    lineHeight: '1.5',
    paddingLeft: 4,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '4.5fr 5.5fr',
    gap: 16,
  },
  portfolioPanel: {
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
  balanceSummary: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '8px 0',
  },
  totalLabel: {
    fontSize: '9px',
    color: 'hsl(var(--text-muted))',
    fontWeight: 'bold',
    letterSpacing: '0.05em',
  },
  totalValue: {
    fontSize: '28px',
    fontFamily: 'var(--font-display)',
    fontWeight: 'bold',
  },
  assetsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  assetCard: {
    background: 'rgba(255,255,255,0.01)',
    border: '1px solid rgba(255,255,255,0.03)',
    borderRadius: 'var(--radius-sm)',
    padding: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  assetHeader: {
    fontSize: '8px',
    color: 'hsl(var(--text-muted))',
    fontWeight: 'bold',
    letterSpacing: '0.05em',
  },
  assetVal: {
    fontSize: '12px',
    fontWeight: '600',
    fontFamily: 'var(--font-mono)',
  },
  assetUsd: {
    color: 'hsl(var(--text-muted))',
    fontWeight: 'normal',
    fontSize: '10px',
  },
  riskTelemetry: {
    borderTop: '1px dashed hsl(var(--border-color))',
    paddingTop: 12,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  telemetryItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  telemetryLabel: {
    fontSize: '8px',
    color: 'hsl(var(--text-muted))',
    fontWeight: 'bold',
  },
  telemetryVal: {
    fontSize: '12px',
    fontFamily: 'var(--font-display)',
    fontWeight: 'bold',
  },
  shockBtn: {
    padding: '8px 12px',
    fontSize: '10px',
    fontWeight: 'bold',
  },
  positionsPanel: {
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
  },
  tableWrapper: {
    flex: 1,
    overflowY: 'auto',
    maxHeight: 260,
  },
  emptyState: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    minHeight: 180,
    color: 'hsl(var(--text-muted))',
    fontSize: '10px',
    fontFamily: 'var(--font-mono)',
    border: '1px dashed rgba(255,255,255,0.03)',
    borderRadius: 'var(--radius-sm)',
    padding: 24,
    textAlign: 'center',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  theadRow: {
    borderBottom: '1px solid hsl(var(--border-color))',
  },
  th: {
    fontSize: '9px',
    fontWeight: 'bold',
    color: 'hsl(var(--text-muted))',
    padding: '8px 4px',
    letterSpacing: '0.05em',
  },
  tbodyRow: {
    borderBottom: '1px solid rgba(255,255,255,0.02)',
    transition: 'background var(--transition-fast)',
  },
  td: {
    padding: '8px 4px',
    fontSize: '11px',
    verticalAlign: 'middle',
  },
  tdMono: {
    padding: '8px 4px',
    fontSize: '11px',
    fontFamily: 'var(--font-mono)',
    verticalAlign: 'middle',
  },
  closeBtn: {
    padding: '4px 8px',
    fontSize: '9px',
    fontWeight: 'bold',
  }
};
