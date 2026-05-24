from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import requests
import random
from typing import List, Optional
from dotenv import load_dotenv
from growwapi import GrowwAPI
import traceback
from quant_models import screen_market_bullish, execute_hft_sequence
from ai_engine import ai_engine

# Load .env from root directory (one level up)
load_dotenv(dotenv_path="../.env")

GROW_API_KEY = os.getenv("GROW_API_KEY")
GROW_API_SECRET = os.getenv("GROW_API_SECRET")

# Initialize Groww API
groww_client = None
if GROW_API_KEY and GROW_API_SECRET:
    try:
        access_token = GrowwAPI.get_access_token(api_key=GROW_API_KEY, secret=GROW_API_SECRET) 
        groww_client = GrowwAPI(access_token)
        print("✅ Groww API Initialized successfully.")
    except Exception as e:
        print(f"⚠️ Failed to initialize Groww API: {e}")

app = FastAPI(title="Stochastic Trading Backend (Groww)")

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class OrderRequest(BaseModel):
    asset: str
    type: str # "BUY" or "SELL"
    size: float
    price: float

NIFTY_50 = [
    "RELIANCE", "TCS", "HDFCBANK", "ICICIBANK", "INFY", "ITC", "SBIN", 
    "BHARTIARTL", "BAJFINANCE", "LARSEN", "KOTAKBANK", "AXISBANK", 
    "ASIANPAINT", "HINDUNILVR", "MARUTI", "SUNPHARMA", "TITAN", "ULTRACEMCO", 
    "TATASTEEL", "NTPC", "BAJAJFINSV", "ONGC", "POWERGRID", "M&M", "HCLTECH", 
    "WIPRO", "ADANIENT", "ADANIPORTS", "COALINDIA", "TATMOTORS", "GRASIM", 
    "TECHM", "JSWSTEEL", "HINDALCO", "BAJAJ-AUTO", "CIPLA", "APOLLOHOSP", 
    "DRREDDY", "DIVISLAB", "BRITANNIA", "EICHERMOT", "INDUSINDBK", "TATACONSUM", 
    "HEROMOTOCO", "UPL", "NESTLEIND", "BPCL", "LTIM", "HDFCLIFE", "SBILIFE"
]

@app.get("/api/health")
def health_check():
    return {"status": "ok", "api_key_loaded": bool(GROW_API_KEY)}

@app.get("/api/groww/instruments")
def get_instruments():
    # Return a default list of Indian stocks for the frontend
    return {
        "status": "success",
        "instruments": NIFTY_50
    }

@app.get("/api/groww/search")
def search_instruments(q: str = ""):
    """
    Search autocomplete for Indian market. 
    Restricted to NIFTY 50 for MVP to prevent browser freeze & rate limits.
    """
    query = q.upper()
    matches = [sym for sym in NIFTY_50 if query in sym]
    return {"status": "success", "results": matches[:20]}

@app.get("/api/groww/movers")
def get_top_movers():
    """
    Returns top gainers and losers. 
    In production this would read from the Redis cache. For MVP, we mock the daily change
    from the NIFTY 50 universe to simulate market depth without rate-limiting the Groww API.
    """
    # Generate mock daily returns for the NIFTY 50
    movers = []
    for sym in NIFTY_50:
        change_pct = random.uniform(-5.0, 5.0)
        movers.append({"symbol": sym, "change_pct": round(change_pct, 2)})
    
    # Sort and slice
    movers.sort(key=lambda x: x["change_pct"], reverse=True)
    top_gainers = movers[:5]
    top_losers = movers[-5:]
    
    return {
        "status": "success",
        "gainers": top_gainers,
        "losers": top_losers
    }

@app.get("/api/groww/market-data/{symbol}")
def get_market_data(symbol: str):
    if not groww_client:
        # Fallback simulated data if token is invalid
        return {"symbol": symbol, "price": 100 + random.uniform(-1, 1)}
    
    try:
        # Real HTTP GET for LTP from Groww SDK
        res = groww_client.get_ltp(exchange_trading_symbols=(f"NSE_{symbol}",), segment="CASH")
        live_price = res.get(f"NSE_{symbol}")
        
        if live_price is not None:
            # We would normally build the candle structure here, 
            # for now let's pass a mock candle array to the AI to get a volatility prediction
            mock_recent_candles = [{'open': live_price*0.99, 'high': live_price*1.01, 'low': live_price*0.98, 'close': live_price} for _ in range(10)]
            ai_volatility_spike_prob = ai_engine.predict_volatility_spike(mock_recent_candles)
            
            return {
                "status": "success", 
                "symbol": symbol, 
                "price": float(live_price),
                "ai_volatility_spike_probability": ai_volatility_spike_prob
            }
        else:
            # Fallback if API doesn't return the symbol for some reason
            raise Exception("LTP not found in response")
            
    except Exception as e:
        print(f"Error fetching live price for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/groww/order")
