import { useEffect, useRef, useState, useMemo } from "react";
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  CrosshairMode,
  ColorType,
  LineStyle,
} from "lightweight-charts";

export interface OHLCPoint {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface Props {
  data: OHLCPoint[];
  previousClose?: number | null;
  height?: number;
}

function calcMA(data: OHLCPoint[], period: number): { time: string | number; value: number }[] {
  const result: { time: string | number; value: number }[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += data[i - j].close;
    result.push({ time: data[i].time, value: sum / period });
  }
  return result;
}

export default function CandlestickChart({ data, previousClose, height = 220 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const ma5Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const ma10Ref = useRef<ISeriesApi<"Line"> | null>(null);

  const [showMA5, setShowMA5] = useState(true);
  const [showMA10, setShowMA10] = useState(true);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    point: OHLCPoint | null;
  }>({ visible: false, x: 0, y: 0, point: null });

  const ma5Data = useMemo(() => calcMA(data, 5), [data]);
  const ma10Data = useMemo(() => calcMA(data, 10), [data]);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    // Clean up previous
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#999",
        fontSize: 12,
      },
      grid: {
        vertLines: { color: "#F0F0F0" },
        horzLines: { color: "#F0F0F0" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: "#F0F0F0",
      },
      timeScale: {
        borderColor: "#F0F0F0",
        timeVisible: typeof data[0]?.time === "number",
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#E84040",
      downColor: "#2EAA5E",
      borderUpColor: "#E84040",
      borderDownColor: "#2EAA5E",
      wickUpColor: "#E84040",
      wickDownColor: "#2EAA5E",
    });

    candleSeries.setData(data as any);
    candleRef.current = candleSeries;

    // MA5
    const ma5Series = chart.addLineSeries({
      color: "#F5A623",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    ma5Series.setData(ma5Data as any);
    ma5Series.applyOptions({ visible: showMA5 });
    ma5Ref.current = ma5Series;

    // MA10
    const ma10Series = chart.addLineSeries({
      color: "#4A90D9",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    ma10Series.setData(ma10Data as any);
    ma10Series.applyOptions({ visible: showMA10 });
    ma10Ref.current = ma10Series;

    // Previous close baseline
    if (previousClose != null) {
      candleSeries.createPriceLine({
        price: previousClose,
        color: "#999",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: false,
        title: "",
      });
    }

    // Crosshair tooltip
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData || !param.point) {
        setTooltip((t) => ({ ...t, visible: false }));
        return;
      }
      const candleData = param.seriesData.get(candleSeries) as any;
      if (!candleData) {
        setTooltip((t) => ({ ...t, visible: false }));
        return;
      }
      setTooltip({
        visible: true,
        x: param.point.x,
        y: param.point.y,
        point: {
          time: param.time as any,
          open: candleData.open,
          high: candleData.high,
          low: candleData.low,
          close: candleData.close,
        },
      });
    });

    // Fit content
    chart.timeScale().fitContent();

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [data, height, previousClose]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle MA visibility without recreating chart
  useEffect(() => {
    ma5Ref.current?.applyOptions({ visible: showMA5 });
  }, [showMA5]);

  useEffect(() => {
    ma10Ref.current?.applyOptions({ visible: showMA10 });
  }, [showMA10]);

  const formatPct = (point: OHLCPoint) => {
    const ref = previousClose ?? point.open;
    if (!ref) return "";
    const pct = ((point.close - ref) / ref) * 100;
    const sign = pct >= 0 ? "+" : "";
    return `${sign}${pct.toFixed(2)}%`;
  };

  const pctColor = (point: OHLCPoint) => {
    const ref = previousClose ?? point.open;
    return point.close >= ref ? "#E84040" : "#2EAA5E";
  };

  const formatTime = (t: string | number) => {
    if (typeof t === "string") return t;
    const d = new Date(t * 1000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="relative">
      {/* MA toggle buttons */}
      <div className="absolute top-1 right-1 z-10 flex gap-1">
        <button
          onClick={() => setShowMA5((v) => !v)}
          className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
            showMA5
              ? "bg-[#F5A623]/10 border-[#F5A623] text-[#F5A623]"
              : "bg-muted/50 border-border text-muted-foreground"
          }`}
        >
          MA5
        </button>
        <button
          onClick={() => setShowMA10((v) => !v)}
          className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
            showMA10
              ? "bg-[#4A90D9]/10 border-[#4A90D9] text-[#4A90D9]"
              : "bg-muted/50 border-border text-muted-foreground"
          }`}
        >
          MA10
        </button>
      </div>

      <div ref={containerRef} style={{ height }} />

      {/* Tooltip overlay */}
      {tooltip.visible && tooltip.point && (
        <div
          className="absolute z-20 pointer-events-none bg-popover/95 border border-border rounded-lg shadow-lg px-3 py-2 text-xs"
          style={{
            left: Math.min(tooltip.x + 12, (containerRef.current?.clientWidth ?? 300) - 160),
            top: 4,
          }}
        >
          <p className="text-muted-foreground mb-1 font-medium">{formatTime(tooltip.point.time)}</p>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 tabular-nums">
            <span className="text-muted-foreground">开</span>
            <span className="text-right text-foreground">{tooltip.point.open.toFixed(2)}</span>
            <span className="text-muted-foreground">高</span>
            <span className="text-right text-foreground">{tooltip.point.high.toFixed(2)}</span>
            <span className="text-muted-foreground">低</span>
            <span className="text-right text-foreground">{tooltip.point.low.toFixed(2)}</span>
            <span className="text-muted-foreground">收</span>
            <span className="text-right text-foreground">{tooltip.point.close.toFixed(2)}</span>
            <span className="text-muted-foreground">涨跌</span>
            <span className="text-right font-medium" style={{ color: pctColor(tooltip.point) }}>
              {formatPct(tooltip.point)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
