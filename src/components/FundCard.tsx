import { useState } from "react";
import { FundHolding } from "@/types/fund";
import { calcHolding } from "@/lib/holding-calc";
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
  const currencySymbol = holding.currency === "USD" ? "$" : holding.currency === "HKD" ? "HK$" : "¥";
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
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-card-foreground truncate" style={{ fontSize: 15 }}>{holding.name}</span>
          <span className="text-muted-foreground tabular" style={{ fontSize: 12 }}>{holding.code}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
            isStock ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
          }`}>
            {isStock ? "股票" : "基金"}
          </span>
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
            isUp ? "fund-rise fund-rise-bg" : isDown ? "fund-fall fund-fall-bg" : "text-muted-foreground bg-muted"
          }`}>
            {isUp ? <TrendingUp className="w-3 h-3" /> : isDown ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {isUp ? "+" : ""}{holding.dayChangePercent.toFixed(2)}%
          </span>
          <button onClick={() => onRemove(holding.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded active:scale-95" aria-label="删除">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="border-t mx-4" />

      {/* Detail grid 2x2 */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground" style={{ fontSize: 12 }}>买入本金</span>
          <span className="font-medium tabular text-card-foreground" style={{ fontSize: 12 }}>
            {currencySymbol}{calc.totalCost.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
            <EditPurchasesModal holding={holding} onUpdate={onUpdatePurchases} />
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground" style={{ fontSize: 12 }}>持有{isFund ? "份额" : "股数"}</span>
          <span className="font-medium tabular text-card-foreground" style={{ fontSize: 12 }}>
            {calc.totalShares.toLocaleString("zh-CN", { minimumFractionDigits: 2 })} {isFund ? "份" : "股"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground" style={{ fontSize: 12 }}>平均成本</span>
          <span className="font-medium tabular text-card-foreground" style={{ fontSize: 12 }}>
            {currencySymbol}{calc.avgCost.toFixed(navDecimals)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground" style={{ fontSize: 12 }}>{isFund ? "当前净值" : "当前价格"}</span>
          <span className="font-medium tabular text-card-foreground" style={{ fontSize: 12 }}>
            {currencySymbol}{holding.currentNav.toFixed(navDecimals)}
          </span>
        </div>
      </div>

      {/* Core highlight blocks */}
      <div className="grid grid-cols-2 gap-2 px-4 pb-3">
        <div className="bg-muted rounded-lg px-3 py-2.5">
          <div className="text-muted-foreground mb-1" style={{ fontSize: 11 }}>持有市值</div>
          <div className="font-semibold tabular text-card-foreground" style={{ fontSize: 18 }}>
            {currencySymbol}{calc.currentValue.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-muted rounded-lg px-3 py-2.5">
          <div className="text-muted-foreground mb-1" style={{ fontSize: 11 }}>累计收益</div>
          <div className={`font-semibold tabular ${pnlUp ? "fund-rise" : pnlDown ? "fund-fall" : "text-muted-foreground"}`} style={{ fontSize: 18 }}>
            {pnlUp ? "+" : ""}{currencySymbol}{calc.holdingPnlAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
          </div>
          <div className={`tabular ${pnlUp ? "fund-rise" : pnlDown ? "fund-fall" : "text-muted-foreground"}`} style={{ fontSize: 12 }}>
            {pnlUp ? "+" : ""}{(calc.holdingPnlPercent * 100).toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 pb-3 text-muted-foreground" style={{ fontSize: 12 }}>
        <span className={`tabular ${todayUp ? "fund-rise" : todayDown ? "fund-fall" : ""}`}>
          当日盈亏: {todayUp ? "+" : ""}{currencySymbol}{calc.todayPnlAmount.toFixed(2)}
        </span>
        <span className="tabular">更新于 {holding.updatedAt}</span>
      </div>

      {/* Expandable top holdings */}
      {isFund && holding.topHoldings && holding.topHoldings.length > 0 && (
        <>
          <div className="border-t mx-4" />
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-full justify-center py-2 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "收起持仓" : "前五持仓"}
          </button>
          {expanded && (
            <div className="px-4 pb-3 space-y-1">
              {holding.topHoldings.map((th, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
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