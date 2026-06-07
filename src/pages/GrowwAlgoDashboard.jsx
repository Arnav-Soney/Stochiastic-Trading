import React, { useState, useEffect, useRef } from "react";

// ─── AI Analysis Caller (Mocked) ───
async function callClaudeForStrategy(strategyType) {
  await new Promise(resolve => setTimeout(resolve, 800));
  const isGood = Math.random() > 0.5;
  if (strategyType.includes("INTRADAY")) {
    return isGood 
      ? `BUY SIGNAL. VWAP crossover detected; momentum remains bullish.`
      : `HOLD. Fluctuating near VWAP. Wait for a clearer breakout.`;
  } else if (strategyType.includes("SHORT-TERM")) {
    return isGood
      ? `BUY. EMA crossover and positive MACD histogram.`
      : `SELL. Death cross detected. Suggest exiting long positions.`;
  } else {
    return isGood
      ? `BUY. Asset is in an uptrend and bounced off the lower Bollinger Band.`
      : `HOLD. Price action is sideways. No regime change detected.`;
  }
}

// ─── Mock live price ticker ───
function useLivePrices(symbols) {
  const [prices, setPrices] = useState(() =>
    Object.fromEntries(symbols.map((s) => [
        s,
        {
          ltp: (Math.random() * 3000 + 500).toFixed(2),
          change: (Math.random() * 4 - 2).toFixed(2),
        },
      ])
    )
  );
  useEffect(() => {
    const id = setInterval(() => {
      setPrices((prev) => {
        const next = { ...prev };
        symbols.forEach((s) => {
          const delta = (Math.random() - 0.498) * 5;
          const newLtp = Math.max(10, parseFloat(prev[s].ltp) + delta);
          next[s] = {
            ltp: newLtp.toFixed(2),
            change: (((newLtp - 1500) / 1500) * 100).toFixed(2),
          };
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [symbols]);
  return prices;
}

// ─── Candlestick Chart (Minimalistic) ───
function CandleChart({ candles, height = 60, themeColor = "#ffffff" }) {
  if (!candles.length) return null;
  const w = 400, h = height;
  const min = Math.min(...candles.map((c) => c.low));
  const max = Math.max(...candles.map((c) => c.high));
  const range = max - min || 1;
  const cw = w / candles.length;
  const scaleY = (v) => h - ((v - min) / range) * h;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      {candles.map((c, i) => {
        const x = i * cw + cw / 2;
        const isUp = c.close >= c.open;
        const color = isUp ? themeColor : "#444444";
        const bodyTop = scaleY(Math.max(c.open, c.close));
        const bodyH = Math.abs(scaleY(c.open) - scaleY(c.close)) || 1;
        return (
          <g key={i}>
            <line x1={x} y1={scaleY(c.high)} x2={x} y2={scaleY(c.low)} stroke={color} strokeWidth="2" opacity="0.3" />
            <rect x={x - cw * 0.3} y={bodyTop} width={cw * 0.6} height={bodyH} fill={color} rx="2" />
          </g>
        );
      })}
    </svg>
  );
}

// ─── 3D Tilt Card Component ───
function TiltCard({ children, active, glowColor = "#ffffff" }) {
  const cardRef = useRef(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left; 
    const y = e.clientY - rect.top; 
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -8; // Max rotation 8deg
    const rotateY = ((x - centerX) / centerX) * 8;
    
    setRotation({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotation({ x: 0, y: 0 });
  };

  return (
    <div className="card-wrapper" style={{ perspective: "1000px" }}>
      <div
        ref={cardRef}
        className={`tilt-card ${active ? "active-card" : ""}`}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: isHovered 
            ? `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale3d(1.02, 1.02, 1.02)` 
            : "rotateX(0) rotateY(0) scale3d(1, 1, 1)",
          transition: isHovered ? "none" : "all 0.5s cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        <div className="card-content">
          {children}
        </div>
        {isHovered && (
          <div 
            className="glow-effect"
            style={{
              transform: `translate(${rotation.y * 3}px, ${-rotation.x * 3}px)`,
              background: `radial-gradient(circle at 50% 50%, ${glowColor}25 0%, transparent 60%)`
            }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Strategy Card ───
function StrategyCard({ strategy, prices, candles }) {
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const priceData = prices[strategy.symbol] || {};

  const runAnalysis = async () => {
    setLoading(true);
    const res = await callClaudeForStrategy(strategy.type);
    setAnalysis(res);
    setLoading(false);
  };

  const isPositive = parseFloat(priceData.change) >= 0;

  return (
    <TiltCard active={!!analysis} glowColor={strategy.color}>
      <div className="card-header">
        <div className="card-title">
          {strategy.name}
        </div>
        <div className="card-badge" style={{ color: strategy.color, borderColor: `${strategy.color}40`, backgroundColor: `${strategy.color}10` }}>{strategy.type}</div>
      </div>

      <div className="price-row">
        <span className="symbol-tag">{strategy.symbol}</span>
        <span className="ltp">₹{priceData.ltp}</span>
        <span className={`chg ${isPositive ? "up" : "dn"}`}>
          {isPositive ? "+" : ""}{priceData.change}%
        </span>
      </div>

      <div className="mini-chart">
        <CandleChart candles={candles} themeColor={strategy.color} />
      </div>

      <div className="params-row">
        {Object.entries(strategy.params).map(([k, v]) => (
          <div key={k} className="param-item">
            <span className="pk">{k}</span>
            <span className="pv">{v}</span>
          </div>
        ))}
      </div>

      <button className="analyze-btn" onClick={runAnalysis} disabled={loading}>
        {loading ? "Analysing..." : "Run AI Analysis"}
      </button>

      {analysis && (
        <div className="analysis-box">
          {analysis}
        </div>
      )}
    </TiltCard>
  );
}

// ─── MAIN APP ───
const STRATEGIES = [
  {
    id: 1, name: "VWAP Scalper", type: "INTRADAY", symbol: "RELIANCE", color: "#00e676",
    params: { "Product": "MIS", "SL%": "0.5", "TP%": "1.0", "RSI<": "60" },
  },
  {
    id: 2, name: "EMA Crossover", type: "SHORT-TERM", symbol: "TCS", color: "#2196f3",
    params: { "EMA Fast": "9", "EMA Slow": "21", "MACD": "On", "ATR SL": "2x" },
  },
  {
    id: 3, name: "SMA200 Trend", type: "LONG-TERM", symbol: "HDFCBANK", color: "#ffd740",
    params: { "SMA": "200", "BB Period": "20", "BB Std": "2.0", "Product": "CNC" },
  },
  {
    id: 4, name: "F&O Momentum", type: "INTRADAY", symbol: "NIFTY", color: "#ff5252",
    params: { "Segment": "FNO", "BB Bounce": "Yes", "RSI<": "65", "ATR": "1.5x" },
  },
  {
    id: 5, name: "Breakout Hunter", type: "SHORT-TERM", symbol: "INFY", color: "#9c27b0",
    params: { "SMA20": "Yes", "Vol x": "2.5", "ATR TP": "4x", "Seg": "CASH" },
  },
  {
    id: 6, name: "Value Accumulator", type: "LONG-TERM", symbol: "WIPRO", color: "#00e5ff",
    params: { "SMA200": "Yes", "RSI<": "40", "Dip%": "5", "CNC": "Yes" },
  },
];

function generateCandles(n = 30) {
  const out = [];
  let price = 500 + Math.random() * 2000;
  for (let i = 0; i < n; i++) {
    const o = price;
    const h = o + Math.random() * 20;
    const l = o - Math.random() * 20;
    const c = l + Math.random() * (h - l);
    out.push({ open: o, high: h, low: l, close: c });
    price = c;
  }
  return out;
}

export default function GrowwAlgoDashboard() {
  const symbols = [...new Set(STRATEGIES.map((s) => s.symbol))];
  const prices = useLivePrices(symbols);
  const [candleMap] = useState(() => Object.fromEntries(symbols.map((s) => [s, generateCandles()])));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');

        :root {
          --bg: #050505;
          --surface: #0f0f0f;
          --border: #222222;
          --text-main: #ffffff;
          --text-muted: #888888;
        }

        .algo-dashboard {
          background-color: var(--bg);
          color: var(--text-main);
          font-family: 'Inter', sans-serif;
          min-height: 100vh;
          padding: 6rem 2rem;
          overflow-x: hidden;
        }

        .dash-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .header {
          margin-bottom: 4rem;
          text-align: left;
        }

        .header h1 {
          font-size: 2.5rem;
          font-weight: 300;
          letter-spacing: -0.03em;
          margin-bottom: 0.5rem;
        }

        .header p {
          color: var(--text-muted);
          font-weight: 300;
          font-size: 1rem;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 2rem;
        }

        .card-wrapper {
          width: 100%;
          height: 100%;
        }

        .tilt-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          position: relative;
          transform-style: preserve-3d;
          height: 100%;
          overflow: hidden;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
        }

        .tilt-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%);
          pointer-events: none;
        }

        .active-card {
          border-color: #555;
          box-shadow: 0 0 20px rgba(255,255,255,0.03);
        }

        .card-content {
          padding: 2rem;
          transform: translateZ(40px);
          display: flex;
          flex-direction: column;
          height: 100%;
          position: relative;
          z-index: 2;
        }

        .glow-effect {
          position: absolute;
          width: 100%;
          height: 100%;
          left: 0;
          top: 0;
          pointer-events: none;
          z-index: 1;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .card-title {
          font-size: 1.1rem;
          font-weight: 500;
          letter-spacing: -0.01em;
        }

        .card-badge {
          font-size: 0.65rem;
          padding: 0.3rem 0.6rem;
          border-radius: 4px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: var(--text-muted);
          letter-spacing: 0.05em;
        }

        .price-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .symbol-tag {
          font-size: 0.8rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .ltp {
          font-size: 2rem;
          font-weight: 300;
          letter-spacing: -0.02em;
          margin-left: auto;
        }

        .chg {
          font-size: 0.85rem;
          font-weight: 400;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          background: rgba(255,255,255,0.05);
        }

        .chg.up { color: #cccccc; }
        .chg.dn { color: #666666; }

        .mini-chart {
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid var(--border);
        }

        .params-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.8rem;
          margin-bottom: 2rem;
        }

        .param-item {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .pk {
          font-size: 0.65rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .pv {
          font-size: 0.85rem;
          font-weight: 400;
          color: #eeeeee;
        }

        .analyze-btn {
          margin-top: auto;
          width: 100%;
          padding: 0.9rem;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-main);
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.02em;
        }

        .analyze-btn:hover:not(:disabled) {
          background: #ffffff;
          color: #000000;
        }

        .analyze-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .analysis-box {
          margin-top: 1.5rem;
          padding: 1rem;
          background: rgba(255,255,255,0.02);
          border-radius: 6px;
          border: 1px solid var(--border);
          font-size: 0.8rem;
          color: var(--text-muted);
          line-height: 1.5;
          animation: fade 0.3s ease;
        }

        @keyframes fade {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="algo-dashboard">
        <div className="dash-container">
          <header className="header">
            <h1>Algorithmic Models</h1>
            <p>Institutional-grade quantitative strategies. Clean. Fast. Precise.</p>
          </header>
          
          <main className="grid">
            {STRATEGIES.map((s) => (
              <StrategyCard
                key={s.id}
                strategy={s}
                prices={prices}
                candles={candleMap[s.symbol] || []}
              />
            ))}
          </main>
        </div>
      </div>
    </>
  );
}
