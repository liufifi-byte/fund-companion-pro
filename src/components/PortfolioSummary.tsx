import { FundHolding } from "@/types/fund";
import { calcProfitLoss } from "@/lib/fund-api";

interface PortfolioSummaryProps {
  holdings: FundHolding[];
}

export default function PortfolioSummary({ holdings }: PortfolioSummaryProps) {
  if (holdings.length === 0) return null;

  const totalInvested = holdings.reduce((s, h) => s + h.buyAmount, 0);
  const totalCurrent = holdings.reduce((s, h) => s + calcProfitLoss(h).currentValue, 0);
  const totalProfit = totalCurrent - totalInvested;
  const totalProfitPercent = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
  const isUp = totalProfit > 0;
  const isDown = totalProfit < 0;

  return (
    <div className="bg-card rounded-lg border p-5 fade-in-up">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-xs text-muted-foreground mb-1">总投入</div>
          <div className="text-lg font-bold tabular text-card-foreground">
            ¥{totalInvested.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">总市值</div>
          <div className="text-lg font-bold tabular text-card-foreground">
            ¥{totalCurrent.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">总盈亏</div>
          <div
            className={`text-lg font-bold tabular ${
              isUp ? "fund-rise" : isDown ? "fund-fall" : "text-muted-foreground"
            }`}
          >
            {isUp ? "+" : ""}¥{totalProfit.toFixed(2)}
            <div className="text-xs font-normal">
              {isUp ? "+" : ""}{totalProfitPercent.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
