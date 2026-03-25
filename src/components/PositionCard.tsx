import { useState } from "react";
import { PortfolioPosition } from "@/types/transaction";
import { Trash2, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from "lucide-react";
import TransactionHistory from "@/components/TransactionHistory";

interface PositionCardProps {
  position: PortfolioPosition;
  onRemove: (code: string) => void;
  index: number;
}

export default function PositionCard({ position, onRemove, index }: PositionCardProps) {
  const [expanded, setExpanded] = useState(false);

  const {
    assetCode, assetName, quantity, weightedAvgCost, currentPrice,
    unrealizedPnL, unrealizedPnLPercent, realizedPnL,
    dayChangePercent, currency, updatedAt, transactions,
  } = position;

  const isUp = dayChangePercent > 0;
  const isDown = dayChangePercent < 0;
  const currencySymbol = currency && currency !== "CNY" ? "$" : "¥";
  const marketValue = currentPrice * quantity;

  return (
    <div
      className="bg-card rounded-lg border p-4 hover:shadow-md transition-shadow fade-in-up"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-card-foreground truncate text-sm">{assetName}</h3>
          </div>
          <span className="text-xs text-muted-foreground tabular">{assetCode}</span>
        </div>
        <button
          onClick={() => onRemove(assetCode)}
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
          {isUp ? "+" : ""}{dayChangePercent.toFixed(2)}%
        </span>
        <span className="text-xs text-muted-foreground">
          现价 <span className="tabular">{currentPrice.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
        </span>
      </div>

      {/* Key metrics */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">持仓数量</span>
          <span className="font-medium tabular text-card-foreground">
            {quantity.toLocaleString("zh-CN", { maximumFractionDigits: 4 })}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">加权平均成本</span>
          <span className="font-medium tabular text-card-foreground">
            {currencySymbol}{weightedAvgCost.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
          </span>
        </div>
      </div>

      {/* P&L Grid */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t">
        <div>
          <div className="text-xs text-muted-foreground mb-0.5">持有市值</div>
          <div className="text-sm font-semibold tabular text-card-foreground">
            {currencySymbol}{marketValue.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-0.5">浮动盈亏</div>
          <div
            className={`text-sm font-semibold tabular ${
              unrealizedPnL > 0 ? "fund-rise" : unrealizedPnL < 0 ? "fund-fall" : "text-muted-foreground"
            }`}
          >
            {unrealizedPnL > 0 ? "+" : ""}{unrealizedPnL.toFixed(2)}
            <span className="text-[10px] ml-0.5">
              ({unrealizedPnLPercent > 0 ? "+" : ""}{unrealizedPnLPercent.toFixed(2)}%)
            </span>
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-0.5">已实现盈亏</div>
          <div
            className={`text-sm font-semibold tabular ${
              realizedPnL > 0 ? "fund-rise" : realizedPnL < 0 ? "fund-fall" : "text-muted-foreground"
            }`}
          >
            {realizedPnL > 0 ? "+" : ""}{realizedPnL.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Expand toggle for transaction history */}
      {transactions.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-3 transition-colors w-full justify-center"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? "收起流水" : `查看流水 (${transactions.length}笔)`}
        </button>
      )}

      {expanded && <TransactionHistory transactions={transactions} />}

      {updatedAt && (
        <div className="text-[10px] text-muted-foreground mt-2 text-right tabular">
          更新于 {updatedAt}
        </div>
      )}
    </div>
  );
}
