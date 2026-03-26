import { useState } from "react";
import { FundHolding } from "@/types/fund";
import { calcHolding } from "@/lib/holding-calc";
import { currencySymbol } from "@/lib/currency";
import { pnlColorClass, formatPnl, formatPnlPercent } from "@/lib/pnl-color";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import EditPurchasesModal from "@/components/EditPurchasesModal";
import { Purchase } from "@/types/fund";

interface FundCardProps {
  holding: FundHolding;
  onRemove: (id: string) => void;
  onUpdatePurchases: (id: string, purchases: Purchase[], realizedPnl?: number) => void;
  index: number;
}

export default function FundCard({ holding, onRemove, onUpdatePurchases, index }: FundCardProps) {
  const [expanded, setExpanded] = useState(false);
  const calc = calcHolding(holding);
  const isFund = holding.type === "fund";
  const sym = currencySymbol(holding.currency);
  const navDecimals = isFund ? 4 : 2;

  return (
    <div
      className="bg-card rounded-lg border hover:shadow-md transition-shadow fade-in-up"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Row 1: Name + code + badge + delete */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <span className="font-medium text-card-foreground truncate text-[14px]">{holding.name}</span>
          <span className="text-muted-foreground tabular text-[12px] shrink-0">{holding.code}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
            holding.type === "stock" ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"
          }`}>
            {holding.type === "stock" ? "股票" : "基金"}
          </span>
        </div>
        <button onClick={() => onRemove(holding.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded active:scale-95 shrink-0" aria-label="删除">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="border-t mx-4" />

      {/* Core data: market value (left) + cumulative PnL (right) */}
      <div className="grid grid-cols-2 gap-4 px-4 py-3">
        <div>
          <div className="text-[11px] text-muted-foreground mb-1">持有市值</div>
          <div className="text-[16px] tabular text-card-foreground">
            {sym}{calc.currentValue.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground mb-1">累计收益</div>
          <div className={`flex items-baseline gap-1 tabular ${pnlColorClass(calc.holdingPnlAmount)}`}>
            <span className="text-[20px] font-semibold shrink min-w-0">{formatPnl(calc.holdingPnlAmount, sym)}</span>
            <span className="text-[13px] shrink-0">{formatPnlPercent(calc.holdingPnlPercent * 100)}</span>
          </div>
        </div>
      </div>

      {/* Detail grid 2x2 */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-4 py-2">
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

      {/* Footer: today PnL + update time */}
      <div className="flex items-center justify-between px-4 pb-3 text-[12px] text-muted-foreground">
        <span className={`tabular ${pnlColorClass(calc.todayPnlAmount)}`}>
          今日 {formatPnlPercent(holding.dayChangePercent)} ({formatPnl(calc.todayPnlAmount, sym)})
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
                  <span className={`tabular font-medium ${pnlColorClass(th.changePercent)}`}>
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
