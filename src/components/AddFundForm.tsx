import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { fetchFundInfo, fetchStockInfo, fetchFundHoldings, normalizeStockSymbol } from "@/lib/fund-api";
import { FundHolding, AssetType } from "@/types/fund";
import { toast } from "sonner";

export type Market = "cn_fund" | "cn_stock" | "hk" | "us";

interface AddFundFormProps {
  onAdd: (holding: FundHolding) => void;
}

const MARKET_OPTIONS: { value: Market; label: string; placeholder: string }[] = [
  { value: "cn_fund", label: "场外基金", placeholder: "如 110011" },
  { value: "cn_stock", label: "A股", placeholder: "如 600519" },
  { value: "hk", label: "港股", placeholder: "如 0700 / 9988" },
  { value: "us", label: "美股", placeholder: "如 AAPL / QQQ" },
];

type UsCurrency = "USD" | "HKD";

export default function AddFundForm({ onAdd }: AddFundFormProps) {
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [buyNav, setBuyNav] = useState("");
  const [buyDate, setBuyDate] = useState("");
  const [market, setMarket] = useState<Market>("cn_fund");
  const [usCurrency, setUsCurrency] = useState<UsCurrency>("USD");
  const [loading, setLoading] = useState(false);

  const isFund = market === "cn_fund";
  const currentOption = MARKET_OPTIONS.find((m) => m.value === market)!;

  function getCurrency(): string {
    if (market === "cn_fund" || market === "cn_stock") return "CNY";
    if (market === "hk") return "HKD";
    return usCurrency;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = code.trim();
    const numAmount = parseFloat(amount);
    const navValue = parseFloat(buyNav);

    if (!trimmedCode) { toast.error("请输入代码"); return; }
    if (isFund && trimmedCode.length !== 6) { toast.error("请输入6位基金代码"); return; }
    if (!numAmount || numAmount <= 0) { toast.error("请输入有效的买入金额"); return; }
    if (!navValue || navValue <= 0) { toast.error(isFund ? "请输入买入净值" : "请输入买入价格"); return; }

    const dateStr = buyDate || new Date().toISOString().slice(0, 10);
    setLoading(true);

    if (isFund) {
      const [info, topHoldings] = await Promise.all([
        fetchFundInfo(trimmedCode),
        fetchFundHoldings(trimmedCode),
      ]);
      setLoading(false);
      if (!info) { toast.error("未找到该基金，请检查代码"); return; }

      const holding: FundHolding = {
        id: `${trimmedCode}-${Date.now()}`,
        code: trimmedCode,
        name: info.name,
        type: "fund",
        purchases: [{ date: dateStr, amount: numAmount, buyNav: navValue }],
        currentNav: info.estimatedNav,
        dayChangePercent: info.changePercent,
        updatedAt: info.updateTime,
        currency: "CNY",
        topHoldings,
      };
      onAdd(holding);
      toast.success(`已添加基金 ${info.name}`);
    } else {
      const symbol = normalizeStockSymbol(trimmedCode, market);
      const info = await fetchStockInfo(symbol);
      setLoading(false);
      if (!info) { toast.error(`未找到该股票 (${symbol})，请检查代码`); return; }

      const holding: FundHolding = {
        id: `${symbol}-${Date.now()}`,
        code: symbol,
        name: info.name,
        type: "stock",
        purchases: [{ date: dateStr, amount: numAmount, buyNav: navValue }],
        currentNav: info.price,
        dayChangePercent: info.changePercent,
        updatedAt: info.updateTime,
        currency: getCurrency(),
      };
      onAdd(holding);
      toast.success(`已添加股票 ${info.name}`);
    }

    setCode("");
    setAmount("");
    setBuyNav("");
    setBuyDate("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Market toggle */}
      <div className="flex gap-1 p-0.5 bg-muted rounded-lg w-fit">
        {MARKET_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => { setMarket(opt.value); setCode(""); }}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              market === opt.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-[100px]">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            {isFund ? "基金代码" : "股票代码"}
          </label>
          <Input
            placeholder={currentOption.placeholder}
            value={code}
            onChange={(e) => setCode(isFund ? e.target.value.replace(/\D/g, "").slice(0, 6) : e.target.value.slice(0, 12))}
            className="tabular h-10"
          />
        </div>
        <div className="w-24">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">买入金额</label>
          <Input type="number" placeholder="10000" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" step="0.01" className="tabular h-10" />
        </div>
        <div className="w-24">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            {isFund ? "买入净值" : "买入价格"}
            <span className="text-destructive ml-0.5">*</span>
          </label>
          <Input type="number" placeholder={isFund ? "1.3100" : "0.00"} value={buyNav} onChange={(e) => setBuyNav(e.target.value)} min="0" step="0.0001" className="tabular h-10" required />
        </div>
        {market === "us" && (
          <div className="w-20">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">计价币种</label>
            <div className="flex gap-0.5 p-0.5 bg-muted rounded-md h-10 items-center">
              {(["USD", "HKD"] as UsCurrency[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setUsCurrency(c)}
                  className={`flex-1 text-xs font-medium rounded px-1.5 py-1 transition-colors ${
                    usCurrency === c ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {c === "USD" ? "$" : "HK$"}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="w-32">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            买入日期
            <span className="text-muted-foreground/60 ml-0.5">(选填)</span>
          </label>
          <Input type="date" value={buyDate} onChange={(e) => setBuyDate(e.target.value)} className="h-10 text-xs" />
        </div>
        <Button type="submit" disabled={loading} className="h-10 px-5 shrink-0">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
          {loading ? "查询中" : "添加"}
        </Button>
      </div>
    </form>
  );
}
