import { FundHolding } from "@/types/fund";
import { calcProfitLoss, calcDailyPL } from "@/lib/fund-api";

interface PortfolioSummaryProps {
  holdings: FundHolding[];
}

export default function PortfolioSummary({ holdings }: PortfolioSummaryProps) {
  if (holdings.length === 0) return null;

  const totalCurrent = holdings.reduce((s, h) => s + calcProfitLoss(h).currentValue, 0);
  const totalDailyPL = holdings.reduce((s, h) => s + calcDailyPL(h), 0);
  const totalDailyPercent = totalCurrent > 0 ? (totalDailyPL / (totalCurrent - totalDailyPL)) * 100 : 0;
  const isUp = totalDailyPL > 0;
  const isDown = totalDailyPL < 0;

  return (
    <div className="bg-card rounded-lg border p-5 fade-in-up">
      <div className="grid grid-cols-2 gap-4 text-center">
        <div>
          <div className="text-xs text-muted-foreground mb-1">总持仓</div>
          <div className="text-lg font-bold tabular text-card-foreground">
            ¥{totalCurrent.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">当日盈亏</div>
          <div
            className={`text-lg font-bold tabular ${
              isUp ? "fund-rise" : isDown ? "fund-fall" : "text-muted-foreground"
            }`}
          >
            {isUp ? "+" : ""}¥{totalDailyPL.toFixed(2)}
            <div className="text-xs font-normal">
              {isUp ? "+" : ""}{totalDailyPercent.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
