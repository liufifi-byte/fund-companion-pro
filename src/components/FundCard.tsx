import { useState } from "react";
import { FundHolding } from "@/types/fund";
import { calcHolding } from "@/lib/holding-calc";
import { currencySymbol } from "@/lib/currency";
import { Trash2, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from "lucide-react";
import EditPurchasesModal from "@/components/EditPurchasesModal";
import { Purchase } from "@/types/fund";

interface FundCardProps {
  holding: FundHolding;
  onRemove: (id: string) => void;
  onUpdatePurchases: (id: string, purchases: Purchase[]) => void;
  index: number;
}

export default function FundCard({ holding, onRemove, onUpdatePurchases, index }: FundCardProps) {
  const [expanded, setExpanded] = useState(false);
  const calc = calcHolding(holding);
  const isUp = holding.dayChangePercent > 0;
  const isDown = holding.dayChangePercent < 0;
  const isStock = holding.type === "stock";
  const isFund = holding.type === "fund";
  const sym = currencySymbol(holding.currency);
  const navDecimals = isFund ? 4 : 2;

  const pnlUp = calc.holdingPnlAmount > 0;
  const pnlDown = calc.holdingPnlAmount < 0;
  const todayUp = calc.todayPnlAmount > 0;
  const todayDown = calc.todayPnlAmount < 0;

  return (
    <div
      className="bg-card rounded-lg border hover:shadow-md transition-shadow fade-in-up"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-card-foreground truncate text-[15px]">{holding.name}</span>
            <span className="text-muted-foreground tabular text-[12px]">{holding.code}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
            isStock ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"
          }`}>
            {isStock ? "股票" : "基金"}
          </span>
          <button onClick={() => onRemove(holding.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded active:scale-95" aria-label="删除">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Market value + cumulative PnL — hero area */}
      <div className="px-4 pb-3">
        <div className="text-[22px] font-bold tabular text-card-foreground leading-tight">
          {sym}{calc.currentValue.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className={`text-[13px] font-medium tabular ${pnlUp ? "fund-rise" : pnlDown ? "fund-fall" : "text-muted-foreground"}`}>
            {pnlUp ? "+" : ""}{sym}{calc.holdingPnlAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })} ({pnlUp ? "+" : ""}{(calc.holdingPnlPercent * 100).toFixed(2)}%)
          </span>
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-full ${
            isUp ? "fund-rise fund-rise-bg" : isDown ? "fund-fall fund-fall-bg" : "text-muted-foreground bg-muted"
          }`}>
            {isUp ? <TrendingUp className="w-3 h-3" /> : isDown ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            今日 {isUp ? "+" : ""}{holding.dayChangePercent.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="border-t mx-4" />

      {/* Detail grid 2x2 */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-4 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-[11px]">买入本金</span>
          <span className="font-medium tabular text-card-foreground text-[11px]">
            {sym}{calc.totalCost.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
            <EditPurchasesModal holding={holding} onUpdate={onUpdatePurchases} />
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-[11px]">持有{isFund ? "份额" : "股数"}</span>
          <span className="font-medium tabular text-card-foreground text-[11px]">
            {calc.totalShares.toLocaleString("zh-CN", { minimumFractionDigits: 2 })} {isFund ? "份" : "股"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-[11px]">平均成本</span>
          <span className="font-medium tabular text-card-foreground text-[11px]">
            {sym}{calc.avgCost.toFixed(navDecimals)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-[11px]">{isFund ? "当前净值" : "当前价格"}</span>
          <span className="font-medium tabular text-card-foreground text-[11px]">
            {sym}{holding.currentNav.toFixed(navDecimals)}
          </span>
        </div>
      </div>

      {/* Footer: today PnL merged + update time */}
      <div className="flex items-center justify-between px-4 pb-3 text-muted-foreground text-[11px]">
        <span className={`tabular ${todayUp ? "fund-rise" : todayDown ? "fund-fall" : ""}`}>
          当日盈亏: {todayUp ? "+" : ""}{sym}{calc.todayPnlAmount.toFixed(2)} ({isUp ? "+" : ""}{holding.dayChangePercent.toFixed(2)}%)
        </span>
        <span className="tabular">更新于 {holding.updatedAt}</span>
      </div>

      {/* Expandable top holdings */}
      {isFund && holding.topHoldings && holding.topHoldings.length > 0 && (
        <>
          <div className="border-t mx-4" />
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground w-full justify-center py-2 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "收起持仓" : "前五持仓"}
          </button>
          {expanded && (
            <div className="px-4 pb-3 space-y-0.5">
              {holding.topHoldings.map((th, i) => (
                <div key={i} className="flex items-center justify-between text-[11px]">
                  <span className="text-card-foreground truncate max-w-[60%]">{th.name}</span>
                  <span className={`tabular font-medium ${th.changePercent > 0 ? "fund-rise" : th.changePercent < 0 ? "fund-fall" : "text-muted-foreground"}`}>
                    {th.changePercent > 0 ? "+" : ""}{th.changePercent.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
