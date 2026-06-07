"""
╔══════════════════════════════════════════════════════════════════════╗
║         GROWW ALGORITHMIC TRADING SUITE — Python SDK v1.5.0         ║║
║  Integration: Import into main.py to expose these strategies via API ║

║  Intraday | Short-Term | Long-Term | Mutual Fund Interest Calculator ║
╚══════════════════════════════════════════════════════════════════════╝

SETUP:
    pip install growwapi pandas numpy ta-lib requests

USAGE:
    Set your API_AUTH_TOKEN below (from Groww Developer portal).
    Each strategy class is self-contained and generic.
"""

import time
import logging
import math
from datetime import datetime, timedelta
from typing import Optional
from growwapi import GrowwAPI

import os
from dotenv import load_dotenv

# Load .env from root directory
load_dotenv(dotenv_path="../.env")

# ─────────────────────────────────────────────────────────────────────
#  GLOBAL CONFIG
# ─────────────────────────────────────────────────────────────────────
GROW_API_KEY = os.getenv("GROW_API_KEY")
GROW_API_SECRET = os.getenv("GROW_API_SECRET")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)

groww = None
if GROW_API_KEY and GROW_API_SECRET:
    try:
        access_token = GrowwAPI.get_access_token(api_key=GROW_API_KEY, secret=GROW_API_SECRET)
        groww = GrowwAPI(access_token)
        log.info("✅ Groww API Initialized in Algos script.")
    except Exception as e:
        log.error("⚠️ Failed to initialize Groww API in Algos script: %s", e)
else:
        # Fallback to None if credentials aren't loaded correctly
        groww = None


