// BTC race bot: buy the dip after a deep drawdown, sell on a trailing stop.
//
// Protocol: agent-fun/bars-replay/v1. The harness sends a hello once, then
// one batch per minute bar, then done. Each batch carries the bar that just
// closed (o/h/l/c plus pool depth), the fills of the orders from the
// previous batch, and the account. Our reply to a batch is one line with
// our orders for the next bar: orders decided on this bar fill at the next
// bar's open, so every signal here reads the latest close and the fills
// land one bar later.
//
// Strategy (long only, one position, whole cash in, whole position out):
//   * Entry: buy when the close is at least 2.1% below the highest close
//     seen so far (a real drawdown, not noise) AND the last 30 bars already
//     turn back up by at least 0.1% (the dip is reversing, we are not
//     catching a falling knife). A full round trip costs about 26 bps in
//     fees, slippage and pool impact, so we only trade when the move we are
//     joining is far bigger than that. If the window never gives us a 2.1%
//     drawdown, the threshold relaxes to 1.2% after bar 1000 so the bot
//     still trades.
//   * Exit: sell everything when the close falls 0.9% below the highest
//     close since we bought (trailing stop locks in the recovery leg), or
//     when the position is down 1.5% from its cost (hard stop).
//   * Sizing: buy with all cash; the latest close depth tells us the pool
//     is deep enough that a $1,000 fill moves its own price only ~7-10 bps.
//   * Deterministic: no clock, no randomness, no environment; the only
//     state is the list of closes and the peak since entry, both derived
//     from the batches themselves.

import { runBars, type BarsState, type Batch, type OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';

// Entry: drawdown from the running high, and the 30-bar rebound that must
// confirm the dip is turning. Relaxed threshold used late in the window.
const DRAWDOWN = 0.021;
const DRAWDOWN_LATE = 0.012;
const LATE_BAR = 1000;
const REBOUND_30 = 0.001;
// Exit: trailing stop off the peak since entry, hard stop off the cost.
const TRAIL = 0.009;
const STOP = 0.015;
const MAX_SLIPPAGE_BPS = 150;

const closes: number[] = [];
let runningHigh = 0;
let peakSinceEntry: number | null = null;
let everTraded = false;

function onBatch(state: BarsState, _batch: Batch): OrderInput[] {
  if (state.warmingUp) return [];
  const closeRaw = state.close(SYMBOL);
  if (closeRaw === null || closeRaw <= 0n) return [];
  const price = Number(closeRaw);
  closes.push(price);
  if (price > runningHigh) runningHigh = price;
  const holding = state.positions.get(SYMBOL);

  if (holding !== undefined && holding.qty > 0n) {
    peakSinceEntry = peakSinceEntry === null ? price : Math.max(peakSinceEntry, price);
    const value = Number(state.value(SYMBOL, holding.qty));
    const cost = Number(holding.cost);
    const trailHit = (peakSinceEntry - price) / peakSinceEntry >= TRAIL;
    const stopHit = cost > 0 && (value - cost) / cost <= -STOP;
    if (trailHit || stopHit) {
      peakSinceEntry = null;
      return [{ side: 'sell', symbol: SYMBOL, qty: holding.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }
    return [];
  }

  // Flat: look for a deep drawdown that is already rebounding.
  if (closes.length < 61) return [];
  const drawdown = (runningHigh - price) / runningHigh;
  const rebound = (price - closes[closes.length - 31]) / closes[closes.length - 31];
  const threshold = everTraded || closes.length < LATE_BAR ? DRAWDOWN : DRAWDOWN_LATE;
  if (drawdown >= threshold && rebound >= REBOUND_30) {
    // Never send a buy the harness would reject as below the minimum
    // notional: 1 USDC = 1,000,000 quote units.
    if (state.cash < 1_000_000n) return [];
    everTraded = true;
    peakSinceEntry = price;
    return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS }];
  }
  return [];
}

await runBars({ onBatch });
