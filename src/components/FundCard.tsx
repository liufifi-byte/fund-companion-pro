import { useState } from "react";
import { FundHolding } from "@/types/fund";
import { calcProfitLoss, calcDailyPL } from "@/lib/fund-api";
import { Trash2, TrendingUp, TrendingDown, Minus, Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface FundCardProps {
  holding: FundHolding;
  onRemove: (id: string) => void;
  onUpdateAmount: (id: string, newAmount: number) => void;
  onUpdateCostPrice?: (id: string, costPrice: number) => void;
  index: number;
}

export default function FundCard({ holding, onRemove, onUpdateAmount, onUpdateCostPrice, index }: FundCardProps) {
  const [editing, setEditing] = useState(false);
  const [editAmount, setEditAmount] = useState(holding.buyAmount.toString());
  const [editingCost, setEditingCost] = useState(false);
  const [editCostPrice, setEditCostPrice] = useState(holding.costPrice?.toString() || "");

  const { profit, profitPercent, currentValue } = calcProfitLoss(holding);
  const dailyPL = calcDailyPL(holding);
  const isUp = holding.dayChangePercent > 0;
  const isDown = holding.dayChangePercent < 0;
  const dailyUp = dailyPL > 0;
  const dailyDown = dailyPL < 0;
  const isStock = holding.type === "stock";
  const isFund = holding.type === "fund";
  const currencySymbol = isStock && holding.currency !== "CNY" ? "$" : "¥";

  // Cost-based P&L for stocks
  const hasCost = isStock && holding.costPrice && holding.costPrice > 0;
  const costPL = hasCost ? ((holding.currentNav - holding.costPrice!) / holding.costPrice!) * 100 : 0;
  const costPLAmount = hasCost
    ? (holding.buyAmount / holding.costPrice!) * (holding.currentNav - holding.costPrice!)
    : 0;

  const handleSaveAmount = () => {
    const num = parseFloat(editAmount);
    if (num > 0) {
      onUpdateAmount(holding.id, num);
      setEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditAmount(holding.buyAmount.toString());
    setEditing(false);
  };

  const handleSaveCostPrice = () => {
    const num = parseFloat(editCostPrice);
    if (num > 0 && onUpdateCostPrice) {
      onUpdateCostPrice(holding.id, num);
      setEditingCost(false);
    }
  };

  const handleCancelCostEdit = () => {
    setEditCostPrice(holding.costPrice?.toString() || "");
    setEditingCost(false);
  };

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

      {/* Amount row with edit */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-muted-foreground">持仓金额:</span>
        {editing ? (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              className="h-6 w-24 text-xs tabular px-2"
              min="0"
              step="0.01"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveAmount();
                if (e.key === "Escape") handleCancelEdit();
              }}
            />
            <button onClick={handleSaveAmount} className="text-primary hover:text-primary/80 p-0.5 active:scale-95">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleCancelEdit} className="text-muted-foreground hover:text-foreground p-0.5 active:scale-95">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium tabular text-card-foreground">
              {currencySymbol}{holding.buyAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
            </span>
            <button
              onClick={() => { setEditAmount(holding.buyAmount.toString()); setEditing(true); }}
              className="text-muted-foreground hover:text-foreground p-0.5 active:scale-95"
              aria-label="修改金额"
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Cost price row for stocks */}
      {isStock && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-muted-foreground">成本价:</span>
          {editingCost ? (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={editCostPrice}
                onChange={(e) => setEditCostPrice(e.target.value)}
                className="h-6 w-24 text-xs tabular px-2"
                min="0"
                step="0.01"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveCostPrice();
                  if (e.key === "Escape") handleCancelCostEdit();
                }}
              />
              <button onClick={handleSaveCostPrice} className="text-primary hover:text-primary/80 p-0.5 active:scale-95">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleCancelCostEdit} className="text-muted-foreground hover:text-foreground p-0.5 active:scale-95">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium tabular text-card-foreground">
                {hasCost ? `${currencySymbol}${holding.costPrice!.toFixed(2)}` : "未设置"}
              </span>
              <button
                onClick={() => { setEditCostPrice(holding.costPrice?.toString() || ""); setEditingCost(true); }}
                className="text-muted-foreground hover:text-foreground p-0.5 active:scale-95"
                aria-label="修改成本价"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* P&L */}
      <div className={`grid ${hasCost ? "grid-cols-3" : "grid-cols-2"} gap-3 pt-3 border-t`}>
        <div>
          <div className="text-xs text-muted-foreground mb-0.5">持有市值</div>
          <div className="text-sm font-semibold tabular text-card-foreground">
            {currencySymbol}{currentValue.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-0.5">当日盈亏</div>
          <div
            className={`text-sm font-semibold tabular ${
              dailyUp ? "fund-rise" : dailyDown ? "fund-fall" : "text-muted-foreground"
            }`}
          >
            {dailyUp ? "+" : ""}{dailyPL.toFixed(2)}
          </div>
        </div>
        {hasCost && (
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">持仓盈亏</div>
            <div
              className={`text-sm font-semibold tabular ${
                costPLAmount > 0 ? "fund-rise" : costPLAmount < 0 ? "fund-fall" : "text-muted-foreground"
              }`}
            >
              {costPLAmount > 0 ? "+" : ""}{costPLAmount.toFixed(2)}
              <span className="text-[10px] ml-0.5">
                ({costPL > 0 ? "+" : ""}{costPL.toFixed(2)}%)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Fund top holdings */}
      {isFund && holding.topHoldings && holding.topHoldings.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <div className="text-xs text-muted-foreground mb-2">前五持仓</div>
          <div className="space-y-1">
            {holding.topHoldings.map((th, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-card-foreground truncate max-w-[60%]">
                  {th.name}
                </span>
                <span
                  className={`tabular font-medium ${
                    th.changePercent > 0 ? "fund-rise" : th.changePercent < 0 ? "fund-fall" : "text-muted-foreground"
                  }`}
                >
                  {th.changePercent > 0 ? "+" : ""}{th.changePercent.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-[10px] text-muted-foreground mt-2 text-right tabular">
        更新于 {holding.updatedAt}
      </div>
    </div>
  );
}