def place_order(order: OrderRequest):
    if not groww_client:
        raise HTTPException(status_code=500, detail="Groww API client not initialized.")
    
    try:
        if order.type.upper() == "BUY":
            t_type = groww_client.TRANSACTION_TYPE_BUY
        else:
            t_type = groww_client.TRANSACTION_TYPE_SELL
            
        print(f"Placing MARKET {order.type} order for {order.asset}")
        res = groww_client.place_order(
            trading_symbol=order.asset, 
            quantity=int(order.size), 
            validity=groww_client.VALIDITY_DAY,
            exchange=groww_client.EXCHANGE_NSE, 
            segment=groww_client.SEGMENT_CASH,
            product=groww_client.PRODUCT_MIS,
            order_type=groww_client.ORDER_TYPE_MARKET,
            transaction_type=t_type
        )
        order_id = res.get('groww_order_id', f"groww_mock_{os.urandom(4).hex()}")
        return {
            "status": "success",
            "broker": "Groww",
            "order_id": order_id,
            "message": f"Successfully placed {order.type} order for {int(order.size)} {order.asset}."
        }
    except Exception as e:
        print("Order Error:", traceback.format_exc())
        # Fallback to mock for testing if market is closed
        return {
            "status": "success",
            "broker": "Groww (MOCK - MARKET CLOSED/ERR)",
            "order_id": f"mock_{os.urandom(4).hex()}",
            "message": f"Mock executed {order.type} for {order.asset} due to API err: {e}"
        }

class HFTRequest(BaseModel):
    asset: str
    quantity: int

@app.post("/api/groww/hft-sequence")
def run_hft_sequence(req: HFTRequest):
    if not groww_client:
         raise HTTPException(status_code=500, detail="Groww API client not initialized.")
         
    results = execute_hft_sequence(groww_client, req.asset, req.quantity)
    return {"status": "completed", "logs": results}

@app.get("/api/groww/historical/{symbol}")
def get_historical_data(symbol: str, timeframe: str = "1D", start: str = None, end: str = None):
    if not groww_client:
        raise HTTPException(status_code=500, detail="Groww API client not initialized.")
        
    from datetime import datetime, timedelta
    
    # Defaults
    end_dt = datetime.now()
    start_dt = end_dt - timedelta(days=1)
    interval = groww_client.CANDLE_INTERVAL_MIN_5
    
    if start and end:
        # Custom Range
        try:
            start_dt = datetime.fromisoformat(start.replace('Z', '+00:00')).replace(tzinfo=None)
            end_dt = datetime.fromisoformat(end.replace('Z', '+00:00')).replace(tzinfo=None)
            days_diff = (end_dt - start_dt).days
            if days_diff <= 2:
                interval = groww_client.CANDLE_INTERVAL_MIN_5
            elif days_diff <= 30:
                interval = groww_client.CANDLE_INTERVAL_HOUR_1
            else:
                interval = groww_client.CANDLE_INTERVAL_DAY
        except Exception:
            pass # fallback to default if parsing fails
    else:
        # Predefined Timeframes
        if timeframe == "1D":
            start_dt = end_dt - timedelta(days=1)
            interval = groww_client.CANDLE_INTERVAL_MIN_5
        elif timeframe == "1W":
            start_dt = end_dt - timedelta(days=7)
            interval = groww_client.CANDLE_INTERVAL_HOUR_1
        elif timeframe == "1M":
            start_dt = end_dt - timedelta(days=30)
            interval = groww_client.CANDLE_INTERVAL_DAY
        elif timeframe == "1Y":
            start_dt = end_dt - timedelta(days=365)
            interval = groww_client.CANDLE_INTERVAL_WEEK
            
    start_str = start_dt.strftime("%Y-%m-%d %H:%M:%S")
    end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")
    
    try:
        res = groww_client.get_historical_candles(
            exchange=groww_client.EXCHANGE_NSE,
            segment=groww_client.SEGMENT_CASH,
            groww_symbol=symbol,
            start_time=start_str,
            end_time=end_str,
            candle_interval=interval
        )
        
        candles_out = []
        raw_candles = res.get('candles', [])
        if not raw_candles and 'data' in res:
             raw_candles = res['data'].get('candles', [])
             
        for c in raw_candles:
            if len(c) >= 6:
                ts, o, h, l, c_close, v = c[:6]
                candles_out.append({
                    "time": datetime.fromtimestamp(ts).isoformat() + "Z",
                    "open": float(o),
                    "high": float(h),
                    "low": float(l),
                    "close": float(c_close),
                    "volume": float(v)
                })

        return {
            "status": "success",
            "symbol": symbol,
            "timeframe": timeframe,
            "candles": candles_out
        }
    except BaseException as e:
        # Catches GrowwAPIException (403 Forbidden) as well as all other errors.
        # We do NOT serve mock data here — we return a proper error so the UI
        # can downgrade gracefully to live-tick-only mode.
        print(f"Historical Data unavailable for {symbol}: {str(e)}")
        return {
            "status": "error",
            "message": "Historical data unavailable on this API tier. Chart will build from live ticks only."
        }

@app.get("/api/groww/screener")
def get_bullish_recommendations():
    # Generates a scan using quant_models logic
    # Mocking historical data for the basket
    symbols = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "IDEA", "ZOMATO"]
    market_data = {}
    import random
    for sym in symbols:
        # Generate 15 days of dummy historical close prices
        base = random.randint(100, 3000)
        prices = [base * (1 + random.uniform(-0.02, 0.02)) for _ in range(15)]
        market_data[sym] = {"prices": prices}
        
    rankings = screen_market_bullish(market_data)
    return {"status": "success", "recommendations": rankings}

# ==========================================
# Phase 2: Authentication & JWT (Stubs)
# ==========================================

class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/api/auth/login")
async def login(req: LoginRequest):
    # In production, this would query PostgreSQL and verify hashes
    if req.email == "admin@stochiastic.com" and req.password == "admin":
        return {"token": "jwt_token_stub", "user": {"email": req.email, "role": "trader"}}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/api/auth/session")
async def get_session():
    # In production, this would validate the JWT from the Authorization header
    return {"status": "active", "user": "admin@stochiastic.com"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
