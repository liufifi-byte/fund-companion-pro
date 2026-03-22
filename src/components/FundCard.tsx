import { FundHolding } from "@/types/fund";
import { calcProfitLoss } from "@/lib/fund-api";
import { Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface FundCardProps {
  holding: FundHolding;
  onRemove: (id: string) => void;
  index: number;
}

export default function FundCard({ holding, onRemove, index }: FundCardProps) {
  const { profit, profitPercent, currentValue } = calcProfitLoss(holding);
  const isUp = holding.dayChangePercent > 0;
  const isDown = holding.dayChangePercent < 0;
  const profitUp = profit > 0;
  const profitDown = profit < 0;
  const isStock = holding.type === "stock";
  const currencySymbol = isStock && holding.currency !== "CNY" ? "$" : "¥";

  return (
    <div
      className="bg-card rounded-lg border p-4 hover:shadow-md transition-shadow fade-in-up"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-card-foreground truncate text-sm">
              {holding.name}
            </h3>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
              isStock ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
            }`}>
              {isStock ? "股票" : "基金"}
            </span>
          </div>
          <span className="text-xs text-muted-foreground tabular">{holding.code}</span>
        </div>
        <button
          onClick={() => onRemove(holding.id)}
          className="text-muted-foreground hover:text-destructive transition-colors p-1 -mr-1 rounded active:scale-95"
          aria-label="删除"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Day change badge */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            isUp ? "fund-rise fund-rise-bg" : isDown ? "fund-fall fund-fall-bg" : "text-muted-foreground bg-muted"
          }`}
        >
          {isUp ? <TrendingUp className="w-3 h-3" /> : isDown ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          {isUp ? "+" : ""}{holding.dayChangePercent.toFixed(2)}%
        </span>
        <span className="text-xs text-muted-foreground">
          {isStock ? "现价" : "估值"}{" "}
          <span className="tabular">{holding.currentNav.toFixed(isStock ? 2 : 4)}</span>
        </span>
      </div>

      {/* P&L */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t">
        <div>
          <div className="text-xs text-muted-foreground mb-0.5">持有市值</div>
          <div className="text-sm font-semibold tabular text-card-foreground">
            {currencySymbol}{currentValue.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-0.5">预估盈亏</div>
          <div
            className={`text-sm font-semibold tabular ${
              profitUp ? "fund-rise" : profitDown ? "fund-fall" : "text-muted-foreground"
            }`}
          >
            {profitUp ? "+" : ""}{profit.toFixed(2)}
            <span className="text-xs font-normal ml-1">
              ({profitUp ? "+" : ""}{profitPercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      <div className="text-[10px] text-muted-foreground mt-2 text-right tabular">
        更新于 {holding.updatedAt}
      </div>
    </div>
  );
}