# ─────────────────────────────────────────────────────────────────────
#  BASE STRATEGY (shared utilities)
# ─────────────────────────────────────────────────────────────────────
class BaseStrategy:
    """Common utilities inherited by all strategies."""

    def __init__(self):
        self.groww = groww

    # ── Market Data ──────────────────────────────────────────────────
    def get_ltp(self, symbol: str, exchange: str = "NSE") -> float:
        """Fetch Last Traded Price for a symbol."""
        response = self.groww.get_ltp(
            trading_symbol=symbol,
            exchange=exchange,
            segment=self.groww.SEGMENT_CASH,
        )
        return float(response.get("ltp", 0))

    def get_candles(
        self,
        symbol: str,
        interval_minutes: int = 5,
        lookback_days: int = 1,
        exchange: str = "NSE",
    ) -> list[dict]:
        """
        Fetch historical OHLCV candles.
        Returns list of dicts: {ts, open, high, low, close, volume}
        """
        end_ms = int(time.time() * 1000)
        start_ms = end_ms - (lookback_days * 24 * 60 * 60 * 1000)

        raw = self.groww.get_historical_candle_data(
            trading_symbol=symbol,
            exchange=exchange,
            segment=self.groww.SEGMENT_CASH,
            start_time=start_ms,
            end_time=end_ms,
            interval_in_minutes=interval_minutes,
        )
        candles = []
        for c in raw.get("candles", []):
            candles.append(
                {
                    "ts": c[0], "open": c[1], "high": c[2],
                    "low": c[3], "close": c[4], "volume": c[5],
                }
            )
        return candles

    # ── Order Helpers ────────────────────────────────────────────────
    def place_market_order(
        self,
        symbol: str,
        qty: int,
        side: str,
        product: str = None,
        exchange: str = "NSE",
        segment: str = None,
    ) -> dict:
        """Generic market order placement."""
        product = product or self.groww.PRODUCT_MIS
        segment = segment or self.groww.SEGMENT_CASH
        log.info("PLACING %s MARKET ORDER: %s x%d", side, symbol, qty)
        return self.groww.place_order(
            trading_symbol=symbol,
            quantity=qty,
            validity=self.groww.VALIDITY_DAY,
            exchange=exchange,
            segment=segment,
            product=product,
            order_type=self.groww.ORDER_TYPE_MARKET,
            transaction_type=(
                self.groww.TRANSACTION_TYPE_BUY
                if side.upper() == "BUY"
                else self.groww.TRANSACTION_TYPE_SELL
            ),
        )

    def place_limit_order(
        self,
        symbol: str,
        qty: int,
        side: str,
        price: float,
        product: str = None,
        exchange: str = "NSE",
        segment: str = None,
    ) -> dict:
        product = product or self.groww.PRODUCT_CNC
        segment = segment or self.groww.SEGMENT_CASH
        log.info(
            "PLACING %s LIMIT ORDER: %s x%d @ ₹%.2f", side, symbol, qty, price
        )
        return self.groww.place_order(
            trading_symbol=symbol,
            quantity=qty,
            validity=self.groww.VALIDITY_DAY,
            exchange=exchange,
            segment=segment,
            product=product,
            order_type=self.groww.ORDER_TYPE_LIMIT,
            transaction_type=(
                self.groww.TRANSACTION_TYPE_BUY
                if side.upper() == "BUY"
                else self.groww.TRANSACTION_TYPE_SELL
            ),
            price=price,
        )

    # ── Technical Indicators (pure Python, no ta-lib required) ───────
    @staticmethod
    def sma(closes: list[float], period: int) -> list[float]:
        """Simple Moving Average."""
        result = []
        for i in range(len(closes)):
            if i < period - 1:
                result.append(None)
            else:
                result.append(sum(closes[i - period + 1 : i + 1]) / period)
        return result

    @staticmethod
    def ema(closes: list[float], period: int) -> list[float]:
        """Exponential Moving Average."""
        k = 2 / (period + 1)
        result = []
        for i, c in enumerate(closes):
            if i == 0:
                result.append(c)
            else:
                result.append(c * k + result[-1] * (1 - k))
        return result

    @staticmethod
    def rsi(closes: list[float], period: int = 14) -> list[float]:
        """Relative Strength Index."""
        result = [None] * period
        gains, losses = [], []
        for i in range(1, len(closes)):
            delta = closes[i] - closes[i - 1]
            gains.append(max(delta, 0))
            losses.append(max(-delta, 0))
        avg_gain = sum(gains[:period]) / period
        avg_loss = sum(losses[:period]) / period
        for i in range(period, len(gains)):
            avg_gain = (avg_gain * (period - 1) + gains[i]) / period
            avg_loss = (avg_loss * (period - 1) + losses[i]) / period
            rs = avg_gain / avg_loss if avg_loss != 0 else float("inf")
            result.append(100 - 100 / (1 + rs))
        return result

    @staticmethod
    def bollinger_bands(
        closes: list[float], period: int = 20, std_dev: float = 2.0
    ) -> tuple[list, list, list]:
        """Returns (upper, middle, lower) bands."""
        upper, middle, lower = [], [], []
        for i in range(len(closes)):
            if i < period - 1:
                upper.append(None)
                middle.append(None)
                lower.append(None)
            else:
                window = closes[i - period + 1 : i + 1]
                avg = sum(window) / period
                std = math.sqrt(sum((x - avg) ** 2 for x in window) / period)
                upper.append(avg + std_dev * std)
                middle.append(avg)
                lower.append(avg - std_dev * std)
        return upper, middle, lower

    @staticmethod
    def macd(
        closes: list[float],
        fast: int = 12,
        slow: int = 26,
        signal: int = 9,
    ) -> tuple[list, list, list]:
        """Returns (macd_line, signal_line, histogram)."""

        def _ema(data, n):
            k = 2 / (n + 1)
            out = [data[0]]
            for x in data[1:]:
                out.append(x * k + out[-1] * (1 - k))
            return out

        ema_fast = _ema(closes, fast)
        ema_slow = _ema(closes, slow)
        macd_line = [f - s for f, s in zip(ema_fast, ema_slow)]
        signal_line = _ema(macd_line, signal)
        histogram = [m - s for m, s in zip(macd_line, signal_line)]
        return macd_line, signal_line, histogram

    @staticmethod
    def atr(
        highs: list[float],
        lows: list[float],
        closes: list[float],
        period: int = 14,
    ) -> list[float]:
        """Average True Range."""
        trs = []
        for i in range(len(highs)):
            if i == 0:
                trs.append(highs[i] - lows[i])
            else:
                trs.append(
                    max(
                        highs[i] - lows[i],
                        abs(highs[i] - closes[i - 1]),
                        abs(lows[i] - closes[i - 1]),
                    )
                )
        result = [None] * period
        avg = sum(trs[:period]) / period
        result.append(avg)
        for tr in trs[period:]:
            avg = (avg * (period - 1) + tr) / period
            result.append(avg)
        return result


