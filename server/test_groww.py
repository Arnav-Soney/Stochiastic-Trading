import os
from dotenv import load_dotenv
from growwapi import GrowwAPI

load_dotenv(dotenv_path="../.env")
GROW_API_KEY = os.getenv("GROW_API_KEY")
GROW_API_SECRET = os.getenv("GROW_API_SECRET")

if GROW_API_KEY and GROW_API_SECRET:
    access_token = GrowwAPI.get_access_token(api_key=GROW_API_KEY, secret=GROW_API_SECRET)
    client = GrowwAPI(access_token)
    try:
        res = client.get_ltp(exchange_trading_symbols=("RELIANCE",), segment="CASH")
        print("LTP:", res)
    except Exception as e:
        print("Failed RELIANCE:", e)
        
    try:
        res2 = client.get_ltp(exchange_trading_symbols=("NSE:RELIANCE",), segment="CASH")
        print("LTP NSE:", res2)
    except Exception as e:
        print("Failed NSE:RELIANCE:", e)
else:
    print("NO KEYS")
