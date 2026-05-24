import React, { useState, useEffect } from 'react';
import { MarketTerminal } from '../components/MarketTerminal';
import { WatchlistSidebar } from '../components/WatchlistSidebar';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';
import { useTradingStore } from '../store/useTradingStore';

export const LiveArena: React.FC = () => {
  const { setTradingMode, selectedAsset, prices } = useTradingStore();
  const [systemTime, setSystemTime] = useState<string>(new Date().toLocaleTimeString());
  const [ping, setPing] = useState<number>(14);

  useEffect(() => {
    setTradingMode('LIVE');
  }, [setTradingMode]);

  // System time ticker & simulated ping flux
  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(new Date().toLocaleTimeString());
      setPing(Math.round(2 + Math.random() * 5)); // Lower ping for LIVE mode
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={styles.appContainer} className="hud-grid scanline-effect">
      {/* Top Header */}
      <header style={styles.header}>
        <div onClick={() => window.location.href = '/'} style={{cursor: 'pointer', ...styles.logoGroup}}>
          <div style={{...styles.logoGlow, backgroundColor: 'hsl(var(--neon-crimson))'}}></div>
          <span style={styles.logoText} className="font-display text-white">STOCHASTIC_TRADING</span>
          <span style={styles.logoVer} className="text-neonCrimson">LIVE-PRODUCTION</span>
        </div>

        {/* Global Search Bar & Current Price */}
        <div style={styles.searchContainer} className="flex gap-4 items-center justify-center w-full">
          <LiveSearchBar />
          <div className="flex items-center gap-3 px-4 py-2 bg-bgSecondary border border-white/10 rounded-md shadow-[0_0_15px_rgba(0,242,254,0.1)]">
             <span className="font-bold text-white tracking-widest text-sm">{selectedAsset}</span>
             <span className="text-neonCyan font-mono font-bold">
               {prices[selectedAsset] ? `₹${prices[selectedAsset].toLocaleString()}` : 'LOADING...'}
             </span>
          </div>
        </div>

        {/* Telemetry info */}
        <div style={styles.telemetry}>
          <div style={styles.telemetryItem}>
            <span style={styles.teleLabel}>QUANT ENGINE:</span>
            <span style={styles.teleVal} className="text-neonCrimson">LIVE EXECUTION</span>
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
          <MarketTerminal />
        </div>

        {/* Top Movers Sidebar on right */}
        <div style={styles.rightCol}>
          <TopMoversSidebar />
        </div>
      </main>
    </div>
  );
};

const LiveSearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const { setSelectedAsset } = useTradingStore();

  useEffect(() => {
    if (query.length > 1) {
      // Hit our backend search endpoint
      fetch(`http://localhost:8000/api/groww/search?q=${query}`)
        .then(res => res.json())
        .then(data => {
          if(data.status === 'success') {
            setResults(data.results);
          }
        })
        .catch(err => console.error(err));
    } else {
      setResults([]);
    }
  }, [query]);

  return (
    <div className="relative w-96 z-50">
      <div className="flex items-center bg-bgSecondary border border-white/10 rounded-md px-3 py-2 focus-within:border-neonCrimson/50 transition-colors">
        <Search size={16} className="text-gray-400 mr-2" />
        <input 
          type="text"
          placeholder="Search 170,000+ Indian Instruments..."
          className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-gray-600"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
        />
      </div>
      
      {isFocused && results.length > 0 && (
        <div className="absolute top-full left-0 w-full mt-2 bg-bgDark border border-white/10 rounded-md shadow-2xl max-h-64 overflow-y-auto custom-scrollbar">
          {results.map(sym => (
            <div 
              key={sym} 
              className="px-4 py-2 hover:bg-white/5 cursor-pointer text-sm transition-colors border-b border-white/5 last:border-none"
              onClick={() => {
                setSelectedAsset(sym);
                setQuery('');
                setIsFocused(false);
              }}
            >
              {sym}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const TopMoversSidebar = () => {
  const [gainers, setGainers] = useState<{symbol: string, change_pct: number}[]>([]);
  const [losers, setLosers] = useState<{symbol: string, change_pct: number}[]>([]);
  const { setSelectedAsset } = useTradingStore();

  useEffect(() => {
    // Poll the backend movers endpoint
    const fetchMovers = () => {
      fetch(`http://localhost:8000/api/groww/movers`)
        .then(res => res.json())
        .then(data => {
          if(data.status === 'success') {
            setGainers(data.gainers);
            setLosers(data.losers);
          }
        })
        .catch(err => console.error(err));
    };

    fetchMovers();
    const int = setInterval(fetchMovers, 15000);
    return () => clearInterval(int);
  }, []);

  return (
    <div className="cyber-panel h-full flex flex-col p-4 w-full bg-bgDark">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-neonEmerald mb-4 pb-2 border-b border-white/5">
          <TrendingUp size={18} />
          <h2 className="font-orbitron font-bold text-sm tracking-widest">TOP GAINERS (NIFTY50)</h2>
        </div>
        <div className="space-y-2">
          {gainers.map(g => (
            <div 
              key={g.symbol} 
              onClick={() => setSelectedAsset(g.symbol)}
              className="flex justify-between items-center p-2 bg-white/5 hover:bg-white/10 rounded cursor-pointer transition-colors border border-transparent hover:border-neonEmerald/30"
            >
              <span className="font-bold text-xs">{g.symbol}</span>
              <span className="text-neonEmerald text-xs font-mono">+{g.change_pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 text-neonCrimson mb-4 pb-2 border-b border-white/5">
          <TrendingDown size={18} />
          <h2 className="font-orbitron font-bold text-sm tracking-widest">TOP LOSERS (NIFTY50)</h2>
        </div>
        <div className="space-y-2">
          {losers.map(l => (
            <div 
              key={l.symbol} 
              onClick={() => setSelectedAsset(l.symbol)}
              className="flex justify-between items-center p-2 bg-white/5 hover:bg-white/10 rounded cursor-pointer transition-colors border border-transparent hover:border-neonCrimson/30"
            >
              <span className="font-bold text-xs">{l.symbol}</span>
              <span className="text-neonCrimson text-xs font-mono">{l.change_pct}%</span>
            </div>
          ))}
        </div>
      </div>
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
    fontWeight: 'bold',
    fontFamily: 'var(--font-mono)',
  },
  searchContainer: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center'
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
  }
};