# ═════════════════════════════════════════════════════════════════════
#  STRATEGY 1: INTRADAY — VWAP + RSI Momentum (MIS Product)
# ═════════════════════════════════════════════════════════════════════
class IntradayStrategy(BaseStrategy):
    """
    Strategy: VWAP + RSI Intraday Scalper
    ─────────────────────────────────────
    BUY  when: price crosses ABOVE VWAP AND RSI < 60 (not overbought)
    SELL when: price crosses BELOW VWAP OR RSI > 70 (overbought)
    Stop-Loss: 0.5% below entry (ATR-based scaling)
    Target   : 1% above entry (2:1 reward/risk)

    All positions are squared off before 3:15 PM.
    """

    def __init__(
        self,
        symbol: str,
        qty: int,
        stop_loss_pct: float = 0.5,
        target_pct: float = 1.0,
        exchange: str = "NSE",
    ):
        super().__init__()
        self.symbol = symbol
        self.qty = qty
        self.sl_pct = stop_loss_pct / 100
        self.tp_pct = target_pct / 100
        self.exchange = exchange
        self.entry_price: Optional[float] = None
        self.position: str = "NONE"   # LONG | SHORT | NONE

    def _compute_vwap(self, candles: list[dict]) -> float:
        total_vol = sum(c["volume"] for c in candles)
        if total_vol == 0:
            return 0
        return sum(
            ((c["high"] + c["low"] + c["close"]) / 3) * c["volume"]
            for c in candles
        ) / total_vol

    def _market_is_open(self) -> bool:
        now = datetime.now()
        market_close = now.replace(hour=15, minute=15, second=0, microsecond=0)
        market_open = now.replace(hour=9, minute=15, second=0, microsecond=0)
        return market_open <= now <= market_close

    def _should_square_off(self) -> bool:
        now = datetime.now()
        cutoff = now.replace(hour=15, minute=10, second=0, microsecond=0)
        return now >= cutoff

    def run_tick(self):
        """Call this every 1–5 minutes during market hours."""
        if not self._market_is_open():
            log.info("Market closed. Skipping tick.")
            return

        # ── Force square-off near close ──────────────────────────────
        if self._should_square_off() and self.position != "NONE":
            log.warning("EOD SQUARE-OFF triggered for %s", self.symbol)
            self.place_market_order(
                self.symbol, self.qty,
                "SELL" if self.position == "LONG" else "BUY",
                product=self.groww.PRODUCT_MIS,
            )
            self.position = "NONE"
            self.entry_price = None
            return

        candles = self.get_candles(self.symbol, interval_minutes=5, lookback_days=1)
        if len(candles) < 20:
            log.warning("Not enough candles yet.")
            return

        closes = [c["close"] for c in candles]
        rsi_values = self.rsi(closes, period=14)
        vwap = self._compute_vwap(candles)
        ltp = self.get_ltp(self.symbol, self.exchange)
        rsi_now = rsi_values[-1]

        log.info(
            "%s | LTP=%.2f | VWAP=%.2f | RSI=%.1f | POS=%s",
            self.symbol, ltp, vwap, rsi_now, self.position,
        )

        # ── Entry ─────────────────────────────────────────────────────
        if self.position == "NONE":
            if ltp > vwap and rsi_now is not None and rsi_now < 60:
                log.info("ENTRY SIGNAL: BUY %s", self.symbol)
                resp = self.place_market_order(
                    self.symbol, self.qty, "BUY",
                    product=self.groww.PRODUCT_MIS,
                )
                self.entry_price = ltp
                self.position = "LONG"
                log.info("Order placed: %s", resp)

        # ── Exit ──────────────────────────────────────────────────────
        elif self.position == "LONG":
            sl = self.entry_price * (1 - self.sl_pct)
            tp = self.entry_price * (1 + self.tp_pct)

            if ltp <= sl:
                log.warning("STOP-LOSS hit at %.2f (entry=%.2f)", ltp, self.entry_price)
                self.place_market_order(
                    self.symbol, self.qty, "SELL",
                    product=self.groww.PRODUCT_MIS,
                )
                self.position = "NONE"
            elif ltp >= tp:
                log.info("TARGET hit at %.2f (entry=%.2f)", ltp, self.entry_price)
                self.place_market_order(
                    self.symbol, self.qty, "SELL",
                    product=self.groww.PRODUCT_MIS,
                )
                self.position = "NONE"
            elif ltp < vwap or (rsi_now is not None and rsi_now > 70):
                log.info("REVERSAL EXIT: price below VWAP or RSI overbought")
                self.place_market_order(
                    self.symbol, self.qty, "SELL",
                    product=self.groww.PRODUCT_MIS,
                )
                self.position = "NONE"


