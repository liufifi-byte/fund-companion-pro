import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
        "Referer": "https://mpservice.com/",
      },
    });

    const data = await resp.json();
    
    if (!data || data.ErrCode !== 0 || !data.Datas) {
      // Try alternative API
      const altUrl = `https://fund.eastmoney.com/js/jjcc/${fundCode}.js?v=${Date.now()}`;
      // fallback: return empty
      return new Response(JSON.stringify({ holdings: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract top stock holdings
    const fundStocks = data.Datas?.fundStocks || [];
    const topHoldings = fundStocks.slice(0, 5).map((item: any) => ({
      name: item.GPJC || item.GPDM, // stock name or code
      code: item.GPDM,
      percent: parseFloat(item.JZBL || "0"), // percentage of fund
      changePercent: parseFloat(item.PCTNAV || item.JZBL || "0"),
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
