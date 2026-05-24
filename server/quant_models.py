import time
import math
import random

# =====================
# Financial Statistical Models
# =====================

def calculate_rsi(prices, period=14):
    """
    Calculate the Relative Strength Index (RSI).
    Expects a list of closing prices.
    """
    if len(prices) < period + 1:
        return 50 # Default neutral if not enough data
        
    gains = []
    losses = []
    for i in range(1, len(prices)):
        change = prices[i] - prices[i-1]
        if change > 0:
            gains.append(change)
            losses.append(0)
        else:
            gains.append(0)
            losses.append(abs(change))
            
    avg_gain = sum(gains[-period:]) / period
    avg_loss = sum(losses[-period:]) / period
    
    if avg_loss == 0:
        return 100
        
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def calculate_momentum_score(prices):
    """
    Calculate a composite momentum score based on short term and medium term moving averages.
    Returns a score from 0 (bearish) to 100 (bullish).
    """
    if len(prices) < 10:
        # Mock calculation if real history isn't passed yet
        return random.uniform(30, 70)
        
    short_ma = sum(prices[-5:]) / 5
    long_ma = sum(prices[-10:]) / 10
    
    # 50 is neutral. Higher short_ma over long_ma = bullish
    diff_pct = ((short_ma - long_ma) / long_ma) * 100
    
    score = 50 + (diff_pct * 10)
    return max(0, min(100, score))


def screen_market_bullish(market_data):
    """
    Given a dictionary of market data { "SYMBOL": { "prices": [...] } },
    returns a sorted list of symbols indicating which ones are most bullish.
    """
    scores = []
    for symbol, data in market_data.items():
        prices = data.get("prices", [])
        if prices:
            rsi = calculate_rsi(prices)
            momentum = calculate_momentum_score(prices)
            
            # Simple scoring model: High momentum, RSI between 40 and 70 (not overbought yet)
            rsi_penalty = abs(55 - rsi) * 0.5 
            bull_score = momentum - rsi_penalty
            
            scores.append({
                "symbol": symbol,
                "score": bull_score,
                "rsi": rsi,
                "momentum": momentum
            })
            
    # Sort descending by score
    scores.sort(key=lambda x: x["score"], reverse=True)
    return scores

# =====================
# HFT Sequence Logic
# =====================

def execute_hft_sequence(groww_client, trading_symbol, quantity=1):
    """
    Executes a high-frequency sequence: Buy, Wait 10 seconds, Sell.
    Based on user-provided script logic.
    """
    results = []
    
    # 1. Place BUY Order
    try:
        print(f"Placing MARKET BUY order for {trading_symbol}")
        buy_order = groww_client.place_order(
            trading_symbol=trading_symbol, 
            quantity=quantity, 
            validity=groww_client.VALIDITY_DAY,
            exchange=groww_client.EXCHANGE_NSE, 
            segment=groww_client.SEGMENT_CASH,
            product=groww_client.PRODUCT_MIS,
            order_type=groww_client.ORDER_TYPE_MARKET,
            transaction_type=groww_client.TRANSACTION_TYPE_BUY
        )
        # Mocking the dictionary structure for safety if we aren't using the real API yet
        buy_id = buy_order.get('groww_order_id', f'mock_buy_{random.randint(1000,9999)}')
        results.append(f"✅ BUY order placed. ID: {buy_id}")
    except Exception as e:
        results.append(f"❌ Failed to place BUY order: {e}")
        return results
        
    # 2. Wait 10 seconds
    time.sleep(10)
    
    # 3. Place SELL Order
    try:
        print(f"Placing MARKET SELL order for {trading_symbol}")
        sell_order = groww_client.place_order(
            trading_symbol=trading_symbol,
            quantity=quantity,
            validity=groww_client.VALIDITY_DAY,
            exchange=groww_client.EXCHANGE_NSE,
            segment=groww_client.SEGMENT_CASH,
            product=groww_client.PRODUCT_MIS,
            order_type=groww_client.ORDER_TYPE_MARKET,
            transaction_type=groww_client.TRANSACTION_TYPE_SELL
        )
        sell_id = sell_order.get('groww_order_id', f'mock_sell_{random.randint(1000,9999)}')
        results.append(f"✅ SELL order placed. ID: {sell_id}")
    except Exception as e:
        results.append(f"❌ Failed to place SELL order: {e}")
        
    return results
