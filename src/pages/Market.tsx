import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  YAxis,
} from "recharts";

interface HistoryPoint {
  t: number;
  c: number;
}

interface MarketIndex {
  symbol: string;
  label: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  history: HistoryPoint[];
  loading: boolean;
}

const INDICES = [
  { symbol: "DX-Y.NYB", label: "美元指数" },
  { symbol: "GC=F", label: "黄金" },
  { symbol: "BZ=F", label: "布伦特原油" },
  { symbol: "^KS11", label: "韩国综合指数" },
  { symbol: "^IXIC", label: "纳斯达克指数" },
];

const RANGES = [
  { value: "5d", label: "1周" },
  { value: "1mo", label: "1月" },
  { value: "3mo", label: "3月" },
] as const;

export default function Market() {
  const [indices, setIndices] = useState<MarketIndex[]>(
    INDICES.map((i) => ({
      ...i,
      price: null,
      change: null,
      changePercent: null,
      history: [],
      loading: true,
    }))
  );
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    const results = await Promise.all(
      INDICES.map(async (idx) => {
        try {
          const { data, error } = await supabase.functions.invoke("yahoo-finance", {
            body: { symbol: idx.symbol, range: "1mo" },
          });
          if (error || !data || data.error) {
            return { ...idx, price: null, change: null, changePercent: null, history: [], loading: false };
          }
          return {
            ...idx,
            price: data.price,
            change: data.change,
            changePercent: data.changePercent,
            history: (data.history || []) as HistoryPoint[],
            loading: false,
          };
        } catch {
          return { ...idx, price: null, change: null, changePercent: null, history: [], loading: false };
        }
      })
    );
    setIndices(results);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const formatPrice = (price: number | null) => {
    if (price === null) return "--";
    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatChange = (change: number | null) => {
    if (change === null) return "--";
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(2)}`;
  };

  const formatPercent = (pct: number | null) => {
    if (pct === null) return "";
    const sign = pct >= 0 ? "+" : "";
    return `${sign}${pct.toFixed(2)}%`;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-foreground tracking-tight">全球行情</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAll}
            disabled={refreshing}
            className="text-xs h-8"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>

        <div className="grid gap-3">
          {indices.map((idx) => {
            const isUp = (idx.change ?? 0) >= 0;
            const chartColor = idx.change === null
              ? "hsl(var(--muted-foreground))"
              : isUp
              ? "hsl(var(--fund-rise))"
              : "hsl(var(--fund-fall))";

            return (
              <Card key={idx.symbol} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{idx.label}</p>
                      <p className="text-xs text-muted-foreground">{idx.symbol}</p>
                    </div>
                    {idx.loading ? (
                      <div className="h-10 w-24 animate-pulse rounded bg-muted" />
                    ) : (
                      <div className="text-right">
                        <p className="text-base font-bold tabular-nums text-foreground">
                          {formatPrice(idx.price)}
                        </p>
                        <p
                          className={`text-xs font-medium tabular-nums ${
                            idx.change === null
                              ? "text-muted-foreground"
                              : isUp
                              ? "text-[hsl(var(--fund-rise))]"
                              : "text-[hsl(var(--fund-fall))]"
                          }`}
                        >
                          {formatChange(idx.change)} {formatPercent(idx.changePercent)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Sparkline chart */}
                  {idx.loading ? (
                    <div className="h-16 w-full animate-pulse rounded bg-muted" />
                  ) : idx.history.length > 1 ? (
                    <div className="h-16 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={idx.history} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id={`grad-${idx.symbol}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={chartColor} stopOpacity={0.25} />
                              <stop offset="100%" stopColor={chartColor} stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <YAxis domain={["dataMin", "dataMax"]} hide />
                          <Area
                            type="monotone"
                            dataKey="c"
                            stroke={chartColor}
                            strokeWidth={1.5}
                            fill={`url(#grad-${idx.symbol})`}
                            dot={false}
                            isAnimationActive={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
