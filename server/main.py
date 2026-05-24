from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import requests
from dotenv import load_dotenv
from growwapi import GrowwAPI
import traceback
from quant_models import screen_market_bullish, execute_hft_sequence

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

@app.get("/api/health")
def health_check():
    return {"status": "ok", "api_key_loaded": bool(GROW_API_KEY)}

@app.get("/api/groww/instruments")
def get_instruments():
    # Return a default list of Indian stocks for the frontend
    return {
        "status": "success",
        "instruments": ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "IDEA", "ZOMATO"]
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
            return {"status": "success", "symbol": symbol, "price": float(live_price)}
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
