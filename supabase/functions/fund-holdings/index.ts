import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Convert eastmoney stock code to secid format (1.XXXXXX for SH, 0.XXXXXX for SZ) */
function toSecId(code: string): string {
  if (code.startsWith("6") || code.startsWith("9")) return `1.${code}`;
  return `0.${code}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { fundCode } = await req.json();
    if (!fundCode) {
      return new Response(JSON.stringify({ error: "Missing fundCode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch fund stock holdings from eastmoney mobile API
    const url = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNInverstPosition?FCODE=${fundCode}&OSVersion=15.0&appVersion=6.3.8&plat=Iphone&product=EFund&deviceid=1&Version=6.3.8`;

    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
        Referer: "https://mpservice.com/",
      },
    });

    const data = await resp.json();

    if (!data || data.ErrCode !== 0 || !data.Datas) {
      return new Response(JSON.stringify({ holdings: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fundStocks = data.Datas?.fundStocks || [];
    const top5 = fundStocks.slice(0, 5);

    if (top5.length === 0) {
      return new Response(JSON.stringify({ holdings: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch real-time quotes for the top 5 stocks
    const secIds = top5.map((s: any) => toSecId(s.GPDM)).join(",");
    let quoteMap: Record<string, number> = {};

    try {
      const quoteUrl = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&secids=${secIds}&fields=f2,f3,f12,f14`;
      const quoteResp = await fetch(quoteUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const quoteData = await quoteResp.json();
      if (quoteData?.data?.diff) {
        for (const item of quoteData.data.diff) {
          quoteMap[item.f12] = item.f3; // f12=code, f3=涨跌幅
        }
      }
    } catch {
      // If quote fetch fails, we'll use 0 as fallback
    }

    const topHoldings = top5.map((item: any) => ({
      name: item.GPJC || item.GPDM,
      code: item.GPDM,
      percent: parseFloat(item.JZBL || "0"),
      changePercent: quoteMap[item.GPDM] ?? 0,
    }));

    return new Response(JSON.stringify({ holdings: topHoldings }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message, holdings: [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
