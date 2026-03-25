import { useState, useEffect, useCallback, useMemo } from "react";
import { Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";

/* ───────── types ───────── */
interface IndicatorConfig {
  id: string;
  symbol: string;       // yahoo symbol for API
  label: string;
  displaySymbol: string; // shown on card
  type: "realtime" | "periodic";
  /** static text instead of API, e.g. Fed rate */
  staticValue?: string;
  expected?: number;
  periodicLabel?: string;  // e.g. "月度数据"
  publishDate?: string;    // e.g. "2026-03-12"
  description: string;
  getTransmission: (change: number, value: number) => string;
}

interface IndicatorData {
  price: number | null;
  change: number | null;
  changePercent: number | null;
  updatedAt: string | null; // "HH:mm"
  loading: boolean;
}

/* ───────── indicator config ───────── */
const GROUPS: { title: string; indicators: IndicatorConfig[] }[] = [
  {
    title: "全球股市",
    indicators: [
      {
        id: "spx", symbol: "^GSPC", label: "标普500", displaySymbol: "S&P 500",
        type: "realtime",
        description: "标普500指数，追踪美国500家最大上市公司，是衡量美股整体表现的核心基准。",
        getTransmission: (change) =>
          change >= 0
            ? "标普500上涨，美股整体走强，市场风险偏好回升，通常带动全球股市联动上行。"
            : "标普500下跌，美股承压，可能触发全球股市跟跌，关注避险资产配置机会。",
      },
      {
        id: "nq", symbol: "NQ=F", label: "纳斯达克期货", displaySymbol: "NQ1!",
        type: "realtime",
        description: "纳斯达克100期货指数，反映美国科技股的盘前/盘后走势及市场预期。",
        getTransmission: (change) =>
          change >= 0
            ? "纳指期货上涨。市场风险偏好回升，科技股领涨，通常带动全球成长股和加密资产同步走强。"
            : "纳指期货下跌。科技股承压可能源于利率上行或盈利预期下调，关注是否传导至亚太科技股和Web3板块。",
      },
      {
        id: "hsi", symbol: "^HSI", label: "恒生指数", displaySymbol: "HSI",
        type: "realtime",
        description: "香港恒生指数，反映港股整体走势，是中国资产在离岸市场的核心风向标。",
        getTransmission: (change) =>
          change >= 0
            ? "恒指上涨，港股走强，外资看好中国资产，关注南向资金流入和科技板块联动。"
            : "恒指下跌，港股承压，可能受地缘政治或外资流出影响，关注人民币汇率联动。",
      },
    ],
  },
  {
    title: "避险与商品",
    indicators: [
      {
        id: "gold", symbol: "GC=F", label: "黄金", displaySymbol: "GOLD",
        type: "realtime",
        description: "COMEX黄金期货，全球最重要的避险资产和通胀对冲工具。",
        getTransmission: (change) =>
          change >= 0
            ? "黄金上涨。避险情绪升温或美元走弱，资金流入贵金属避险，关注地缘政治和通胀预期。"
            : "黄金下跌。市场风险偏好回升或美元走强，资金从避险资产流出，利好权益类资产。",
      },
      {
        id: "oil", symbol: "BZ=F", label: "布伦特原油", displaySymbol: "BRENT",
        type: "realtime",
        description: "布伦特原油期货，全球石油定价基准，反映能源供需和地缘政治风险。",
        getTransmission: (change) =>
          change >= 0
            ? "油价上涨。可能推升通胀预期，增加央行加息压力，能源股受益但消费板块承压。"
            : "油价下跌。通胀压力缓解有利于降息预期，但可能反映全球经济需求疲弱。",
      },
      {
        id: "btc", symbol: "BTC-USD", label: "比特币", displaySymbol: "BTC",
        type: "realtime",
        description: "比特币价格，加密货币市场的风向标，与全球流动性和风险偏好高度相关。",
        getTransmission: (change) =>
          change >= 0
            ? "比特币上涨。加密市场风险偏好回升，通常伴随美元走弱或流动性宽松预期，关注山寨币联动机会。"
            : "比特币下跌。可能受美元走强、监管政策或宏观紧缩预期影响，需警惕加密市场连锁清算风险。",
      },
    ],
  },
  {
    title: "宏观利率",
    indicators: [
      {
        id: "dxy", symbol: "DX-Y.NYB", label: "美元指数", displaySymbol: "DXY",
        type: "realtime",
        description: "美元指数衡量美元对一篮子主要货币的汇率强弱，是全球流动性的风向标。",
        getTransmission: (change) =>
          change >= 0
            ? "美元走强。全球美元流动性收紧，新兴市场资产和大宗商品(黄金、原油)承压，人民币资产面临汇率逆风。"
            : "美元走弱。全球美元流动性宽松，利好新兴市场资产和以美元计价的大宗商品(黄金、原油)。",
      },
      {
        id: "us10y", symbol: "^TNX", label: "美国10年期国债", displaySymbol: "US10Y",
        type: "realtime",
        description: "美国10年期国债收益率，是全球资产定价的基准利率，被称为'无风险利率之锚'。",
        getTransmission: (change) =>
          change >= 0
            ? "当前美债收益率上行。资金机会成本增加，通常会压制高估值的科技股(纳指)和加密货币(Web3资产)，利空风险资产。"
            : "当前美债收益率下行。资金机会成本降低，有利于成长股和科技股估值修复，利好风险资产。",
      },
      {
        id: "vix", symbol: "^VIX", label: "恐慌指数", displaySymbol: "VIX",
        type: "realtime",
        description: "VIX指数衡量市场对标普500未来30天波动率的预期，又称'恐慌指数'。",
        getTransmission: (_change, value) => {
          if (value > 30) return "市场处于极度恐慌状态，可能出现非理性抛售，关注左侧建仓机会。历史数据显示VIX>30后6个月内市场大概率反弹。";
          if (value > 20) return "市场波动率偏高，投资者情绪谨慎。建议控制仓位，避免追涨杀跌，等待波动率回落后再加仓。";
          return "市场情绪平稳，波动率处于低位。适合持有风险资产，但需警惕低波动率环境下的突发风险事件。";
        },
      },
    ],
  },
  {
    title: "经济数据",
    indicators: [
      {
        id: "cpi", symbol: "", label: "美国CPI", displaySymbol: "US CPI",
        type: "periodic", periodicLabel: "月度数据", publishDate: "2026-03-12",
        expected: 3.1,
        description: "美国消费者物价指数(CPI)年率，衡量通胀水平，是美联储货币政策的核心参考。",
        getTransmission: (_change, value) => {
          const expected = 3.1;
          if (value > expected) return `CPI实际值(${value}%)高于预期(${expected}%)。通胀超预期意味着美联储降息预期推迟，美债收益率和美元可能走强，利空风险资产。`;
          if (value < expected) return `CPI实际值(${value}%)低于预期(${expected}%)。通胀降温支持美联储降息预期，利好股市和加密货币。`;
          return `CPI符合预期(${expected}%)。市场影响中性，关注核心CPI和后续分项数据。`;
        },
      },
      {
        id: "usdcny", symbol: "USDCNY=X", label: "人民币汇率", displaySymbol: "USDCNY",
        type: "realtime",
        description: "美元兑人民币汇率，反映人民币强弱，影响中国资产的外资流动。",
        getTransmission: (change) =>
          change >= 0
            ? "人民币贬值(美元/人民币上行)。外资可能减持人民币资产，A股和港股面临汇率逆风，出口企业相对受益。"
            : "人民币升值(美元/人民币下行)。外资流入预期增强，利好A股和港股，进口成本降低。",
      },
      {
        id: "fedrate", symbol: "", label: "美联储利率", displaySymbol: "FED RATE",
        type: "periodic", periodicLabel: "月度数据", publishDate: "2026-03-19",
        staticValue: "4.25-4.50%",
        description: "美联储联邦基金目标利率区间，决定美元流动性和全球资金成本的核心政策工具。",
        getTransmission: () =>
          "当前利率处于限制性水平。市场关注降息时点预期，若经济数据走弱可能加速降息，利好风险资产；若通胀顽固则维持高利率更久，压制估值。",
      },
    ],
  },
];

// flatten for data fetching
const ALL_INDICATORS = GROUPS.flatMap((g) => g.indicators);
const REALTIME_SYMBOLS = ALL_INDICATORS.filter(
  (i) => i.type === "realtime" && i.symbol
).map((i) => ({ id: i.id, symbol: i.symbol }));

/* ───────── sentiment logic ───────── */
type Sentiment = "panic" | "risk_off" | "neutral" | "risk_on";

function calcSentiment(data: Record<string, IndicatorData>): {
  sentiment: Sentiment;
  color: string;
  text: string;
} {
  const vixPrice = data.vix?.price ?? 20;
  const goldPct = data.gold?.changePercent ?? 0;
  const spxPct = data.spx?.changePercent ?? 0;

  if (vixPrice > 30)
    return { sentiment: "panic", color: "hsl(var(--fund-rise))", text: "市场恐慌 VIX 偏高 · 建议关注防御性资产" };
  if (vixPrice >= 20 && goldPct > 0.5)
    return { sentiment: "risk_off", color: "hsl(30, 90%, 55%)", text: "避险情绪 黄金走强 · 美债受追捧" };
  if (vixPrice >= 15)
    return { sentiment: "neutral", color: "hsl(var(--muted-foreground))", text: "情绪中性 市场观望，波动率处于正常区间" };
  if (spxPct > 0)
    return { sentiment: "risk_on", color: "hsl(var(--fund-fall))", text: "风险偏好 股市走强 · 资金流入权益资产" };
  return { sentiment: "neutral", color: "hsl(var(--muted-foreground))", text: "情绪中性 市场观望，波动率处于正常区间" };
}

/* ───────── sub-components ───────── */
function SentimentBar({ data }: { data: Record<string, IndicatorData> }) {
  const { color, text } = calcSentiment(data);
  return (
    <div className="flex items-center gap-3 rounded-lg bg-card border border-border/60 px-4 h-11 mb-4">
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="text-xs font-medium text-foreground">{text}</span>
    </div>
  );
}

function IndicatorCard({ config, data }: { config: IndicatorConfig; data: IndicatorData }) {
  const [open, setOpen] = useState(false);
  const isStatic = !!config.staticValue;
  const isPeriodic = config.type === "periodic";
  const value = isStatic ? null : data.price;
  const isUp = (data.change ?? 0) >= 0;
  const transmission = config.getTransmission(data.change ?? 0, value ?? (isStatic ? 0 : 0));

  const displayValue = isStatic
    ? config.staticValue!
    : value !== null
      ? config.id === "btc"
        ? value.toLocaleString("en-US", { maximumFractionDigits: 0 })
        : config.id === "cpi"
          ? `${value}%`
          : value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : "--";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Card
          className="p-3 cursor-pointer transition-all duration-200 hover:shadow-md bg-card border-border/60 relative"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          {isPeriodic && config.periodicLabel && (
            <span className="absolute top-2 right-2 text-[10px] leading-none px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {config.periodicLabel}
            </span>
          )}

          <div className="flex items-center gap-1 mb-1.5">
            <span className="text-[11px] font-medium text-muted-foreground tracking-wide">
              {config.displaySymbol}
            </span>
            <Info className="w-3 h-3 text-muted-foreground/50" />
          </div>

          {data.loading && !isStatic ? (
            <div className="h-8 w-20 animate-pulse rounded bg-muted" />
          ) : (
            <>
              <p className="text-base font-bold tabular-nums text-foreground leading-tight">
                {displayValue}
              </p>

              {config.expected !== undefined && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  预期 {config.expected}%
                </p>
              )}

              {!isPeriodic && !isStatic && data.price !== null && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className={`text-[11px] font-semibold tabular-nums ${
                      isUp ? "text-[hsl(var(--fund-rise))]" : "text-[hsl(var(--fund-fall))]"
                    }`}
                  >
                    {data.change !== null
                      ? `${data.change >= 0 ? "+" : ""}${data.change.toFixed(2)}`
                      : ""}
                  </span>
                  <span
                    className={`text-[10px] font-medium tabular-nums ${
                      isUp ? "text-[hsl(var(--fund-rise))]" : "text-[hsl(var(--fund-fall))]"
                    }`}
                  >
                    {data.changePercent !== null
                      ? `${data.changePercent >= 0 ? "+" : ""}${data.changePercent.toFixed(2)}%`
                      : ""}
                  </span>
                </div>
              )}
            </>
          )}

          {/* Footer: update time or publish date */}
          <div className="mt-1.5 flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground/70 leading-tight truncate">
              {config.label}
            </p>
            {isPeriodic && config.publishDate ? (
              <span className="text-[9px] text-muted-foreground/50 shrink-0 ml-1">
                公布于 {config.publishDate}
              </span>
            ) : !isPeriodic && data.updatedAt ? (
              <span className="text-[9px] text-muted-foreground/50 shrink-0 ml-1">
                更新于 {data.updatedAt}
              </span>
            ) : null}
          </div>
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
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">指标含义</p>
            <p className="text-xs leading-relaxed text-white/70">{config.description}</p>
          </div>
          <div className="h-px bg-white/10" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">市场传导机制</p>
            <p className="text-xs leading-relaxed text-white/90 font-medium">{transmission}</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ───────── main component ───────── */
