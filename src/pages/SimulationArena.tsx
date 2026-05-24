import React, { useState, useEffect } from 'react';
import { MarketTerminal } from '../components/MarketTerminal';
import { MonteCarloVisualizer } from '../components/MonteCarloVisualizer';
import { StrategyLab } from '../components/StrategyLab';
import { AICopilot } from '../components/AICopilot';
import { RiskHUD } from '../components/RiskHUD';
import { WatchlistSidebar } from '../components/WatchlistSidebar';
import { useTradingStore } from '../store/useTradingStore';

type Tab = 'TERMINAL' | 'MONTE_CARLO' | 'STRATEGY_LAB';

export const SimulationArena: React.FC = () => {
  const { setTradingMode } = useTradingStore();
  const [activeTab, setActiveTab] = useState<Tab>('TERMINAL');
  const [systemTime, setSystemTime] = useState<string>(new Date().toLocaleTimeString());
  const [ping, setPing] = useState<number>(14);

  useEffect(() => {
    setTradingMode('SIMULATION');
  }, [setTradingMode]);

  // System time ticker & simulated ping flux
  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(new Date().toLocaleTimeString());
      setPing(Math.round(12 + Math.random() * 5));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={styles.appContainer} className="hud-grid scanline-effect">
      {/* Top Header */}
      <header style={styles.header}>
        <div onClick={() => window.location.href = '/'} style={{cursor: 'pointer', ...styles.logoGroup}}>
          <div style={styles.logoGlow}></div>
          <span style={styles.logoText} className="font-display glow-cyan">STOCHASTIC_TRADING</span>
          <span style={styles.logoVer}>SIMULATION-MODE</span>
        </div>

        {/* Navigation tabs */}
        <nav style={styles.nav}>
          <button
            onClick={() => setActiveTab('TERMINAL')}
            style={{
              ...styles.navTab,
              borderColor: activeTab === 'TERMINAL' ? 'hsl(var(--neon-cyan))' : 'transparent',
              color: activeTab === 'TERMINAL' ? 'hsl(var(--neon-cyan))' : 'hsl(var(--text-secondary))'
            }}
          >
            SIMULATED TERMINAL
          </button>
          <button
            onClick={() => setActiveTab('MONTE_CARLO')}
            style={{
              ...styles.navTab,
              borderColor: activeTab === 'MONTE_CARLO' ? 'hsl(var(--neon-purple))' : 'transparent',
              color: activeTab === 'MONTE_CARLO' ? 'hsl(var(--neon-purple))' : 'hsl(var(--text-secondary))'
            }}
          >
            MONTE CARLO ENGINE
          </button>
          <button
            onClick={() => setActiveTab('STRATEGY_LAB')}
            style={{
              ...styles.navTab,
              borderColor: activeTab === 'STRATEGY_LAB' ? 'hsl(var(--neon-emerald))' : 'transparent',
              color: activeTab === 'STRATEGY_LAB' ? 'hsl(var(--neon-emerald))' : 'hsl(var(--text-secondary))'
            }}
          >
            QUANT STRATEGY LAB
          </button>
        </nav>

        {/* Telemetry info */}
        <div style={styles.telemetry}>
          <div style={styles.telemetryItem}>
            <span style={styles.teleLabel}>QUANT ENGINE:</span>
            <span style={styles.teleVal} className="glow-emerald">SANDBOX</span>
          </div>
          <div style={styles.telemetryItem}>
            <span style={styles.teleLabel}>LATENCY:</span>
            <span style={styles.teleVal} className="font-mono">{ping}ms</span>
          </div>
          <div style={styles.telemetryItem}>
            <span style={styles.teleLabel}>UTC TIME:</span>
            <span style={styles.teleVal} className="font-mono">{systemTime}</span>
          </div>
        </div>
      </header>

      {/* Main Core Dashboard Grid */}
      <main style={styles.mainGrid}>
        {/* Watchlist Sidebar */}
        <div style={styles.sidebarCol}>
          <WatchlistSidebar />
        </div>

        {/* Active tab content in middle */}
        <div style={styles.leftCol}>
          {activeTab === 'TERMINAL' && <MarketTerminal />}
          {activeTab === 'MONTE_CARLO' && <MonteCarloVisualizer />}
          {activeTab === 'STRATEGY_LAB' && <StrategyLab />}
        </div>

        {/* Floating JARVIS assistant sidebar on right */}
        <div style={styles.rightCol}>
          <AICopilot />
        </div>
      </main>

      {/* Persistent stretched bottom Risk HUD */}
      <footer style={styles.footer}>
        <RiskHUD />
      </footer>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: 'hsl(var(--bg-primary))',
    color: 'hsl(var(--text-primary))',
    padding: 16,
    gap: 16,
    boxSizing: 'border-box',
    overflowX: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'hsl(var(--bg-secondary))',
    border: '1px solid hsl(var(--border-color))',
    borderRadius: 'var(--radius-md)',
    padding: '10px 20px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
  },
  logoGroup: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    position: 'relative',
  },
  logoGlow: {
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: 'hsl(var(--neon-cyan))',
    filter: 'blur(6px)',
    opacity: 0.8,
  },
  logoText: {
    fontSize: '18px',
    fontWeight: 900,
    letterSpacing: '0.08em',
    paddingLeft: 16,
  },
  logoVer: {
    fontSize: '9px',
    color: 'hsl(var(--neon-amber))',
    fontWeight: 'bold',
    fontFamily: 'var(--font-mono)',
  },
  nav: {
    display: 'flex',
    gap: 16,
  },
  navTab: {
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    letterSpacing: '0.05em',
    transition: 'all var(--transition-fast)',
  },
  telemetry: {
    display: 'flex',
    gap: 20,
  },
  telemetryItem: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
  },
  teleLabel: {
    fontSize: '9px',
    color: 'hsl(var(--text-muted))',
    fontWeight: 'bold',
    letterSpacing: '0.05em',
  },
  teleVal: {
    fontSize: '11px',
    fontWeight: 'bold',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '250px 1fr 300px',
    gap: 16,
    flex: 1,
  },
  sidebarCol: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    overflowX: 'hidden',
  },
  rightCol: {
    width: '100%',
    height: '100%',
  },
  footer: {
    width: '100%',
    marginTop: 'auto',
  }
};
