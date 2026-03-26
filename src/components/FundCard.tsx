import { useState } from "react";
import { FundHolding, Purchase } from "@/types/fund";
import { calcHoldingFromTx, formatPnlAmount, formatPnlPct, formatPnlFull, formatUpdateTime, pnlColorClass } from "@/utils/holdingCalculations";
import { currencySymbol } from "@/lib/currency";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import EditPurchasesModal from "@/components/EditPurchasesModal";

interface FundCardProps {
  holding: FundHolding;
  onRemove: (id: string) => void;
  onUpdatePurchases: (id: string, purchases: Purchase[], realizedPnl?: number) => void;
  index: number;
}

export default function FundCard({ holding, onRemove, onUpdatePurchases, index }: FundCardProps) {
  const [expanded, setExpanded] = useState(false);
  const calc = calcHoldingFromTx(holding);
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

      {/* Core data: market value + cumulative PnL */}
      <div className="px-4 py-3 space-y-2">
        <div>
          <span className="text-[11px] text-muted-foreground mr-2">持有市值</span>
          <span className="text-[16px] tabular text-card-foreground">
            {sym}{calc.currentValue.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div>
          <span className="text-[11px] text-muted-foreground mr-2">累计收益</span>
          <span className={`text-[16px] font-semibold tabular ${pnlColorClass(calc.holdingPnl)}`}>
            {formatPnlFull(calc.holdingPnl, calc.holdingPnlPct, sym)}
          </span>
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

      {/* Footer: today PnL + update time — overflow-safe */}
      <div className="flex items-baseline justify-between px-4 pb-3 gap-2 flex-nowrap min-w-0 text-[12px] text-muted-foreground">
        <span className={`tabular whitespace-nowrap overflow-hidden text-ellipsis flex-1 min-w-0 ${pnlColorClass(calc.todayPnl)}`}>
          今日 {formatPnlFull(calc.todayPnl, calc.todayPnlPct, sym)}
        </span>
        <span className="tabular whitespace-nowrap shrink-0">更新于 {formatUpdateTime(holding.updatedAt)}</span>
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
