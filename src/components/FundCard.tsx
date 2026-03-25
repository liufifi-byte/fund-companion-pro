import { FundHolding } from "@/types/fund";
import { calcHolding } from "@/lib/holding-calc";
import { Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import EditPurchasesModal from "@/components/EditPurchasesModal";
import { Purchase } from "@/types/fund";

interface FundCardProps {
  holding: FundHolding;
  onRemove: (id: string) => void;
  onUpdatePurchases: (id: string, purchases: Purchase[]) => void;
  index: number;
}

export default function FundCard({ holding, onRemove, onUpdatePurchases, index }: FundCardProps) {
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
      className="bg-card rounded-lg border p-4 hover:shadow-md transition-shadow fade-in-up"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Row 1: Name + type + delete */}
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <h3 className="font-semibold text-card-foreground truncate text-sm">{holding.name}</h3>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
            isStock ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
          }`}>
            {isStock ? "股票" : "基金"}
          </span>
        </div>
        <button onClick={() => onRemove(holding.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1 -mr-1 rounded active:scale-95" aria-label="删除">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Row 2: Code + day change */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-muted-foreground tabular">{holding.code}</span>
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
          isUp ? "fund-rise fund-rise-bg" : isDown ? "fund-fall fund-fall-bg" : "text-muted-foreground bg-muted"
        }`}>
          {isUp ? <TrendingUp className="w-3 h-3" /> : isDown ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          {isUp ? "+" : ""}{holding.dayChangePercent.toFixed(2)}%
        </span>
      </div>

      <div className="border-t pt-3 space-y-2">
        {/* Row 3: Cost + Shares */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
              买入本金
              <EditPurchasesModal holding={holding} onUpdate={onUpdatePurchases} />
            </div>
            <div className="text-sm font-medium tabular text-card-foreground">
              {currencySymbol}{calc.totalCost.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">持有份额</div>
            <div className="text-sm font-medium tabular text-card-foreground">
              {calc.totalShares.toLocaleString("zh-CN", { minimumFractionDigits: 2 })} 份
            </div>
          </div>
        </div>

        {/* Row 4: Avg cost + Current nav */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">平均成本</div>
            <div className="text-sm font-medium tabular text-card-foreground">
              {currencySymbol}{calc.avgCost.toFixed(navDecimals)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">{isFund ? "当前净值" : "当前价格"}</div>
            <div className="text-sm font-medium tabular text-card-foreground">
              {currencySymbol}{holding.currentNav.toFixed(navDecimals)}
            </div>
          </div>
        </div>
      </div>

      {/* Row 5: Market value + Cumulative PnL (highlighted) */}
      <div className="grid grid-cols-2 gap-3 pt-3 mt-2 border-t">
        <div>
          <div className="text-xs text-muted-foreground mb-0.5">持有市值</div>
          <div className="text-lg font-semibold tabular text-card-foreground">
            {currencySymbol}{calc.currentValue.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-0.5">累计收益</div>
          <div className={`text-lg font-semibold tabular ${pnlUp ? "fund-rise" : pnlDown ? "fund-fall" : "text-muted-foreground"}`}>
            {pnlUp ? "+" : ""}{currencySymbol}{calc.holdingPnlAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
            <span className="text-xs ml-1">
              {pnlUp ? "+" : ""}{(calc.holdingPnlPercent * 100).toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Row 6: Today PnL (small) */}
      <div className="mt-2 flex items-center justify-between">
        <span className={`text-xs tabular ${todayUp ? "fund-rise" : todayDown ? "fund-fall" : "text-muted-foreground"}`}>
          当日盈亏: {todayUp ? "+" : ""}{currencySymbol}{calc.todayPnlAmount.toFixed(2)}
        </span>
        <span className="text-[10px] text-muted-foreground tabular">
          更新于 {holding.updatedAt}
        </span>
      </div>

      {/* Fund top holdings */}
      {isFund && holding.topHoldings && holding.topHoldings.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <div className="text-xs text-muted-foreground mb-2">前五持仓</div>
          <div className="space-y-1">
            {holding.topHoldings.map((th, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-card-foreground truncate max-w-[60%]">{th.name}</span>
                <span className={`tabular font-medium ${th.changePercent > 0 ? "fund-rise" : th.changePercent < 0 ? "fund-fall" : "text-muted-foreground"}`}>
                  {th.changePercent > 0 ? "+" : ""}{th.changePercent.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
