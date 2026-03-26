

## Problem Analysis

For fund 006355, today's PnL amount (-¥140.71) equals cumulative PnL amount (-¥140.71), but their percentages differ (-2.48% vs -8.28%). This happens because:

1. **Amount bug**: When a purchase date equals today, `holding-calc.ts` computes `todayPnl = (currentNav - buyNav) * shares`, which equals `currentValue - totalCost` = cumulative PnL. This is actually **correct for the amount** — if you bought today, your entire P&L is today's P&L.

2. **Percentage bug**: The today PnL percentage displayed is `holding.dayChangePercent` (the fund's market-wide daily change, -2.48%), but the actual user-experienced percentage should be derived from the computed todayPnlAmount. For a same-day purchase, todayPnl% should equal cumPnl% (-8.28%), not the market change.

The root cause: `FundCard.tsx` line 94 hardcodes `holding.dayChangePercent` as today's percentage, instead of computing it from the actual today PnL.

## Fix

### 1. Add `todayPnlPercent` to `calcHolding` in `src/lib/holding-calc.ts`

After computing `todayPnlAmount`, derive the percentage:

```
// Previous value = what the held shares were worth before today's change
// For historical shares: prevClose * shares
// For today's buys: buyNav * shares (= totalCost for that tranche)
// Combined: currentValue - todayPnlAmount
const prevValue = currentValue - todayPnlAmount;
const todayPnlPercent = prevValue > 0 ? (todayPnlAmount / prevValue) * 100 : 0;
```

Add `todayPnlPercent` to the `HoldingCalc` interface and return it.

### 2. Update `FundCard.tsx` — use `calc.todayPnlPercent` instead of `holding.dayChangePercent`

Change:
```
今日 {formatPnlFull(calc.todayPnlAmount, holding.dayChangePercent, sym)}
```
To:
```
今日 {formatPnlFull(calc.todayPnlAmount, calc.todayPnlPercent, sym)}
```

### 3. Update `FundListItem.tsx` — same fix

Replace `holding.dayChangePercent` with `calc.todayPnlPercent` in the today PnL display.

### 4. Update `PortfolioSummary.tsx` — derive aggregate today PnL%

Use the summed `todayPnlAmount` and total `prevValue` to compute the aggregate today percentage, instead of averaging market percentages.

---

**Result**: For same-day purchases, today's PnL amount and percentage will correctly equal cumulative PnL. For historical holdings, today's percentage will reflect the actual portfolio-weighted change rather than blindly using the market's daily change.

