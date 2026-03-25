import { useMemo } from "react";

interface Point {
  t: number;
  c: number;
}

interface SplitSparklineProps {
  data: Point[];
  previousClose: number;
  height?: number;
}

export default function SplitSparkline({ data, previousClose, height = 64 }: SplitSparklineProps) {
  const chart = useMemo(() => {
    if (data.length < 2) return null;

    const prices = data.map((d) => d.c);
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    // Ensure baseline is within visual range
    const domainMin = Math.min(low, previousClose);
    const domainMax = Math.max(high, previousClose);
    const range = domainMax - domainMin || 1;
    const padding = range * 0.08;
    const yMin = domainMin - padding;
    const yMax = domainMax + padding;
    const yRange = yMax - yMin;

    const w = 400;
    const h = height;

    const toX = (i: number) => (i / (data.length - 1)) * w;
    const toY = (v: number) => h - ((v - yMin) / yRange) * h;

    const baselineY = toY(previousClose);

    // Build polyline points
    const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.c) }));
    const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

    // Clip paths: above baseline (rise/red) and below baseline (fall/green)
    const clipAboveId = `clip-above-${Math.random().toString(36).slice(2, 8)}`;
    const clipBelowId = `clip-below-${Math.random().toString(36).slice(2, 8)}`;
    const gradAboveId = `grad-above-${Math.random().toString(36).slice(2, 8)}`;
    const gradBelowId = `grad-below-${Math.random().toString(36).slice(2, 8)}`;

    // Fill area path (close to bottom for above, close to top for below)
    const areaAbovePath = `${linePath} L${pts[pts.length - 1].x},${baselineY} L${pts[0].x},${baselineY} Z`;
    const areaBelowPath = areaAbovePath; // Same path, different clip

    // High/low labels
    const highIdx = prices.indexOf(high);
    const lowIdx = prices.indexOf(low);

    return {
      w,
      h,
      linePath,
      areaAbovePath,
      areaBelowPath,
      baselineY,
      clipAboveId,
      clipBelowId,
      gradAboveId,
      gradBelowId,
      high,
      low,
      highY: toY(high),
      lowY: toY(low),
      highX: toX(highIdx),
      lowX: toX(lowIdx),
    };
  }, [data, previousClose, height]);

  if (!chart) return null;

  return (
    <div className="w-full relative" style={{ height }}>
      <svg
        viewBox={`0 0 ${chart.w} ${chart.h}`}
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          {/* Clip: above baseline */}
          <clipPath id={chart.clipAboveId}>
            <rect x="0" y="0" width={chart.w} height={chart.baselineY} />
          </clipPath>
          {/* Clip: below baseline */}
          <clipPath id={chart.clipBelowId}>
            <rect x="0" y={chart.baselineY} width={chart.w} height={chart.h - chart.baselineY} />
          </clipPath>
          {/* Gradient: rise (red) fading down to baseline */}
          <linearGradient id={chart.gradAboveId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--fund-rise))" stopOpacity="0.25" />
            <stop offset="100%" stopColor="hsl(var(--fund-rise))" stopOpacity="0.02" />
          </linearGradient>
          {/* Gradient: fall (green) fading down from baseline */}
          <linearGradient id={chart.gradBelowId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--fund-fall))" stopOpacity="0.02" />
            <stop offset="100%" stopColor="hsl(var(--fund-fall))" stopOpacity="0.25" />
          </linearGradient>
        </defs>

        {/* Fill above baseline (red) */}
        <path
          d={chart.areaAbovePath}
          fill={`url(#${chart.gradAboveId})`}
          clipPath={`url(#${chart.clipAboveId})`}
        />
        {/* Fill below baseline (green) */}
        <path
          d={chart.areaBelowPath}
          fill={`url(#${chart.gradBelowId})`}
          clipPath={`url(#${chart.clipBelowId})`}
        />

        {/* Line above baseline (red) */}
        <path
          d={chart.linePath}
          fill="none"
          stroke="hsl(var(--fund-rise))"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          clipPath={`url(#${chart.clipAboveId})`}
        />
        {/* Line below baseline (green) */}
        <path
          d={chart.linePath}
          fill="none"
          stroke="hsl(var(--fund-fall))"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          clipPath={`url(#${chart.clipBelowId})`}
        />

        {/* Dashed baseline */}
        <line
          x1="0"
          y1={chart.baselineY}
          x2={chart.w}
          y2={chart.baselineY}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="1"
          strokeDasharray="6 4"
          vectorEffect="non-scaling-stroke"
          opacity="0.5"
        />
      </svg>

      {/* High / Low labels */}
      <span className="absolute left-1 text-[9px] text-muted-foreground tabular-nums leading-none" style={{ top: 2 }}>
        H {chart.high.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      <span className="absolute left-1 text-[9px] text-muted-foreground tabular-nums leading-none" style={{ bottom: 2 }}>
        L {chart.low.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );
}