# ═════════════════════════════════════════════════════════════════════
#  STRATEGY 2: SHORT-TERM — EMA Crossover + MACD (CNC, 5–30 days)
# ═════════════════════════════════════════════════════════════════════
class ShortTermStrategy(BaseStrategy):
    """
    Strategy: EMA Crossover + MACD Confirmation (Swing)
    ─────────────────────────────────────────────────────
    Timeframe: Daily candles, hold 5–30 days

    BUY  when: EMA9 crosses ABOVE EMA21 AND MACD histogram > 0
    SELL when: EMA9 crosses BELOW EMA21 OR MACD histogram < 0
    Stop-Loss: 2× ATR below entry
    Target   : 4× ATR above entry (2:1 reward/risk)
    """

    def __init__(
        self,
        symbol: str,
        qty: int,
        fast_ema: int = 9,
        slow_ema: int = 21,
        atr_sl_mult: float = 2.0,
        atr_tp_mult: float = 4.0,
        exchange: str = "NSE",
    ):
        super().__init__()
        self.symbol = symbol
        self.qty = qty
        self.fast = fast_ema
        self.slow = slow_ema
        self.sl_mult = atr_sl_mult
        self.tp_mult = atr_tp_mult
        self.exchange = exchange
        self.entry_price: Optional[float] = None
        self.sl_price: Optional[float] = None
        self.tp_price: Optional[float] = None
        self.position: str = "NONE"

    def evaluate(self):
        """Call once daily after market close."""
        candles = self.get_candles(
            self.symbol, interval_minutes=1440, lookback_days=90
        )
        if len(candles) < self.slow + 10:
            log.warning("Insufficient data for %s", self.symbol)
            return

        closes = [c["close"] for c in candles]
        highs  = [c["high"]  for c in candles]
        lows   = [c["low"]   for c in candles]

        ema_fast = self.ema(closes, self.fast)
        ema_slow = self.ema(closes, self.slow)
        _, _, hist = self.macd(closes)
        atr_vals = self.atr(highs, lows, closes)

        ef_now, ef_prev = ema_fast[-1], ema_fast[-2]
        es_now, es_prev = ema_slow[-1], ema_slow[-2]
        hist_now = hist[-1]
        atr_now  = atr_vals[-1] if atr_vals[-1] else 0
        ltp = closes[-1]

        golden_cross = ef_prev < es_prev and ef_now > es_now
        death_cross  = ef_prev > es_prev and ef_now < es_now

        log.info(
            "%s | LTP=%.2f | EMA%d=%.2f | EMA%d=%.2f | MACD_H=%.4f | ATR=%.2f | POS=%s",
            self.symbol, ltp, self.fast, ef_now, self.slow, es_now,
            hist_now, atr_now, self.position,
        )

        if self.position == "NONE" and golden_cross and hist_now > 0:
            log.info("SWING BUY signal: %s", self.symbol)
            resp = self.place_limit_order(
                self.symbol, self.qty, "BUY", price=round(ltp * 1.002, 2),
                product=self.groww.PRODUCT_CNC,
            )
            self.entry_price = ltp
            self.sl_price = ltp - (self.sl_mult * atr_now)
            self.tp_price = ltp + (self.tp_mult * atr_now)
            self.position = "LONG"
            log.info("Entry=%.2f | SL=%.2f | TP=%.2f", ltp, self.sl_price, self.tp_price)

        elif self.position == "LONG":
            if ltp <= self.sl_price:
                log.warning("SL hit: %.2f ≤ %.2f", ltp, self.sl_price)
                self.place_market_order(
                    self.symbol, self.qty, "SELL",
                    product=self.groww.PRODUCT_CNC,
                )
                self.position = "NONE"
            elif ltp >= self.tp_price:
                log.info("TP hit: %.2f ≥ %.2f", ltp, self.tp_price)
                self.place_market_order(
                    self.symbol, self.qty, "SELL",
                    product=self.groww.PRODUCT_CNC,
                )
                self.position = "NONE"
            elif death_cross or hist_now < 0:
                log.info("Exit signal: death cross or MACD turning negative")
                self.place_market_order(
                    self.symbol, self.qty, "SELL",
                    product=self.groww.PRODUCT_CNC,
                )
                self.position = "NONE"


