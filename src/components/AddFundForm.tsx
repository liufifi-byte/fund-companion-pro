import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { fetchFundInfo } from "@/lib/fund-api";
import { FundHolding } from "@/types/fund";
import { toast } from "sonner";

interface AddFundFormProps {
  onAdd: (holding: FundHolding) => void;
}

export default function AddFundForm({ onAdd }: AddFundFormProps) {
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = code.trim();
    const numAmount = parseFloat(amount);

    if (!trimmedCode || trimmedCode.length !== 6) {
      toast.error("请输入6位基金代码");
      return;
    }
    if (!numAmount || numAmount <= 0) {
      toast.error("请输入有效的买入金额");
      return;
    }

    setLoading(true);
    const info = await fetchFundInfo(trimmedCode);
    setLoading(false);

    if (!info) {
      toast.error("未找到该基金，请检查代码");
      return;
    }

    const holding: FundHolding = {
      id: `${trimmedCode}-${Date.now()}`,
      code: trimmedCode,
      name: info.name,
      buyAmount: numAmount,
      buyNav: info.nav,
      currentNav: info.estimatedNav,
      dayChangePercent: info.changePercent,
      updatedAt: info.updateTime,
    };

    onAdd(holding);
    setCode("");
    setAmount("");
    toast.success(`已添加 ${info.name}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 items-end">
      <div className="flex-1 min-w-0">
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
          基金代码
        </label>
        <Input
          placeholder="如 110011"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="tabular h-10"
        />
      </div>
      <div className="flex-1 min-w-0">
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
          买入金额 (元)
        </label>
        <Input
          type="number"
          placeholder="10000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="0"
          step="0.01"
          className="tabular h-10"
        />
      </div>
      <Button type="submit" disabled={loading} className="h-10 px-5 shrink-0">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
        {loading ? "查询中" : "添加"}
      </Button>
    </form>
  );
}
