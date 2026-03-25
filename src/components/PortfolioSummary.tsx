import { FundHolding } from "@/types/fund";
import { calcHolding } from "@/lib/holding-calc";

interface PortfolioSummaryProps {
  holdings: FundHolding[];
}

export default function PortfolioSummary({ holdings }: PortfolioSummaryProps) {
  if (holdings.length === 0) return null;

  const calcs = holdings.map(calcHolding);
  const totalValue = calcs.reduce((s, c) => s + c.currentValue, 0);
  const totalCost = calcs.reduce((s, c) => s + c.totalCost, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const totalDailyPnl = calcs.reduce((s, c) => s + c.todayPnlAmount, 0);
  const totalDailyPercent = totalValue > 0 ? (totalDailyPnl / (totalValue - totalDailyPnl)) * 100 : 0;

  const pnlUp = totalPnl > 0;
  const pnlDown = totalPnl < 0;
  const dayUp = totalDailyPnl > 0;
  const dayDown = totalDailyPnl < 0;

  return (
    <div className="bg-card rounded-lg border p-5 fade-in-up">
      <div className="grid grid-cols-2 gap-4 text-center">
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
          <div className={`text-lg font-bold tabular ${pnlUp ? "fund-rise" : pnlDown ? "fund-fall" : "text-muted-foreground"}`}>
            {pnlUp ? "+" : ""}¥{totalPnl.toFixed(2)}
            <div className="text-xs font-normal">
              {pnlUp ? "+" : ""}{totalPnlPercent.toFixed(2)}%
            </div>
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">当日盈亏</div>
          <div className={`text-lg font-bold tabular ${dayUp ? "fund-rise" : dayDown ? "fund-fall" : "text-muted-foreground"}`}>
            {dayUp ? "+" : ""}¥{totalDailyPnl.toFixed(2)}
            <div className="text-xs font-normal">
              {dayUp ? "+" : ""}{totalDailyPercent.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
