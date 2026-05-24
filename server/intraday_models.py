try:
    import numpy as np
    import pandas as pd
    MATH_AVAILABLE = True
except ImportError:
    MATH_AVAILABLE = False

from typing import List, Dict, Tuple

class IntradayQuantModels:
    """
    Core Mathematical Engine for Intraday Simulation & Analysis.
    Models: Monte Carlo, Mean Reversion, GARCH, Bayesian, Stochastic, Kalman.
    """

    @staticmethod
    def monte_carlo_simulation(current_price: float, volatility: float, drift: float, time_steps: int = 100, num_simulations: int = 1000) -> np.ndarray:
        """
        1. Monte Carlo Simulation (Geometric Brownian Motion)
        Returns an array of shape (num_simulations, time_steps)
        """
        dt = 1.0 / 252.0  # Daily time step assumption, can be adjusted for intraday
        
        # Calculate random shocks
        random_shocks = np.random.normal(0, 1, (num_simulations, time_steps))
        
        # Calculate price paths
        paths = np.zeros((num_simulations, time_steps + 1))
        paths[:, 0] = current_price
        
        for t in range(1, time_steps + 1):
            drift_term = (drift - 0.5 * volatility ** 2) * dt
            shock_term = volatility * np.sqrt(dt) * random_shocks[:, t-1]
            paths[:, t] = paths[:, t-1] * np.exp(drift_term + shock_term)
            
        return paths

    @staticmethod
    def mean_reversion_zscore(prices: np.ndarray, window: int = 20) -> np.ndarray:
        """
        2. Mean Reversion (Z-Score / Bollinger Band basis)
        Calculates the rolling Z-Score. Z > 2 indicates overbought (short signal), Z < -2 indicates oversold (long signal).
        """
        series = pd.Series(prices)
        rolling_mean = series.rolling(window=window).mean()
        rolling_std = series.rolling(window=window).std()
        
        z_scores = (series - rolling_mean) / rolling_std
        return z_scores.values

    @staticmethod
    def simple_garch_volatility(returns: np.ndarray, alpha: float = 0.1, beta: float = 0.8, omega: float = 0.0001) -> np.ndarray:
        """
        3. GARCH(1,1) - Simplified Volatility Clustering Model
        Forecasts variance using past variance and past squared returns.
        alpha + beta must be < 1 for stationarity.
        """
        n = len(returns)
        variances = np.zeros(n)
        
        # Initialize with sample variance
        variances[0] = np.var(returns)
        
        for t in range(1, n):
            variances[t] = omega + alpha * (returns[t-1] ** 2) + beta * variances[t-1]
            
        return np.sqrt(variances)  # Return conditional volatility

    @staticmethod
    def bayesian_trend_probability(prices: np.ndarray, prior_bull_prob: float = 0.5) -> np.ndarray:
        """
        4. Bayesian Probability of Trend State
        Updates probability of being in a Bull market based on sequential up/down ticks.
        """
        returns = np.diff(prices)
        returns = np.insert(returns, 0, 0) # align lengths
        
        probs = np.zeros(len(prices))
        probs[0] = prior_bull_prob
        
        # Assume conditional probabilities (Likelihoods)
        # P(UpTick | Bull) = 0.65, P(DownTick | Bull) = 0.35
        # P(UpTick | Bear) = 0.35, P(DownTick | Bear) = 0.65
        p_up_bull = 0.65
        p_up_bear = 0.35
        
        for t in range(1, len(prices)):
            prior = probs[t-1]
            if returns[t] > 0: # Up tick
                # Bayes Rule: P(Bull | Up) = P(Up | Bull) * P(Bull) / P(Up)
                evidence = (p_up_bull * prior) + (p_up_bear * (1 - prior))
                posterior = (p_up_bull * prior) / evidence if evidence > 0 else 0
            else: # Down tick
                p_down_bull = 1 - p_up_bull
                p_down_bear = 1 - p_up_bear
                evidence = (p_down_bull * prior) + (p_down_bear * (1 - prior))
                posterior = (p_down_bull * prior) / evidence if evidence > 0 else 0
                
            probs[t] = posterior
            
        return probs

    @staticmethod
    def stochastic_oscillator(highs: np.ndarray, lows: np.ndarray, closes: np.ndarray, k_window: int = 14, d_window: int = 3) -> Tuple[np.ndarray, np.ndarray]:
        """
        5. Stochastic Oscillator (%K and %D)
        Momentum indicator comparing close to high-low range over time.
        """
        df = pd.DataFrame({'high': highs, 'low': lows, 'close': closes})
        
        lowest_low = df['low'].rolling(window=k_window).min()
        highest_high = df['high'].rolling(window=k_window).max()
        
        # %K = (Current Close - Lowest Low)/(Highest High - Lowest Low) * 100
        k_percent = 100 * ((df['close'] - lowest_low) / (highest_high - lowest_low))
        
        # %D = SMA of %K
        d_percent = k_percent.rolling(window=d_window).mean()
        
        return k_percent.values, d_percent.values

    @staticmethod
    def kalman_filter_1d(prices: np.ndarray, process_variance: float = 1e-5, measurement_variance: float = 1e-3) -> np.ndarray:
        """
        6. 1D Kalman Filter (True Price Estimator)
        Reduces intraday noise to find the latent "true" price of the asset.
        """
        n = len(prices)
        estimates = np.zeros(n)
        error_covariances = np.zeros(n)
        
        # Initial guesses
        estimates[0] = prices[0]
        error_covariances[0] = 1.0
        
        for t in range(1, n):
            # Prediction Step
            pred_estimate = estimates[t-1]
            pred_error_cov = error_covariances[t-1] + process_variance
            
            # Measurement/Update Step
            kalman_gain = pred_error_cov / (pred_error_cov + measurement_variance)
            estimates[t] = pred_estimate + kalman_gain * (prices[t] - pred_estimate)
            error_covariances[t] = (1 - kalman_gain) * pred_error_cov
            
        return estimates
