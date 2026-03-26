import { FundHolding } from "@/types/fund";
import { calcHolding } from "@/lib/holding-calc";
import { calcHoldingPnlPct, formatPnlFull, pnlColorClass } from "@/utils/holdingCalculations";
import { toCNY } from "@/lib/currency";

interface PortfolioSummaryProps {
  holdings: FundHolding[];
}

function PnlText({ value, percent, prefix = "" }: { value: number; percent: number; prefix?: string }) {
  return <span className={`tabular ${pnlColorClass(value)}`}>{formatPnlFull(value, percent, prefix)}</span>;
}

export default function PortfolioSummary({ holdings }: PortfolioSummaryProps) {
  if (holdings.length === 0) return null;

  const calcs = holdings.map((h) => ({ calc: calcHolding(h), currency: h.currency || "CNY" }));
  const totalValue = calcs.reduce((s, c) => s + toCNY(c.calc.currentValue, c.currency), 0);
  const totalCost = calcs.reduce((s, c) => s + toCNY(c.calc.totalCost, c.currency), 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPercent = calcHoldingPnlPct(totalPnl, totalCost);
  const totalDailyPnl = calcs.reduce((s, c) => s + toCNY(c.calc.todayPnlAmount, c.currency), 0);
  // prevDayValue = totalValue - totalDailyPnl, so dailyPct = totalDailyPnl / prevDayValue
  const prevDayValue = totalValue - totalDailyPnl;
  const totalDailyPercent = prevDayValue !== 0 ? (totalDailyPnl / Math.abs(prevDayValue)) * 100 : 0;

  return (
    <>
      {/* Mobile compact bar */}
      <div className="md:hidden bg-card rounded-lg border px-4 py-3 fade-in-up">
        <div className="text-[9px] text-muted-foreground mb-1">折合人民币</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] text-muted-foreground mb-0.5">总市值</div>
            <div className="text-base font-bold tabular text-card-foreground">
              ¥{totalValue.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground mb-0.5">累计收益</div>
            <div className="text-sm font-semibold">
              <PnlText value={totalPnl} percent={totalPnlPercent} prefix="¥" />
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground mb-0.5">当日盈亏</div>
            <div className="text-sm font-semibold">
              <PnlText value={totalDailyPnl} percent={totalDailyPercent} prefix="¥" />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop full card */}
      <div className="hidden md:block bg-card rounded-lg border p-5 fade-in-up">
        <div className="text-[10px] text-muted-foreground mb-2">折合人民币</div>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-xs text-muted-foreground mb-1">总持仓市值</div>
            <div className="text-lg font-bold tabular text-card-foreground">
              ¥{totalValue.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">总投入本金</div>
            <div className="text-lg font-bold tabular text-card-foreground">
              ¥{totalCost.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">累计总收益</div>
            <div className="text-lg font-bold">
              <PnlText value={totalPnl} percent={totalPnlPercent} prefix="¥" />
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">当日盈亏</div>
            <div className="text-lg font-bold">
              <PnlText value={totalDailyPnl} percent={totalDailyPercent} prefix="¥" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
