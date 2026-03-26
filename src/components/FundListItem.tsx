import { useState } from "react";
import { FundHolding, Purchase } from "@/types/fund";
import { calcHolding } from "@/lib/holding-calc";
import { currencySymbol } from "@/lib/currency";
import { pnlColorClass, formatPnlFull } from "@/lib/pnl-color";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import EditPurchasesModal from "@/components/EditPurchasesModal";

interface FundListItemProps {
  holding: FundHolding;
  onRemove: (id: string) => void;
  onUpdatePurchases: (id: string, purchases: Purchase[], realizedPnl?: number) => void;
}

export default function FundListItem({ holding, onRemove, onUpdatePurchases }: FundListItemProps) {
  const [expanded, setExpanded] = useState(false);
  const calc = calcHolding(holding);
  const isFund = holding.type === "fund";
  const sym = currencySymbol(holding.currency);
  const navDecimals = isFund ? 4 : 2;

  return (
    <div className="bg-card rounded-lg border transition-shadow">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-3 text-left active:bg-muted/50 transition-colors overflow-hidden"
      >
        <div className="min-w-0 flex-1 mr-2">
          <div className="font-medium text-card-foreground truncate text-[14px] leading-tight">{holding.name}</div>
          <div className="text-[11px] text-muted-foreground tabular">{holding.code}</div>
        </div>
        <div className="text-right shrink-0 flex items-center gap-1">
          <div className="min-w-0">
            <div className="text-[13px] font-semibold tabular text-card-foreground truncate">
              {sym}{calc.currentValue.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
            </div>
            <div className={`text-[11px] font-medium tabular truncate ${pnlColorClass(calc.todayPnlAmount)}`}>
              {formatPnlFull(calc.todayPnlAmount, holding.dayChangePercent, sym)}
            </div>
          </div>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t px-3 pb-3 pt-2 space-y-2 animate-in slide-in-from-top-1 duration-200">
          <div className="bg-muted rounded-md px-3 py-2 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">累计收益</span>
            <span className={`text-[14px] font-semibold tabular ${pnlColorClass(calc.holdingPnlAmount)}`}>
              {formatPnlFull(calc.holdingPnlAmount, calc.holdingPnlPercent * 100, sym)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="flex justify-between">
              <span className="text-[11px] text-muted-foreground">买入本金</span>
              <span className="text-[11px] tabular text-card-foreground">
                {sym}{calc.totalCost.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[11px] text-muted-foreground">持有{isFund ? "份额" : "股数"}</span>
              <span className="text-[11px] tabular text-card-foreground">
                {calc.totalShares.toLocaleString("zh-CN", { minimumFractionDigits: 2 })} {isFund ? "份" : "股"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[11px] text-muted-foreground">平均成本</span>
              <span className="text-[11px] tabular text-card-foreground">
                {sym}{calc.avgCost.toFixed(navDecimals)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[11px] text-muted-foreground">{isFund ? "当前净值" : "当前价格"}</span>
              <span className="text-[11px] tabular text-card-foreground">
                {sym}{holding.currentNav.toFixed(navDecimals)}
              </span>
            </div>
          </div>

          {isFund && holding.topHoldings && holding.topHoldings.length > 0 && (
            <div className="pt-1 space-y-0.5">
              <div className="text-[10px] text-muted-foreground mb-1">前五持仓</div>
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

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1">
              <EditPurchasesModal holding={holding} onUpdate={onUpdatePurchases} />
              <span className="text-[10px] text-muted-foreground tabular">更新于 {holding.updatedAt}</span>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onRemove(holding.id); }} className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded active:scale-95" aria-label="删除">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
