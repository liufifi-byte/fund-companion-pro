import { useState } from "react";
import { FundHolding, Purchase, TransactionType } from "@/types/fund";
import { currencySymbol } from "@/lib/currency";
import { calcHoldingFromTx } from "@/utils/holdingCalculations";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Plus, Trash2, Loader2, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  holding: FundHolding;
  onUpdate: (id: string, purchases: Purchase[], realizedPnl?: number) => void;
}

/** Mock async NAV fetch for funds — simulates T-day confirmed NAV */
async function fetchFundNAV(code: string, date: string): Promise<number> {
  await new Promise((r) => setTimeout(r, 800));
  // Mock: base around currentNav with small random variance
  const base = 1.5 + Math.random() * 0.5;
  return parseFloat(base.toFixed(4));
}

export default function EditPurchasesModal({ holding, onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [realizedPnl, setRealizedPnl] = useState(0);

  // New transaction form state
  const [adding, setAdding] = useState<TransactionType | null>(null);
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newAmount, setNewAmount] = useState("");
  const [newNav, setNewNav] = useState("");
  const [newShares, setNewShares] = useState("");
  const [fetchingNav, setFetchingNav] = useState(false);
  const [fetchedNav, setFetchedNav] = useState<number | null>(null);

  const isFund = holding.type === "fund";
  const navLabel = isFund ? "净值" : "成交价";
  const navDecimals = isFund ? 4 : 2;
  const sym = currencySymbol(holding.currency);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setPurchases([...(holding.purchases || [])]);
      setRealizedPnl(holding.realizedPnl || 0);
      setAdding(null);
      setFetchedNav(null);
    }
    setOpen(isOpen);
  };

  const removePurchase = (idx: number) => {
    if (purchases.length <= 1) {
      toast.error("至少保留一条交易记录");
      return;
    }
    const updated = purchases.filter((_, i) => i !== idx);
    // Recalculate realized PnL from scratch
    const recalcPnl = recalcRealizedPnl(updated);
    setPurchases(updated);
    setRealizedPnl(recalcPnl);
    onUpdate(holding.id, updated, recalcPnl);
    toast.success("已删除");
  };

  const recalcRealizedPnl = (txns: Purchase[]): number => {
    let shares = 0;
    let cost = 0;
    let pnl = 0;
    for (const p of txns) {
      const t = p.type || "buy";
      if (t === "buy") {
        const s = p.buyNav > 0 ? p.amount / p.buyNav : 0;
        shares += s;
        cost += p.amount;
      } else {
        const sellShares = p.shares || (p.buyNav > 0 ? p.amount / p.buyNav : 0);
        const avg = shares > 0 ? cost / shares : 0;
        pnl += sellShares * (p.buyNav - avg);
        shares = Math.max(0, shares - sellShares);
        cost = shares * avg;
      }
    }
    return pnl;
  };

  // Calculate current total shares for sell validation
  const currentCalc = calcHolding({ ...holding, purchases, realizedPnl });

  const startAdding = (type: TransactionType) => {
    setAdding(type);
    setNewDate(new Date().toISOString().slice(0, 10));
    setNewAmount("");
    setNewNav("");
    setNewShares("");
    setFetchedNav(null);
  };

  // For funds: auto-fetch NAV when date changes
  const handleDateChange = async (date: string) => {
    setNewDate(date);
    if (isFund && date) {
      setFetchingNav(true);
      setFetchedNav(null);
      try {
        const nav = await fetchFundNAV(holding.code, date);
        setFetchedNav(nav);
        setNewNav(nav.toFixed(4));
      } catch {
        toast.error("获取净值失败");
      } finally {
        setFetchingNav(false);
      }
    }
  };

  const addTransaction = () => {
    if (!adding) return;

    if (adding === "buy") {
      if (isFund) {
        // Fund buy: amount + nav (auto-fetched or manual)
        const amount = parseFloat(newAmount);
        const nav = parseFloat(newNav);
        if (!amount || amount <= 0) { toast.error("请输入有效金额"); return; }
        if (!nav || nav <= 0) { toast.error("请输入有效净值"); return; }
        const p: Purchase = { date: newDate, amount, buyNav: nav, type: "buy" };
        const updated = [...purchases, p];
        setPurchases(updated);
        onUpdate(holding.id, updated, realizedPnl);
      } else {
        // Stock buy: price + shares
        const price = parseFloat(newNav);
        const shares = parseFloat(newShares);
        if (!price || price <= 0) { toast.error("请输入有效价格"); return; }
        if (!shares || shares <= 0) { toast.error("请输入有效数量"); return; }
        const amount = price * shares;
        const p: Purchase = { date: newDate, amount, buyNav: price, type: "buy", shares };
        const updated = [...purchases, p];
        setPurchases(updated);
        onUpdate(holding.id, updated, realizedPnl);
      }
    } else {
      // SELL
      if (isFund) {
        // Fund sell: shares/amount + nav (auto-fetched)
        const sellShares = parseFloat(newShares);
        const nav = parseFloat(newNav);
        if (!sellShares || sellShares <= 0) { toast.error("请输入有效份额"); return; }
        if (!nav || nav <= 0) { toast.error("请输入有效净值"); return; }
        if (sellShares > currentCalc.totalShares) { toast.error(`最多可卖出 ${currentCalc.totalShares.toFixed(2)} 份`); return; }
        const amount = sellShares * nav;
        const avgCost = currentCalc.avgCost;
        const txRealizedPnl = sellShares * (nav - avgCost);
        const newRealizedPnl = realizedPnl + txRealizedPnl;
        const p: Purchase = { date: newDate, amount, buyNav: nav, type: "sell", shares: sellShares };
        const updated = [...purchases, p];
        setPurchases(updated);
        setRealizedPnl(newRealizedPnl);
        onUpdate(holding.id, updated, newRealizedPnl);
      } else {
        // Stock sell: price + shares
        const price = parseFloat(newNav);
        const shares = parseFloat(newShares);
        if (!price || price <= 0) { toast.error("请输入有效价格"); return; }
        if (!shares || shares <= 0) { toast.error("请输入有效数量"); return; }
        if (shares > currentCalc.totalShares) { toast.error(`最多可卖出 ${currentCalc.totalShares.toFixed(2)} 股`); return; }
        const amount = price * shares;
        const avgCost = currentCalc.avgCost;
        const txRealizedPnl = shares * (price - avgCost);
        const newRealizedPnl = realizedPnl + txRealizedPnl;
        const p: Purchase = { date: newDate, amount, buyNav: price, type: "sell", shares };
        const updated = [...purchases, p];
        setPurchases(updated);
        setRealizedPnl(newRealizedPnl);
        onUpdate(holding.id, updated, newRealizedPnl);
      }
    }

    setAdding(null);
    setNewAmount("");
    setNewNav("");
    setNewShares("");
    setFetchedNav(null);
    toast.success(adding === "buy" ? "已新增加仓记录" : "已新增减仓记录");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <button className="text-muted-foreground hover:text-foreground p-0.5 active:scale-95" aria-label="编辑交易记录">
          <Pencil className="w-3 h-3" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{holding.name} · 交易记录</DialogTitle>
        </DialogHeader>

        {/* Transaction list */}
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {purchases.map((p, i) => {
            const txType = p.type || "buy";
            const isBuy = txType === "buy";
            const txShares = p.shares || (p.buyNav > 0 ? p.amount / p.buyNav : 0);
            return (
              <div key={i} className={`flex items-center gap-2 text-xs rounded-md px-3 py-2 ${isBuy ? "bg-muted/50" : "bg-destructive/5"}`}>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${isBuy ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                  {isBuy ? "买" : "卖"}
                </span>
                <span className="text-muted-foreground w-[70px] shrink-0">{p.date}</span>
                <span className="tabular flex-1">
                  {sym}{p.amount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                </span>
                <span className="tabular text-muted-foreground">
                  {navLabel} {p.buyNav.toFixed(navDecimals)}
                </span>
                <span className="tabular text-muted-foreground">
                  {txShares.toFixed(isFund ? 2 : 0)}{isFund ? "份" : "股"}
                </span>
                <button onClick={() => removePurchase(i)} className="text-muted-foreground hover:text-destructive p-0.5">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Realized PnL summary */}
        {realizedPnl !== 0 && (
          <div className="text-[11px] text-muted-foreground px-1">
            已实现盈亏: <span className={realizedPnl > 0 ? "fund-rise" : "fund-fall"}>
              {realizedPnl > 0 ? "+" : ""}{sym}{realizedPnl.toFixed(2)}
            </span>
          </div>
        )}

        {/* Add transaction form */}
        {adding ? (
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-medium ${adding === "buy" ? "text-primary" : "text-destructive"}`}>
                {adding === "buy" ? "加仓" : "减仓"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <label className="text-[10px] text-muted-foreground">交易日期</label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={e => isFund ? handleDateChange(e.target.value) : setNewDate(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              {/* Fund: show NAV status */}
              {isFund && (
                <div className="col-span-2">
                  {fetchingNav ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground py-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> 正在获取 T 日净值...
                    </div>
                  ) : fetchedNav !== null ? (
                    <div className="text-[11px] text-primary py-1">
                      已自动获取 T 日净值: {fetchedNav.toFixed(4)}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Stock: price + shares */}
              {!isFund && (
                <>
                  <div>
                    <label className="text-[10px] text-muted-foreground">成交价格 ({sym})</label>
                    <Input type="number" placeholder="0.00" value={newNav} onChange={e => setNewNav(e.target.value)} className="h-8 text-xs tabular" min="0" step="0.01" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">成交数量 (股)</label>
                    <Input type="number" placeholder="100" value={newShares} onChange={e => setNewShares(e.target.value)} className="h-8 text-xs tabular" min="0" step="1" />
                  </div>
                </>
              )}

              {/* Fund buy: amount + nav */}
              {isFund && adding === "buy" && (
                <>
                  <div>
                    <label className="text-[10px] text-muted-foreground">买入金额 ({sym})</label>
                    <Input type="number" placeholder="10000" value={newAmount} onChange={e => setNewAmount(e.target.value)} className="h-8 text-xs tabular" min="0" step="0.01" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">确认净值 ({sym})</label>
                    <Input type="number" placeholder="1.3100" value={newNav} onChange={e => setNewNav(e.target.value)} className="h-8 text-xs tabular" min="0" step="0.0001" />
                  </div>
                </>
              )}

              {/* Fund sell: shares + nav */}
              {isFund && adding === "sell" && (
                <>
                  <div>
                    <label className="text-[10px] text-muted-foreground">卖出份额</label>
                    <Input type="number" placeholder={`最多 ${currentCalc.totalShares.toFixed(2)}`} value={newShares} onChange={e => setNewShares(e.target.value)} className="h-8 text-xs tabular" min="0" step="0.01" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">确认净值 ({sym})</label>
                    <Input type="number" placeholder="1.3100" value={newNav} onChange={e => setNewNav(e.target.value)} className="h-8 text-xs tabular" min="0" step="0.0001" />
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={addTransaction} disabled={fetchingNav}>保存</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAdding(null)}>取消</Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => startAdding("buy")}>
              <ArrowDownCircle className="w-3 h-3 mr-1 text-primary" /> 加仓
            </Button>
            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => startAdding("sell")}>
              <ArrowUpCircle className="w-3 h-3 mr-1 text-destructive" /> 减仓
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
