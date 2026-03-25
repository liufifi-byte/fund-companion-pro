import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    const interval = chartRange === "1mo" ? "1d" : chartRange === "3mo" ? "1d" : "1d";
    const reqRange = chartRange || "1d";
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

    // Extract historical close prices for chart
    const closes = result.indicators?.quote?.[0]?.close || [];
    const timestamps = result.timestamp || [];
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
