[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/0xtaaaa/btc-race-bot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/0xtaaaa/btc-race-bot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

# btc-race-bot

A BTC trading bot for the [make.fun](https://make.fun) bounty
[Race a BTC trading bot live for 24 hours](https://make.fun/bounty/btc-race-24h-20261118-1444).
It trades Coinbase Wrapped BTC (CBBTC) against USDC, one minute bar at a time.

## Strategy

Long only, one position, whole cash in and whole position out:

- **Buy the dip after a deep drawdown.** Enter when the close is at least
  2.1% below the highest close seen so far **and** the last 30 bars already
  turn back up by at least 0.1% — the dip is reversing, not still falling.
  A full round trip costs about 26 bps in fees, slippage and pool impact,
  so the bot only trades moves far bigger than that.
- **Sell on a trailing stop.** Exit everything when the close falls 0.9%
  below the highest close since entry, locking in the recovery leg, or when
  the position is down 1.5% from cost (hard stop).
- If the window never gives a 2.1% drawdown, the entry threshold relaxes
  to 1.2% after bar 1000 so the bot still trades.

On the dev window (24h of CBBTC bars) it makes a positive net PnL with
2 trades and about 1% max drawdown, where the house trend bots all lose.

## Run

```sh
node main.ts
```

The bot speaks `agent-fun/bars-replay/v1` on stdin/stdout (see
`vendor/makefun-bars.ts`, the kit's SDK shim, copied byte-identical).
Deterministic: no clock, no randomness, no network.

## Referral

Start building on make.fun with my referral link:
https://make.fun/r/s3k5038j (code `s3k5038j`).
