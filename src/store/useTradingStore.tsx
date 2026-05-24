import React, { createContext, useContext, useState, useEffect, useRef, useLayoutEffect } from 'react';
import { REGIMES, transitionRegime, calculateStochastic } from '../utils/mathEngine';
import type { Candle, MarketRegime } from '../utils/mathEngine';

// Interfaces for our store
export interface Position {
  id: string;
  asset: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  currentPrice: number;
  size: number; // in asset units
  margin: number; // USD exposure
  pnl: number;
  timestamp: string;
}

export interface TradeHistoryItem {
  id: string;
  asset: string;
  type: 'BUY' | 'SELL';
  price: number;
  size: number;
  pnl: number;
  timestamp: string;
}

export interface Wallet {
  usd: number;
  btc: number;
  eth: number;
  sol: number;
}

export interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

export interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

export interface EmotionalMetrics {
  consecutiveLosses: number;
  tradeSpeedTimes: number[]; // timestamps of recent trades
  overExposureAlert: boolean;
  revengeTradingAlert: boolean;
  panicClosingAlert: boolean;
}

interface TradingContextProps {
  wallet: Wallet;
  prices: Record<string, number>;
  candles: Record<string, Candle[]>;
  stochastic: Record<string, { k: number; d: number }>;
  orderBook: Record<string, OrderBook>;
  positions: Position[];
  history: TradeHistoryItem[];
  currentRegime: MarketRegime;
  selectedAsset: string;
  setSelectedAsset: (asset: string) => void;
  placeOrder: (asset: string, type: 'BUY' | 'SELL', amountUSD: number) => void;
  closePosition: (id: string) => void;
  emotionalMetrics: EmotionalMetrics;
  clearEmotionalAlerts: () => void;
  probabilities: {
    breakout: number;
    reversal: number;
    liquidation: number;
  };
  triggerMarketShock: () => void;
  tradingMode: 'SIMULATION' | 'LIVE';
  setTradingMode: (mode: 'SIMULATION' | 'LIVE') => void;
  liveAssets: string[];
}

const TradingContext = createContext<TradingContextProps | undefined>(undefined);

