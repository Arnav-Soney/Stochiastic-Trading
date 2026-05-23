/**
 * Stochastic Trading Platform - Quantitative Math Engine
 * Contains pure algorithms for probability distributions, Monte Carlo paths, 
 * Stochastic Indicators, and Markov Market Regimes.
 */

// 1. Monte Carlo Paths Generator (Geometric Brownian Motion)
// dS = r * S * dt + sigma * S * dW_t
export interface MonteCarloPath {
  id: number;
  data: number[];
  reversalTime?: number;
}

export function generateMonteCarloPaths(
  startPrice: number,
  steps: number,
  numPaths: number,
  drift: number,       // Expected return rate (mu)
  volatility: number,  // Volatility rate (sigma)
  timeframeDays: number = 1
): MonteCarloPath[] {
  const paths: MonteCarloPath[] = [];
  const dt = timeframeDays / steps;

  for (let p = 0; p < numPaths; p++) {
    const pathData: number[] = [startPrice];
    let currentPrice = startPrice;

    for (let s = 1; s <= steps; s++) {
      // Box-Muller transform for normal random variable
      const u1 = Math.random() || 0.0001; // Avoid 0
      const u2 = Math.random();
      const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

      // GBM formula
      const exponent = (drift - 0.5 * Math.pow(volatility, 2)) * dt + volatility * Math.sqrt(dt) * z;
      currentPrice = currentPrice * Math.exp(exponent);
      pathData.push(Number(currentPrice.toFixed(2)));
    }

    paths.push({
      id: p,
      data: pathData
    });
  }

  return paths;
}

// 2. Normal Distribution Cumulative Probability & PDF
export function normalPDF(x: number, mean: number, stdDev: number): number {
  const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2));
  return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
}

// Calculates probability of price falling in a specific target zone
export function getProbabilityAtPrice(
  currentPrice: number,
  targetPrice: number,
  volatility: number,
  timeStepsAhead: number = 10
): number {
  const stdDev = currentPrice * volatility * Math.sqrt(timeStepsAhead / 365);
  const pdfVal = normalPDF(targetPrice, currentPrice, stdDev || 1);
  // Scale PDF value to a percentage for visual presentation
  const maxPdf = 1 / ((stdDev || 1) * Math.sqrt(2 * Math.PI));
  const probabilityPct = (pdfVal / maxPdf) * 100;
  return Math.min(Math.max(Math.round(probabilityPct), 2), 98);
}

// 3. Stochastic Oscillator Indicator (%K and %D)
export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StochasticOutput {
  k: number;
  d: number;
}

export function calculateStochastic(
  candles: Candle[],
  kPeriod: number = 14,
  dPeriod: number = 3
): StochasticOutput {
  if (candles.length < kPeriod + dPeriod) {
    return { k: 50, d: 50 };
  }

  const kValues: number[] = [];

  // Calculate %K for recent candles to fill %D period
  for (let i = candles.length - dPeriod; i < candles.length; i++) {
    const subset = candles.slice(i - kPeriod + 1, i + 1);
    if (subset.length < kPeriod) continue;

    const currentClose = subset[subset.length - 1].close;
    const lowestLow = Math.min(...subset.map(c => c.low));
    const highestHigh = Math.max(...subset.map(c => c.high));

    const denominator = highestHigh - lowestLow;
    const k = denominator === 0 ? 50 : ((currentClose - lowestLow) / denominator) * 100;
    kValues.push(k);
  }

  const currentK = kValues[kValues.length - 1] ?? 50;
  
  // Calculate %D (Simple Moving Average of %K values over dPeriod)
  const sumK = kValues.reduce((sum, val) => sum + val, 0);
  const currentD = kValues.length === 0 ? 50 : sumK / kValues.length;

  return {
    k: Math.round(currentK * 100) / 100,
    d: Math.round(currentD * 100) / 100
  };
}

// 4. Markov Regime Switching State Machine
export type MarketRegime = 'STABLE_BULL' | 'MEAN_REVERTING' | 'VOLATILE_BEAR' | 'LIQUIDITY_SHOCK';

export interface RegimeState {
  regime: MarketRegime;
  label: string;
  volatility: number;
  drift: number;
  description: string;
  probabilities: Record<MarketRegime, number>; // Transition Matrix
}

export const REGIMES: Record<MarketRegime, RegimeState> = {
  STABLE_BULL: {
    regime: 'STABLE_BULL',
    label: 'Low Volatility Stable Trend',
    volatility: 0.12,
    drift: 0.15,
    description: 'Steady capital inflows. High likelihood of support level retention.',
    probabilities: {
      STABLE_BULL: 0.85,
      MEAN_REVERTING: 0.10,
      VOLATILE_BEAR: 0.04,
      LIQUIDITY_SHOCK: 0.01
    }
  },
  MEAN_REVERTING: {
    regime: 'MEAN_REVERTING',
    label: 'Range-Bound / Oscillator Dominant',
    volatility: 0.18,
    drift: 0.02,
    description: 'Price alternating between overbought and oversold thresholds. High stochastic accuracy.',
    probabilities: {
      STABLE_BULL: 0.12,
      MEAN_REVERTING: 0.78,
      VOLATILE_BEAR: 0.08,
      LIQUIDITY_SHOCK: 0.02
    }
  },
  VOLATILE_BEAR: {
    regime: 'VOLATILE_BEAR',
    label: 'High Volatility Bear Market',
    volatility: 0.32,
    drift: -0.22,
    description: 'Systematic liquidations. Volatility expansion with persistent downward pressure.',
    probabilities: {
      STABLE_BULL: 0.03,
      MEAN_REVERTING: 0.12,
      VOLATILE_BEAR: 0.80,
      LIQUIDITY_SHOCK: 0.05
    }
  },
  LIQUIDITY_SHOCK: {
    regime: 'LIQUIDITY_SHOCK',
    label: 'Extreme Tail Event Risk',
    volatility: 0.55,
    drift: -0.45,
    description: 'Order book thinning, massive spreads. Highly stochastic behavior with fat-tailed distributions.',
    probabilities: {
      STABLE_BULL: 0.05,
      MEAN_REVERTING: 0.15,
      VOLATILE_BEAR: 0.30,
      LIQUIDITY_SHOCK: 0.50
    }
  }
};

// Returns next regime based on transition probability matrix
export function transitionRegime(currentRegime: MarketRegime): MarketRegime {
  const currentState = REGIMES[currentRegime];
  const rand = Math.random();
  let cumulativeProb = 0;

  for (const [state, prob] of Object.entries(currentState.probabilities)) {
    cumulativeProb += prob;
    if (rand <= cumulativeProb) {
      return state as MarketRegime;
    }
  }

  return currentRegime;
}