export default function MacroCockpit() {
  const [dataMap, setDataMap] = useState<Record<string, IndicatorData>>(() => {
    const init: Record<string, IndicatorData> = {};
    ALL_INDICATORS.forEach((i) => {
      init[i.id] = { price: null, change: null, changePercent: null, updatedAt: null, loading: !i.staticValue };
    });
    // static indicators pre-filled
    init.cpi = { price: 3.2, change: null, changePercent: null, updatedAt: null, loading: false };
    init.fedrate = { price: null, change: null, changePercent: null, updatedAt: null, loading: false };
    return init;
  });

  const fetchAll = useCallback(async () => {
    const results = await Promise.all(
      REALTIME_SYMBOLS.map(async ({ id, symbol }) => {
        try {
          const { data, error } = await supabase.functions.invoke("yahoo-finance", {
            body: { symbol, range: "1d" },
          });
          if (error || !data || data.error) {
            return { id, price: null, change: null, changePercent: null, updatedAt: null };
          }
          const now = new Date();
          const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
          return {
            id,
            price: data.price as number,
            change: data.change as number,
            changePercent: data.changePercent as number,
            updatedAt: timeStr,
          };
        } catch {
          return { id, price: null, change: null, changePercent: null, updatedAt: null };
        }
      })
    );

    setDataMap((prev) => {
      const next = { ...prev };
      results.forEach((r) => {
        next[r.id] = { ...r, loading: false };
      });
      return next;
    });
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // expose fetcher for parent to call on refresh
  // Parent (Market page) passes its own refresh; we just auto-fetch on mount
  return (
    <section className="mb-6">
      <SentimentBar data={dataMap} />

      {GROUPS.map((group, gi) => (
        <div key={group.title} className={gi > 0 ? "mt-4" : ""}>
          <h3 className="text-xs font-medium text-muted-foreground mb-2 tracking-wide">
            {group.title}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {group.indicators.map((cfg) => (
              <IndicatorCard key={cfg.id} config={cfg} data={dataMap[cfg.id]} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
