import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { fetchFundInfo, fetchStockInfo, normalizeStockSymbol } from "@/lib/fund-api";
import { FundHolding, AssetType } from "@/types/fund";
import { toast } from "sonner";

interface AddFundFormProps {
  onAdd: (holding: FundHolding) => void;
}

export default function AddFundForm({ onAdd }: AddFundFormProps) {
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [assetType, setAssetType] = useState<AssetType>("fund");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = code.trim();
    const numAmount = parseFloat(amount);

    if (!trimmedCode) {
      toast.error(assetType === "fund" ? "请输入6位基金代码" : "请输入股票代码");
      return;
    }
    if (assetType === "fund" && trimmedCode.length !== 6) {
      toast.error("请输入6位基金代码");
      return;
    }
    if (!numAmount || numAmount <= 0) {
      toast.error("请输入有效的买入金额");
      return;
    }

    setLoading(true);

    if (assetType === "fund") {
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
        type: "fund",
        buyAmount: numAmount,
        buyNav: info.nav,
        currentNav: info.estimatedNav,
        dayChangePercent: info.changePercent,
        updatedAt: info.updateTime,
      };
      onAdd(holding);
      toast.success(`已添加基金 ${info.name}`);
    } else {
      const symbol = normalizeStockSymbol(trimmedCode);
      const info = await fetchStockInfo(symbol);
      setLoading(false);
      if (!info) {
        toast.error("未找到该股票，请检查代码（如 AAPL, 600519, 0700.HK）");
        return;
      }
      const holding: FundHolding = {
        id: `${symbol}-${Date.now()}`,
        code: symbol,
        name: info.name,
        type: "stock",
        buyAmount: numAmount,
        buyNav: info.previousClose,
        currentNav: info.price,
        dayChangePercent: info.changePercent,
        updatedAt: info.updateTime,
        currency: info.currency,
      };
      onAdd(holding);
      toast.success(`已添加股票 ${info.name}`);
    }

    setCode("");
    setAmount("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Type toggle */}
      <div className="flex gap-1 p-0.5 bg-muted rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setAssetType("fund")}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            assetType === "fund"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          场外基金
        </button>
        <button
          type="button"
          onClick={() => setAssetType("stock")}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            assetType === "stock"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          股票 / ETF
        </button>
      </div>

      <div className="flex gap-3 items-end">
        <div className="flex-1 min-w-0">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            {assetType === "fund" ? "基金代码" : "股票代码"}
          </label>
          <Input
            placeholder={assetType === "fund" ? "如 110011" : "如 AAPL / 600519 / 0700.HK"}
            value={code}
            onChange={(e) =>
              setCode(
                assetType === "fund"
                  ? e.target.value.replace(/\D/g, "").slice(0, 6)
                  : e.target.value.slice(0, 12)
              )
            }
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
      </div>
    </form>
  );
}