// Generate dummy initial candles
function generateInitialCandles(startPrice: number, count: number): Candle[] {
  const candles: Candle[] = [];
  let price = startPrice;
  const now = new Date();

  for (let i = count; i > 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 1000).toISOString();
    const change = price * (Math.random() - 0.5) * 0.008;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + price * Math.random() * 0.004;
    const low = Math.min(open, close) - price * Math.random() * 0.004;
    const volume = Math.round(50 + Math.random() * 500);

    candles.push({ time, open, high, low, close, volume });
    price = close;
  }
  return candles;
}

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedAsset, setSelectedAsset] = useState<string>('BTC');
  const [currentRegime, setCurrentRegime] = useState<MarketRegime>('STABLE_BULL');
  const regimeRef = useRef<MarketRegime>('STABLE_BULL');
  const [tradingModeState, setTradingModeState] = useState<'SIMULATION' | 'LIVE'>('SIMULATION');
  const [liveAssets] = useState<string[]>(['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'IDEA', 'ZOMATO']);

  const tradingMode = tradingModeState;
  const setTradingMode = (mode: 'SIMULATION' | 'LIVE') => {
    setTradingModeState(mode);
    if (mode === 'LIVE' && ['BTC', 'ETH', 'SOL'].includes(selectedAsset)) {
      setSelectedAsset('RELIANCE');
    }
    if (mode === 'SIMULATION' && liveAssets.includes(selectedAsset)) {
      setSelectedAsset('BTC');
    }
  };

  // Wallet
  const [wallet, setWallet] = useState<Wallet>({
    usd: 100000,
    btc: 0.5,
    eth: 4.2,
    sol: 85
  });

  // Real-time Prices
  const [prices, setPrices] = useState<Record<string, number>>({
    BTC: 64250,
    ETH: 3450,
    SOL: 145
  });

  // Historical Candles for Indicators
  const [candles, setCandles] = useState<Record<string, Candle[]>>({
    BTC: generateInitialCandles(64200, 50),
    ETH: generateInitialCandles(3440, 50),
    SOL: generateInitialCandles(142, 50)
  });

  // Indicator outputs
  const [stochastic, setStochastic] = useState<Record<string, { k: number; d: number }>>({
    BTC: { k: 50, d: 50 },
    ETH: { k: 50, d: 50 },
    SOL: { k: 50, d: 50 }
  });

  // Positions and History
  const [positions, setPositions] = useState<Position[]>([]);
  const [history, setHistory] = useState<TradeHistoryItem[]>([]);

  // Order book
  const [orderBook, setOrderBook] = useState<Record<string, OrderBook>>({
    BTC: { bids: [], asks: [] },
    ETH: { bids: [], asks: [] },
    SOL: { bids: [], asks: [] }
  });

  // Probabilities engine outputs
  const [probabilities, setProbabilities] = useState({
    breakout: 68,
    reversal: 42,
    liquidation: 12
  });

  // Emotional AI Tracker States
  const [emotionalMetrics, setEmotionalMetrics] = useState<EmotionalMetrics>({
    consecutiveLosses: 0,
    tradeSpeedTimes: [],
    overExposureAlert: false,
    revengeTradingAlert: false,
    panicClosingAlert: false
  });

  // Ref to access state inside setInterval accurately
  const stateRef = useRef({ prices, candles, wallet, positions, emotionalMetrics, stochastic, tradingMode });
  useLayoutEffect(() => {
    stateRef.current = { prices, candles, wallet, positions, emotionalMetrics, stochastic, tradingMode };
  });

  // Trigger Market Regime transitions periodically (every 40 seconds)
  useEffect(() => {
    const transitionInterval = setInterval(() => {
      const nextRegime = transitionRegime(regimeRef.current);
      if (nextRegime !== regimeRef.current) {
        regimeRef.current = nextRegime;
        setCurrentRegime(nextRegime);
      }
    }, 40000);

    return () => clearInterval(transitionInterval);
  }, []);

  // Real-time market tick generator simulation (Vite WebSocket effect simulation)
  useEffect(() => {
    const tickInterval = setInterval(() => {
      if (stateRef.current.tradingMode === 'LIVE') return; // Skip simulation if live

      const activeRegime = REGIMES[regimeRef.current];
      const assets = ['BTC', 'ETH', 'SOL'];
      const updatedPrices = { ...stateRef.current.prices };
      const updatedCandles = { ...stateRef.current.candles };
      const updatedStoch = { ...stateRef.current.stochastic };
      const updatedBooks: Record<string, OrderBook> = {};

      assets.forEach(asset => {
        const currentPrice = stateRef.current.prices[asset];
        
        // Dynamic tick calculation based on Markov Regime volatility/drift
        const randomU1 = Math.random() || 0.0001;
        const randomU2 = Math.random();
        const z = Math.sqrt(-2.0 * Math.log(randomU1)) * Math.cos(2.0 * Math.PI * randomU2);
        
        const dt = 1 / 300; // Fast ticks
        const priceChangePct = (activeRegime.drift * dt) + (activeRegime.volatility * Math.sqrt(dt) * z);
        const finalPrice = Math.max(1, currentPrice * (1 + priceChangePct));
        
        updatedPrices[asset] = Number(finalPrice.toFixed(2));

        // Update Candles (simulate new tick in recent bar or create new bar)
        const assetCandles = [...updatedCandles[asset]];
        const lastCandleIndex = assetCandles.length - 1;
        const lastCandle = assetCandles[lastCandleIndex];
        
        // Add new candle every 30 ticks (simulating 10s bars for high interactivity)
        const isNewBar = Math.random() < 0.05;

        if (isNewBar && lastCandle) {
          const newTime = new Date().toISOString();
          assetCandles.push({
            time: newTime,
            open: lastCandle.close,
            high: lastCandle.close,
            low: lastCandle.close,
            close: finalPrice,
            volume: Math.round(10 + Math.random() * 100)
          });
          if (assetCandles.length > 60) assetCandles.shift();
        } else if (lastCandle) {
          lastCandle.close = finalPrice;
          if (finalPrice > lastCandle.high) lastCandle.high = finalPrice;
          if (finalPrice < lastCandle.low) lastCandle.low = finalPrice;
          lastCandle.volume += Math.round(Math.random() * 2);
          assetCandles[lastCandleIndex] = { ...lastCandle };
        }

        updatedCandles[asset] = assetCandles;

        // Recalculate Stochastic Oscillator values
        updatedStoch[asset] = calculateStochastic(assetCandles);

        // Generate Order Book Depth showing real spreads
        const spread = currentPrice * (activeRegime.regime === 'LIQUIDITY_SHOCK' ? 0.005 : 0.0005);
        const bids: OrderBookEntry[] = [];
        const asks: OrderBookEntry[] = [];
        
        let bidTotal = 0;
        let askTotal = 0;

        for (let i = 1; i <= 8; i++) {
          const bidPrice = Number((finalPrice - spread - (i * spread * 0.5)).toFixed(2));
          const askPrice = Number((finalPrice + spread + (i * spread * 0.5)).toFixed(2));
          
          const bidSize = (5000 / bidPrice) * (0.5 + Math.random() * 2);
          const askSize = (5000 / askPrice) * (0.5 + Math.random() * 2);

          bidTotal += bidSize;
          askTotal += askSize;

          bids.push({ price: bidPrice, size: Number(bidSize.toFixed(4)), total: Number(bidTotal.toFixed(4)) });
          asks.push({ price: askPrice, size: Number(askSize.toFixed(4)), total: Number(askTotal.toFixed(4)) });
        }

        updatedBooks[asset] = { bids, asks };
      });

      setPrices(updatedPrices);
      setCandles(updatedCandles);
      setStochastic(updatedStoch);
      setOrderBook(updatedBooks);

      // Recalculate Open Positions PnL
      setPositions(prev =>
        prev.map(pos => {
          const currentPrice = updatedPrices[pos.asset];
          const priceDiff = currentPrice - pos.entryPrice;
          const pnl = pos.type === 'BUY' 
            ? priceDiff * pos.size 
            : -priceDiff * pos.size;
          return {
            ...pos,
            currentPrice,
            pnl: Number(pnl.toFixed(2))
          };
        })
      );

      // Update Probability engine statistics based on active Stochastic metrics
      const activeStoch = updatedStoch[selectedAsset];
      const vol = activeRegime.volatility;
      
      const pBreakout = Math.round(Math.min(95, Math.max(10, activeStoch.k * 0.8 + (vol * 50))));
      const pReversal = Math.round(Math.min(92, Math.max(5, (100 - activeStoch.k) * 0.7 + (vol * 30))));
      const pLiquidation = activeRegime.regime === 'LIQUIDITY_SHOCK' ? 55 : Math.round(10 + Math.random() * 8);

      setProbabilities({
        breakout: pBreakout,
        reversal: pReversal,
        liquidation: pLiquidation
      });

    }, 300);

    return () => clearInterval(tickInterval);
  }, [selectedAsset]);

  // Live Mode Polling Engine
  useEffect(() => {
    if (tradingMode !== 'LIVE') return;
    
    const fetchLivePrice = async () => {
      try {
        // In a real app we might fetch all assets, here we fetch the selected one for HFT
        const res = await fetch(`http://localhost:8000/api/groww/market-data/${selectedAsset}`);
        if (!res.ok) return;
        const data = await res.json();
        
        if (data.status === 'success') {
           setPrices(prev => ({ ...prev, [selectedAsset]: data.price }));
           
           // Generate a dummy candle tick based on live price to keep charts moving
           setCandles(prev => {
             const assetCandles = prev[selectedAsset] || generateInitialCandles(data.price, 50);
             const lastCandleIndex = assetCandles.length - 1;
             const lastCandle = assetCandles[lastCandleIndex];
             
             if (lastCandle) {
               lastCandle.close = data.price;
               if (data.price > lastCandle.high) lastCandle.high = data.price;
               if (data.price < lastCandle.low) lastCandle.low = data.price;
               assetCandles[lastCandleIndex] = { ...lastCandle };
             }
             return { ...prev, [selectedAsset]: [...assetCandles] };
           });
           
           // Recalculate PnL
           setPositions(prev =>
             prev.map(pos => {
               const currentPrice = pos.asset === selectedAsset ? data.price : pos.currentPrice;
               const priceDiff = currentPrice - pos.entryPrice;
               const pnl = pos.type === 'BUY' ? priceDiff * pos.size : -priceDiff * pos.size;
               return { ...pos, currentPrice, pnl: Number(pnl.toFixed(2)) };
             })
           );
        }
      } catch (e) {
        console.error("Live polling error", e);
      }
    };

    fetchLivePrice();
    const pollInterval = setInterval(fetchLivePrice, 3000); // 3-second REST API polling
    return () => clearInterval(pollInterval);
  }, [tradingMode, selectedAsset]);

  // Order execution engine
  const placeOrder = async (asset: string, type: 'BUY' | 'SELL', amountUSD: number) => {
    const currentPrice = prices[asset];
    if (wallet.usd < amountUSD) {
      alert('Insufficient USD balance in simulated paper trading wallet.');
      return;
    }

    // Check exposure for overexposure emotional alert (> 25% of total portfolio in one trade)
    const portfolioValue = wallet.usd + (wallet.btc * prices.BTC) + (wallet.eth * prices.ETH) + (wallet.sol * prices.SOL);
    const exposurePct = amountUSD / portfolioValue;
    let overExposure = false;
    if (exposurePct > 0.25) {
      overExposure = true;
    }

    // Check trade speed (more than 3 trades within 10 seconds triggers revenge trading check)
    const now = Date.now();
    const recentTrades = stateRef.current.emotionalMetrics.tradeSpeedTimes.filter(t => now - t < 10000);
    const updatedTradeSpeedTimes = [...recentTrades, now];
    const isRevenge = updatedTradeSpeedTimes.length >= 3;

    // Deduct margin from wallet
    setWallet(prev => ({
      ...prev,
      usd: Number((prev.usd - amountUSD).toFixed(2))
    }));

    const size = amountUSD / currentPrice;

    if (tradingMode === 'LIVE') {
      try {
        const response = await fetch('http://localhost:8000/api/groww/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ asset, type, size, price: currentPrice })
        });
        const result = await response.json();
        
        if (!response.ok) {
          alert('Groww Live Order Failed: ' + (result.detail || 'Unknown error'));
          return; 
        }
        console.log('Groww order success:', result);
        alert(`LIVE ORDER PLACED ON GROWW!\n\nID: ${result.order_id}\nDetails: ${result.message}`);
      } catch {
        alert('Failed to connect to Groww Backend Proxy. Make sure the python server is running on port 8000.');
        return; 
      }
    }

    const newPosition: Position = {
      id: Math.random().toString(36).substring(2, 9),
      asset,
      type,
      entryPrice: currentPrice,
      currentPrice,
      size,
      margin: amountUSD,
      pnl: 0,
      timestamp: new Date().toLocaleTimeString()
    };

    setPositions(prev => [newPosition, ...prev]);

    // Update Emotional metrics
    setEmotionalMetrics(prev => ({
      ...prev,
      tradeSpeedTimes: updatedTradeSpeedTimes,
      overExposureAlert: overExposure || prev.overExposureAlert,
      revengeTradingAlert: isRevenge || prev.revengeTradingAlert
    }));
  };

  // Close position and settle PnL
  const closePosition = (id: string) => {
    const pos = positions.find(p => p.id === id);
    if (!pos) return;

    const settledPnL = pos.pnl;
    

    // Settle wallet
    setWallet(prev => {
      const returnUSD = pos.margin + settledPnL;
      return {
        ...prev,
        usd: Number(Math.max(0, prev.usd + returnUSD).toFixed(2))
      };
    });

    // Save to history
    const historyItem: TradeHistoryItem = {
      id: pos.id,
      asset: pos.asset,
      type: pos.type,
      price: pos.currentPrice,
      size: pos.size,
      pnl: settledPnL,
      timestamp: new Date().toLocaleTimeString()
    };

    setHistory(prev => [historyItem, ...prev]);
    setPositions(prev => prev.filter(p => p.id !== id));

    // Update consecutive losses
    setEmotionalMetrics(prev => {
      const newConsecutiveLosses = settledPnL < 0 ? prev.consecutiveLosses + 1 : 0;
      const revengeAlert = newConsecutiveLosses >= 3;

      return {
        ...prev,
        consecutiveLosses: newConsecutiveLosses,
        revengeTradingAlert: revengeAlert || prev.revengeTradingAlert,
        panicClosingAlert: prev.panicClosingAlert
      };
    });
  };

  const clearEmotionalAlerts = () => {
    setEmotionalMetrics({
      consecutiveLosses: 0,
      tradeSpeedTimes: [],
      overExposureAlert: false,
      revengeTradingAlert: false,
      panicClosingAlert: false
    });
  };

  const triggerMarketShock = () => {
    regimeRef.current = 'LIQUIDITY_SHOCK';
    setCurrentRegime('LIQUIDITY_SHOCK');
  };

  return (
    <TradingContext.Provider value={{
      wallet,
      prices,
      candles,
      stochastic,
      orderBook,
      positions,
      history,
      currentRegime,
      selectedAsset,
      setSelectedAsset,
      placeOrder,
      closePosition,
      emotionalMetrics,
      clearEmotionalAlerts,
      probabilities,
      triggerMarketShock,
      tradingMode,
      setTradingMode,
      liveAssets
    }}>
      {children}
    </TradingContext.Provider>
  );
};

export const useTradingStore = () => {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTradingStore must be used within a TradingProvider');
  }
  return context;
};