# ═════════════════════════════════════════════════════════════════════
#  STRATEGY 3: LONG-TERM — SMA200 Trend + Bollinger Bands (CNC)
# ═════════════════════════════════════════════════════════════════════
class LongTermStrategy(BaseStrategy):
    """
    Strategy: SMA200 Trend Filter + Bollinger Band Mean Reversion
    ──────────────────────────────────────────────────────────────
    Timeframe: Weekly or Monthly review; hold 6–24 months

    RULES:
      • Only BUY when price is ABOVE SMA200 (uptrend regime)
      • BUY when price touches or bounces off lower Bollinger Band
      • SELL when price reaches upper Bollinger Band OR
              price crosses BELOW SMA200 (regime change)
    Position Sizing: fixed quantity (or pass a capital % override)
    """

    def __init__(
        self,
        symbol: str,
        qty: int,
        sma_period: int = 200,
        bb_period: int = 20,
        bb_std: float = 2.0,
        exchange: str = "NSE",
    ):
        super().__init__()
        self.symbol = symbol
        self.qty = qty
        self.sma_period = sma_period
        self.bb_period = bb_period
        self.bb_std = bb_std
        self.exchange = exchange
        self.position: str = "NONE"
        self.entry_price: Optional[float] = None

    def evaluate(self):
        """Call weekly or on significant price moves."""
        lookback = max(self.sma_period + 50, 300)
        candles = self.get_candles(
            self.symbol, interval_minutes=1440, lookback_days=lookback
        )
        if len(candles) < self.sma_period:
            log.warning("Need more history for %s", self.symbol)
            return

        closes = [c["close"] for c in candles]
        highs  = [c["high"]  for c in candles]
        lows   = [c["low"]   for c in candles]

        sma200 = self.sma(closes, self.sma_period)
        upper, mid, lower = self.bollinger_bands(closes, self.bb_period, self.bb_std)
        atr_vals = self.atr(highs, lows, closes)

        ltp       = closes[-1]
        sma_now   = sma200[-1]
        bb_low    = lower[-1]
        bb_up     = upper[-1]
        atr_now   = atr_vals[-1] if atr_vals[-1] else 0

        trend_up = ltp > sma_now if sma_now else False

        log.info(
            "%s | LTP=%.2f | SMA200=%.2f | BB_L=%.2f | BB_U=%.2f | POS=%s",
            self.symbol, ltp, sma_now or 0, bb_low or 0, bb_up or 0, self.position,
        )

        if self.position == "NONE" and trend_up and bb_low and ltp <= bb_low * 1.005:
            log.info("LONG-TERM BUY: %s touching BB lower in uptrend", self.symbol)
            resp = self.place_limit_order(
                self.symbol, self.qty, "BUY",
                price=round(ltp * 1.001, 2),
                product=self.groww.PRODUCT_CNC,
            )
            self.entry_price = ltp
            self.position = "LONG"
            log.info("Order: %s | Entry=%.2f", resp, ltp)

        elif self.position == "LONG":
            if not trend_up:
                log.warning("REGIME CHANGE: price below SMA200 — SELL %s", self.symbol)
                self.place_market_order(
                    self.symbol, self.qty, "SELL",
                    product=self.groww.PRODUCT_CNC,
                )
                self.position = "NONE"
            elif bb_up and ltp >= bb_up * 0.995:
                log.info("BB UPPER BAND reached — taking profit on %s", self.symbol)
                self.place_market_order(
                    self.symbol, self.qty, "SELL",
                    product=self.groww.PRODUCT_CNC,
                )
                self.position = "NONE"


