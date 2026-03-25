import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Transaction } from "@/types/transaction";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface AddTransactionModalProps {
  onAdd: (tx: Transaction) => void;
}

export default function AddTransactionModal({ onAdd }: AddTransactionModalProps) {
  const [open, setOpen] = useState(false);
  const [assetCode, setAssetCode] = useState("");
  const [assetName, setAssetName] = useState("");
  const [type, setType] = useState<"BUY" | "SELL">("BUY");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [fee, setFee] = useState("0");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const resetForm = () => {
    setAssetCode("");
    setAssetName("");
    setType("BUY");
    setPrice("");
    setQuantity("");
    setFee("0");
    setDate(new Date().toISOString().slice(0, 10));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = assetCode.trim();
    const name = assetName.trim();
    const p = parseFloat(price);
    const q = parseFloat(quantity);
    const f = parseFloat(fee) || 0;

    if (!code) { toast.error("请输入资产代码"); return; }
    if (!name) { toast.error("请输入资产名称"); return; }
    if (!p || p <= 0) { toast.error("请输入有效单价"); return; }
    if (!q || q <= 0) { toast.error("请输入有效数量"); return; }

    const tx: Transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      assetCode: code.toUpperCase(),
      assetName: name,
      type,
      price: p,
      quantity: q,
      fee: f,
      date,
    };

    onAdd(tx);
    toast.success(`已记录${type === "BUY" ? "买入" : "卖出"} ${name}`);
    resetForm();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" />
          记一笔
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">记录交易</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div className="flex gap-1 p-0.5 bg-muted rounded-lg w-fit">
            {(["BUY", "SELL"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  type === t
                    ? t === "BUY"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-destructive text-destructive-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "BUY" ? "买入" : "卖出"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">资产代码</label>
              <Input
                placeholder="如 AAPL, 110011"
                value={assetCode}
                onChange={(e) => setAssetCode(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">资产名称</label>
              <Input
                placeholder="如 苹果公司"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">成交单价</label>
              <Input
                type="number"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min="0"
                step="0.0001"
                className="h-9 text-sm tabular"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">成交数量</label>
              <Input
                type="number"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="0"
                step="0.0001"
                className="h-9 text-sm tabular"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">手续费</label>
              <Input
                type="number"
                placeholder="0"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                min="0"
                step="0.01"
                className="h-9 text-sm tabular"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">交易日期</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <Button type="submit" className="w-full h-9 text-sm">
            保存交易记录
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
