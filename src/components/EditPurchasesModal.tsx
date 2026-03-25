import { useState } from "react";
import { FundHolding, Purchase } from "@/types/fund";
import { currencySymbol } from "@/lib/currency";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  holding: FundHolding;
  onUpdate: (id: string, purchases: Purchase[]) => void;
}

export default function EditPurchasesModal({ holding, onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [adding, setAdding] = useState(false);
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newAmount, setNewAmount] = useState("");
  const [newNav, setNewNav] = useState("");

  const isFund = holding.type === "fund";
  const navLabel = isFund ? "买入净值" : "买入价格";
  const navDecimals = isFund ? 4 : 2;
  const sym = currencySymbol(holding.currency);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setPurchases([...(holding.purchases || [])]);
      setAdding(false);
    }
    setOpen(isOpen);
  };

  const removePurchase = (idx: number) => {
    if (purchases.length <= 1) {
      toast.error("至少保留一条买入记录");
      return;
    }
    const updated = purchases.filter((_, i) => i !== idx);
    setPurchases(updated);
    onUpdate(holding.id, updated);
    toast.success("已删除");
  };

  const addPurchase = () => {
    const amount = parseFloat(newAmount);
    const nav = parseFloat(newNav);
    if (!amount || amount <= 0) { toast.error("请输入有效金额"); return; }
    if (!nav || nav <= 0) { toast.error("请输入有效价格"); return; }

    const p: Purchase = { date: newDate, amount, buyNav: nav };
    const updated = [...purchases, p];
    setPurchases(updated);
    onUpdate(holding.id, updated);
    setAdding(false);
    setNewAmount("");
    setNewNav("");
    toast.success("已新增买入记录");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <button className="text-muted-foreground hover:text-foreground p-0.5 active:scale-95" aria-label="编辑买入记录">
          <Pencil className="w-3 h-3" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{holding.name} · 买入记录</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {purchases.map((p, i) => (
            <div key={i} className="flex items-center gap-3 text-xs bg-muted/50 rounded-md px-3 py-2">
              <span className="text-muted-foreground w-20 shrink-0">{p.date}</span>
              <span className="tabular flex-1">{sym}{p.amount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</span>
              <span className="tabular text-muted-foreground">{navLabel} {p.buyNav.toFixed(navDecimals)}</span>
              <span className="tabular text-muted-foreground">{(p.amount / p.buyNav).toFixed(navDecimals)}{isFund ? "份" : "股"}</span>
              <button onClick={() => removePurchase(i)} className="text-muted-foreground hover:text-destructive p-0.5">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {adding ? (
          <div className="space-y-2 border-t pt-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">日期</label>
                <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">金额 ({sym})</label>
                <Input type="number" placeholder="10000" value={newAmount} onChange={e => setNewAmount(e.target.value)} className="h-8 text-xs tabular" min="0" step="0.01" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">{navLabel} ({sym})</label>
                <Input type="number" placeholder="1.3100" value={newNav} onChange={e => setNewNav(e.target.value)} className="h-8 text-xs tabular" min="0" step="0.0001" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={addPurchase}>保存</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAdding(false)}>取消</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => setAdding(true)}>
            <Plus className="w-3 h-3 mr-1" /> 新增一笔买入
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