# ═════════════════════════════════════════════════════════════════════
#  STRATEGY 4: MUTUAL FUND INTEREST / RETURNS CALCULATOR
# ═════════════════════════════════════════════════════════════════════
class MutualFundCalculator:
    """
    Calculate returns / interest for a mutual fund by name.
    ─────────────────────────────────────────────────────────
    Uses Groww's public MF search API (no auth required) to
    fetch the current NAV and historical NAV to compute:
      • Absolute return
      • CAGR (Compound Annual Growth Rate)
      • SIP projection with estimated XIRR
      • Lump-sum projection

    NOTE: Groww's official Python SDK focuses on equity trading.
    Mutual fund data is fetched from the free public MFAPI.in
    (maintained by AMFI data) which Groww also relies on.
    """

    MF_SEARCH_URL = "https://api.mfapi.in/mf/search?q={query}"
    MF_NAV_URL    = "https://api.mfapi.in/mf/{scheme_code}"

    def __init__(self):
        try:
            import requests
            self._requests = requests
        except ImportError:
            raise ImportError("pip install requests")

    # ── Public API ────────────────────────────────────────────────────
    def search_fund(self, fund_name: str) -> list[dict]:
        """Search for MF schemes by name. Returns top matches."""
        import urllib.parse
        url = self.MF_SEARCH_URL.format(
            query=urllib.parse.quote(fund_name)
        )
        resp = self._requests.get(url, timeout=10)
        resp.raise_for_status()
        results = resp.json()
        log.info("Found %d funds matching '%s'", len(results), fund_name)
        return results  # [{schemeCode, schemeName}]

    def get_nav_history(self, scheme_code: int) -> dict:
        """Fetch full NAV history for a scheme code."""
        url = self.MF_NAV_URL.format(scheme_code=scheme_code)
        resp = self._requests.get(url, timeout=10)
        resp.raise_for_status()
        return resp.json()  # {meta, data: [{date, nav}]}

    def calculate_returns(
        self,
        fund_name: str,
        investment_amount: float = 10000.0,
        investment_years: float = 1.0,
        is_sip: bool = False,
        monthly_sip: float = 1000.0,
    ) -> dict:
        """
        Main entry point.

        Args:
            fund_name        : Partial or full fund name (e.g. "Mirae Asset Large Cap")
            investment_amount: Lump-sum amount (₹)
            investment_years : Holding period in years
            is_sip           : If True, calculate SIP returns instead
            monthly_sip      : Monthly SIP amount (₹) — used if is_sip=True

        Returns:
            dict with full breakdown of returns
        """
        results = self.search_fund(fund_name)
        if not results:
            return {"error": f"No fund found for '{fund_name}'"}

        fund = results[0]  # take best match
        scheme_code = fund["schemeCode"]
        scheme_name = fund["schemeName"]
        log.info("Using fund: %s (code=%s)", scheme_name, scheme_code)

        nav_data = self.get_nav_history(scheme_code)
        navs = nav_data.get("data", [])  # newest first
        if not navs:
            return {"error": "No NAV data available"}

        current_nav = float(navs[0]["nav"])

        # find NAV ~investment_years ago
        target_date = datetime.now() - timedelta(days=int(investment_years * 365))
        past_nav = None
        past_date_actual = None
        for entry in reversed(navs):  # oldest first
            entry_date = datetime.strptime(entry["date"], "%d-%m-%Y")
            if entry_date >= target_date:
                past_nav = float(entry["nav"])
                past_date_actual = entry_date
                break

        if past_nav is None:
            past_nav = float(navs[-1]["nav"])
            past_date_actual = datetime.strptime(navs[-1]["date"], "%d-%m-%Y")

        actual_years = (datetime.now() - past_date_actual).days / 365.25
        actual_years = max(actual_years, 1 / 12)  # avoid div-by-zero

        if is_sip:
            result = self._sip_returns(
                monthly_sip, current_nav, past_nav, actual_years
            )
        else:
            result = self._lumpsum_returns(
                investment_amount, current_nav, past_nav, actual_years
            )

        result.update(
            {
                "fund_name": scheme_name,
                "scheme_code": scheme_code,
                "current_nav": current_nav,
                "past_nav": past_nav,
                "period_years": round(actual_years, 2),
                "as_of_date": navs[0]["date"],
            }
        )

        self._print_report(result, is_sip)
        return result

    # ── Internal Calculators ──────────────────────────────────────────
    def _lumpsum_returns(
        self,
        amount: float,
        current_nav: float,
        past_nav: float,
        years: float,
    ) -> dict:
        units = amount / past_nav
        current_value = units * current_nav
        absolute_return_pct = ((current_nav - past_nav) / past_nav) * 100
        cagr = (((current_nav / past_nav) ** (1 / years)) - 1) * 100

        return {
            "type": "LUMPSUM",
            "invested_amount": round(amount, 2),
            "units_purchased": round(units, 4),
            "current_value": round(current_value, 2),
            "profit_loss": round(current_value - amount, 2),
            "absolute_return_pct": round(absolute_return_pct, 2),
            "cagr_pct": round(cagr, 2),
        }

    def _sip_returns(
        self,
        monthly_amount: float,
        current_nav: float,
        start_nav: float,
        years: float,
    ) -> dict:
        months = int(years * 12)
        total_invested = monthly_amount * months

        # Approximate: assume NAV grew linearly (simplified SIP calc)
        nav_growth_monthly = (current_nav / start_nav) ** (1 / max(months, 1)) - 1
        total_units = 0.0
        for i in range(months):
            nav_i = start_nav * ((1 + nav_growth_monthly) ** i)
            total_units += monthly_amount / nav_i

        current_value = total_units * current_nav
        profit_loss   = current_value - total_invested
        abs_return    = (profit_loss / total_invested) * 100 if total_invested else 0

        # Approx XIRR via CAGR of invested capital
        if months > 0 and total_invested > 0:
            xirr_approx = (((current_value / total_invested) ** (12 / months)) - 1) * 100
        else:
            xirr_approx = 0

        return {
            "type": "SIP",
            "monthly_sip": round(monthly_amount, 2),
            "months": months,
            "total_invested": round(total_invested, 2),
            "total_units": round(total_units, 4),
            "current_value": round(current_value, 2),
            "profit_loss": round(profit_loss, 2),
            "absolute_return_pct": round(abs_return, 2),
            "xirr_approx_pct": round(xirr_approx, 2),
        }

    def _print_report(self, data: dict, is_sip: bool):
        print("\n" + "═" * 55)
        print(f"  MUTUAL FUND RETURNS REPORT")
        print("═" * 55)
        print(f"  Fund   : {data['fund_name']}")
        print(f"  Code   : {data['scheme_code']}")
        print(f"  Period : {data['period_years']} years")
        print(f"  NAV(now): ₹{data['current_nav']}   NAV(then): ₹{data['past_nav']}")
        print("─" * 55)
        if is_sip:
            print(f"  Type           : SIP (₹{data['monthly_sip']}/month)")
            print(f"  Months         : {data['months']}")
            print(f"  Total Invested : ₹{data['total_invested']:,.2f}")
            print(f"  Current Value  : ₹{data['current_value']:,.2f}")
            print(f"  Profit / Loss  : ₹{data['profit_loss']:,.2f}")
            print(f"  Absolute Return: {data['absolute_return_pct']}%")
            print(f"  XIRR (approx)  : {data['xirr_approx_pct']}% p.a.")
        else:
            print(f"  Type           : Lump-Sum")
            print(f"  Invested       : ₹{data['invested_amount']:,.2f}")
            print(f"  Units          : {data['units_purchased']}")
            print(f"  Current Value  : ₹{data['current_value']:,.2f}")
            print(f"  Profit / Loss  : ₹{data['profit_loss']:,.2f}")
            print(f"  Absolute Return: {data['absolute_return_pct']}%")
            print(f"  CAGR           : {data['cagr_pct']}% p.a.")
        print("═" * 55 + "\n")


