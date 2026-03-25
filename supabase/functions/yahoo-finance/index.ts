import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function rangeToInterval(range: string): string {
  switch (range) {
    case "1d":
      return "5m";
    case "5d":
      return "1h";
    case "1mo":
    case "3mo":
    default:
      return "1d";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, range: chartRange } = await req.json();
    if (!symbol || typeof symbol !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing symbol parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const reqRange = chartRange || "1d";
    const interval = rangeToInterval(reqRange);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${reqRange}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!res.ok) {
      const text = await res.text();
      return new Response(
        JSON.stringify({ error: `Yahoo API error [${res.status}]: ${text}` }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) {
      return new Response(
        JSON.stringify({ error: "Symbol not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const meta = result.meta;
    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose;
    const change = price - prevClose;
    const changePercent = prevClose ? (change / prevClose) * 100 : 0;

    const quote = result.indicators?.quote?.[0] || {};
    const opens = quote.open || [];
    const highs = quote.high || [];
    const lows = quote.low || [];
    const closes = quote.close || [];
    const timestamps = result.timestamp || [];

    // Build OHLC array – use date string for daily, unix timestamp for intraday
    const useUnix = interval !== "1d";
    const ohlc = timestamps
      .map((t: number, i: number) => {
        const o = opens[i];
        const h = highs[i];
        const l = lows[i];
        const c = closes[i];
        if (o == null || h == null || l == null || c == null) return null;
        const time = useUnix
          ? t
          : new Date(t * 1000).toISOString().slice(0, 10);
        return { time, open: o, high: h, low: l, close: c };
      })
      .filter(Boolean);

    // Legacy history for backward compat (sparkline)
    const history = timestamps
      .map((t: number, i: number) => ({ t, c: closes[i] }))
      .filter((d: { t: number; c: number | null }) => d.c !== null);

    return new Response(
      JSON.stringify({
        symbol: meta.symbol,
        name: meta.shortName || meta.symbol,
        currency: meta.currency,
        price,
        previousClose: prevClose,
        change,
        changePercent,
        marketTime: meta.regularMarketTime,
        ohlc,
        history,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
