import { useState } from "react";
import { Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface MacroIndicator {
  id: string;
  label: string;
  symbol: string;
  value: number;
  change: number;
  changePercent: number;
  /** For CPI: expected value */
  expected?: number;
  description: string;
  getTransmission: (change: number, value: number) => string;
}

const MACRO_DATA: MacroIndicator[] = [
  {
    id: "us10y",
    label: "美国10年期国债",
    symbol: "US10Y",
    value: 4.38,
    change: 0.05,
    changePercent: 1.15,
    description: "美国10年期国债收益率，是全球资产定价的基准利率，被称为"无风险利率之锚"。",
    getTransmission: (change: number) =>
      change >= 0
        ? "当前美债收益率上行。资金机会成本增加，通常会压制高估值的科技股(纳指)和加密货币(Web3资产)，利空风险资产。"
        : "当前美债收益率下行。资金机会成本降低，有利于成长股和科技股估值修复，利好风险资产。",
  },
  {
    id: "dxy",
    label: "美元指数",
    symbol: "DXY",
    value: 104.25,
    change: -0.32,
    changePercent: -0.31,
    description: "美元指数衡量美元对一篮子主要货币的汇率强弱，是全球流动性的风向标。",
    getTransmission: (change: number) =>
      change >= 0
        ? "美元走强。全球美元流动性收紧，新兴市场资产和大宗商品(黄金、原油)承压，人民币资产面临汇率逆风。"
        : "美元走弱。全球美元流动性宽松，利好新兴市场资产和以美元计价的大宗商品(黄金、原油)。",
  },
  {
    id: "cpi",
    label: "美国通胀率",
    symbol: "US CPI",
    value: 3.2,
    change: 0.1,
    changePercent: 3.23,
    expected: 3.1,
    description: "美国消费者物价指数(CPI)年率，衡量通胀水平，是美联储货币政策的核心参考。",
    getTransmission: (_change: number, value: number) => {
      const expected = 3.1;
      if (value > expected)
        return `CPI实际值(${value}%)高于预期(${expected}%)。通胀超预期意味着美联储降息预期推迟，美债收益率和美元可能走强，利空风险资产。`;
      if (value < expected)
        return `CPI实际值(${value}%)低于预期(${expected}%)。通胀降温支持美联储降息预期，利好股市和加密货币。`;
      return `CPI符合预期(${expected}%)。市场影响中性，关注核心CPI和后续分项数据。`;
    },
  },
  {
    id: "vix",
    label: "恐慌指数",
    symbol: "VIX",
    value: 32.5,
    change: 4.8,
    changePercent: 17.33,
    description: "VIX指数衡量市场对标普500未来30天波动率的预期，又称"恐慌指数"。",
    getTransmission: (_change: number, value: number) => {
      if (value > 30)
        return "市场处于极度恐慌状态，可能出现非理性抛售，关注左侧建仓机会。历史数据显示VIX>30后6个月内市场大概率反弹。";
      if (value > 20)
        return "市场波动率偏高，投资者情绪谨慎。建议控制仓位，避免追涨杀跌，等待波动率回落后再加仓。";
      return "市场情绪平稳，波动率处于低位。适合持有风险资产，但需警惕低波动率环境下的突发风险事件。";
    },
  },
  {
    id: "nq",
    label: "纳斯达克期指",
    symbol: "NQ1!",
    value: 18520,
    change: -185,
    changePercent: -0.99,
    description: "纳斯达克100期货指数，反映美国科技股的盘前/盘后走势及市场预期。",
    getTransmission: (change: number) =>
      change >= 0
        ? "纳指期货上涨。市场风险偏好回升，科技股领涨，通常带动全球成长股和加密资产同步走强。"
        : "纳指期货下跌。科技股承压可能源于利率上行或盈利预期下调，关注是否传导至亚太科技股和Web3板块。",
  },
  {
    id: "btc",
    label: "比特币",
    symbol: "BTC",
    value: 67350,
    change: 1250,
    changePercent: 1.89,
    description: "比特币价格，加密货币市场的风向标，与全球流动性和风险偏好高度相关。",
    getTransmission: (change: number) =>
      change >= 0
        ? "比特币上涨。加密市场风险偏好回升，通常伴随美元走弱或流动性宽松预期，关注山寨币联动机会。"
        : "比特币下跌。可能受美元走强、监管政策或宏观紧缩预期影响，需警惕加密市场连锁清算风险。",
  },
];

function formatValue(indicator: MacroIndicator) {
  const { id, value } = indicator;
  if (id === "btc") return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (id === "nq") return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (id === "cpi") return `${value}%`;
  return value.toFixed(2);
}

function formatChange(change: number) {
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}`;
}

function formatPercent(pct: number) {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function IndicatorCard({ indicator }: { indicator: MacroIndicator }) {
  const [open, setOpen] = useState(false);
  const isUp = indicator.change >= 0;
  const transmission = indicator.getTransmission(indicator.change, indicator.value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Card
          className="p-3.5 cursor-pointer transition-all duration-200 hover:shadow-md bg-card border-border/60"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs font-medium text-muted-foreground tracking-wide">
              {indicator.symbol}
            </span>
            <Info className="w-3 h-3 text-muted-foreground/50" />
          </div>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-lg font-bold tabular-nums text-foreground leading-tight">
                {formatValue(indicator)}
              </p>
              {indicator.expected !== undefined && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  预期 {indicator.expected}%
                </p>
              )}
            </div>
            <div className="text-right">
              <p
                className={`text-xs font-semibold tabular-nums ${
                  isUp ? "text-[hsl(var(--fund-rise))]" : "text-[hsl(var(--fund-fall))]"
                }`}
              >
                {formatChange(indicator.change)}
              </p>
              <p
                className={`text-[10px] font-medium tabular-nums ${
                  isUp ? "text-[hsl(var(--fund-rise))]" : "text-[hsl(var(--fund-fall))]"
                }`}
              >
                {formatPercent(indicator.changePercent)}
              </p>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground/70 mt-1.5 leading-tight truncate">
            {indicator.label}
          </p>
        </Card>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="center"
        sideOffset={8}
        className="w-80 p-0 border-0 shadow-xl rounded-lg overflow-hidden bg-[hsl(220,20%,14%)] text-white animate-in fade-in-0 zoom-in-95 duration-200"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <div className="p-4 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
              指标含义
            </p>
            <p className="text-xs leading-relaxed text-white/70">
              {indicator.description}
            </p>
          </div>
          <div className="h-px bg-white/10" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
              市场传导机制
            </p>
            <p className="text-xs leading-relaxed text-white/90 font-medium">
              {transmission}
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function MacroCockpit() {
  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold text-muted-foreground mb-3 tracking-wide">
        宏观驾驶舱
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {MACRO_DATA.map((indicator) => (
          <IndicatorCard key={indicator.id} indicator={indicator} />
        ))}
      </div>
    </section>
  );
}