# ═════════════════════════════════════════════════════════════════════
#  DEMO — uncomment whichever strategy you want to test
# ═════════════════════════════════════════════════════════════════════
if __name__ == "__main__":

    # ── 1. Intraday ───────────────────────────────────────────────────
    # intraday = IntradayStrategy("RELIANCE", qty=1, stop_loss_pct=0.5, target_pct=1.0)
    # while True:
    #     intraday.run_tick()
    #     time.sleep(300)  # every 5 minutes

    # ── 2. Short-Term ─────────────────────────────────────────────────
    # swing = ShortTermStrategy("TCS", qty=5, fast_ema=9, slow_ema=21)
    # swing.evaluate()  # run once daily via cron / scheduler

    # ── 3. Long-Term ─────────────────────────────────────────────────
    # lt = LongTermStrategy("HDFCBANK", qty=10, sma_period=200)
    # lt.evaluate()  # run weekly

    # ── 4. Mutual Fund Calculator ────────────────────────────────────
    mf = MutualFundCalculator()

    # Lump-sum example
    mf.calculate_returns(
        fund_name="Mirae Asset Large Cap",
        investment_amount=100000,
        investment_years=3,
        is_sip=False,
    )

    # SIP example
    mf.calculate_returns(
        fund_name="Parag Parikh Flexi Cap",
        investment_years=5,
        is_sip=True,
        monthly_sip=5000,
    )