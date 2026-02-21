import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  ResponsiveContainer,
  LabelList,
  Label,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "@/lib/theme";

interface Score {
  holeNumber: number;
  grossScore: number;
  netScore: number | null;
  stablefordPoints: number | null;
  gir: boolean | null;
  fir: boolean | null;
  putts: number | null;
}

interface Hole {
  number: number;
  par: number;
  strokeIndex: number;
}

interface RoundStatsChartsProps {
  scores: Score[];
  holes: Hole[];
}

const DIST_COLORS_LIGHT = {
  eagle:  "#f59e0b",
  birdie: "#ef4444",
  par:    "#9ca3af",
  bogey:  "#93c5fd",
  double: "#1e40af",
};
const DIST_COLORS_DARK = {
  eagle:  "#fbbf24",
  birdie: "#f87171",
  par:    "#9ca3af",
  bogey:  "#60a5fa",
  double: "#3b82f6",
};

// Colored % label rendered above each bar inside the SVG
function PctLabel({ x, y, width, index, data }: any) {
  const entry = data?.[index];
  if (!entry || entry.count === 0) return null;
  return (
    <text
      x={(x ?? 0) + (width ?? 0) / 2}
      y={(y ?? 0) - 5}
      textAnchor="middle"
      style={{ fontSize: 10, fontWeight: 800, fill: entry.color }}
    >
      {entry.pct}%
    </text>
  );
}

// Colored category tick on X axis
function ScoreTick({ x, y, payload, distColors }: any) {
  const dc = distColors || DIST_COLORS_LIGHT;
  const colors: Record<string, string> = {
    EAGLE:   dc.eagle,
    BIRDIE:  dc.birdie,
    PAR:     dc.par,
    BOGEY:   dc.bogey,
    "D.BOG": dc.double,
  };
  return (
    <g transform={`translate(${x},${y + 4})`}>
      <text
        textAnchor="middle"
        style={{ fontSize: 8, fontWeight: 700, fill: colors[payload.value] || "#94a3b8" }}
      >
        {payload.value}
      </text>
    </g>
  );
}

// Compact donut — fixed 100×100 px chart so it never overflows on mobile
function DonutStat({
  hit, miss, label, color, emptyColor,
}: { hit: number; miss: number; label: string; color: string; emptyColor: string }) {
  const total = hit + miss;
  const pct   = total > 0 ? Math.round((hit / total) * 100) : 0;
  const data  = [{ value: hit }, { value: Math.max(miss, 0) }];

  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>

      {/* Fixed 100×100 chart. margin=0 means cx=50,cy=50 == exact SVG+ring centre. */}
      <div style={{ width: 100, height: 100 }}>
        <PieChart width={100} height={100} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Pie
            data={data}
            cx={50}
            cy={50}
            innerRadius={28}
            outerRadius={44}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            strokeWidth={0}
          >
            <Cell fill={color} />
            <Cell fill={emptyColor} />
            {/* Hardcode x/y to the known ring centre (50,50).
                dy="0.35em" replaces dominantBaseline for Safari/iOS compat. */}
            <Label
              content={() => (
                <text x={50} y={50} textAnchor="middle" dy="0.35em">
                  <tspan style={{ fontSize: 16, fontWeight: 800, fill: color }}>
                    {pct}%
                  </tspan>
                </text>
              )}
            />
          </Pie>
        </PieChart>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-400">HIT {hit}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-600" />
          <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">MISS {miss}</span>
        </div>
      </div>
    </div>
  );
}


export function RoundStatsCharts({ scores, holes }: RoundStatsChartsProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const DIST_COLORS = isDark ? DIST_COLORS_DARK : DIST_COLORS_LIGHT;

  if (scores.length === 0 || holes.length === 0) return null;

  // ── Score distribution ────────────────────────────────────────────
  const dist = { eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0 };
  scores.forEach(s => {
    const hole = holes.find(h => h.number === s.holeNumber);
    if (!hole || !s.grossScore) return;
    const diff = s.grossScore - hole.par;
    if (diff <= -2)       dist.eagle++;
    else if (diff === -1) dist.birdie++;
    else if (diff === 0)  dist.par++;
    else if (diff === 1)  dist.bogey++;
    else                  dist.double++;
  });

  const holesPlayed = scores.filter(s => s.grossScore).length;
  const pct = (n: number) => holesPlayed > 0 ? Math.round(n / holesPlayed * 100) : 0;

  const scoreDistData = [
    { name: "EAGLE",  count: dist.eagle,  pct: pct(dist.eagle),  color: DIST_COLORS.eagle },
    { name: "BIRDIE", count: dist.birdie, pct: pct(dist.birdie), color: DIST_COLORS.birdie },
    { name: "PAR",    count: dist.par,    pct: pct(dist.par),    color: DIST_COLORS.par },
    { name: "BOGEY",  count: dist.bogey,  pct: pct(dist.bogey),  color: DIST_COLORS.bogey },
    { name: "D.BOG",  count: dist.double, pct: pct(dist.double), color: DIST_COLORS.double },
  ];

  // ── Avg score vs par by hole type ────────────────────────────────
  const parTypeStats = ([3, 4, 5] as const).map(par => {
    const parScores = scores.filter(s => {
      const h = holes.find(h => h.number === s.holeNumber);
      return h?.par === par && s.grossScore;
    });
    if (parScores.length === 0) return null;
    const avgToPar = parScores.reduce((sum, s) => {
      const h = holes.find(h => h.number === s.holeNumber);
      return sum + (s.grossScore - (h?.par ?? par));
    }, 0) / parScores.length;
    return { par, avgToPar, count: parScores.length };
  }).filter((x): x is { par: 3 | 4 | 5; avgToPar: number; count: number } => x !== null);

  // ── FIR ──────────────────────────────────────────────────────────
  const firEligible = holes.filter(h => h.par !== 3);
  const firTracked  = firEligible.filter(h => {
    const s = scores.find(sc => sc.holeNumber === h.number);
    return s?.fir !== null && s?.fir !== undefined;
  }).length;
  const firHits = firEligible.filter(
    h => scores.find(sc => sc.holeNumber === h.number)?.fir === true,
  ).length;

  // ── GIR ──────────────────────────────────────────────────────────
  const girTracked = scores.filter(s => s.gir !== null && s.gir !== undefined).length;
  const girHits    = scores.filter(s => s.gir === true).length;

  // ── Putts ─────────────────────────────────────────────────────────
  const puttsScores = scores.filter(s => s.putts !== null && s.putts !== undefined);
  const totalPutts  = puttsScores.reduce((sum, s) => sum + (s.putts as number), 0);
  const avgPutts    = puttsScores.length > 0 ? totalPutts / puttsScores.length : null;

  const avgPuttsByPar = ([3, 4, 5] as const).map(par => {
    const parPutts = puttsScores.filter(s => {
      const h = holes.find(h => h.number === s.holeNumber);
      return h?.par === par;
    });
    if (parPutts.length === 0) return null;
    const avg = parPutts.reduce((sum, s) => sum + (s.putts as number), 0) / parPutts.length;
    return { par, avg, count: parPutts.length };
  }).filter((x): x is { par: 3 | 4 | 5; avg: number; count: number } => x !== null);

  const hasFirGir = firTracked > 0 || girTracked > 0;
  const hasPutts  = puttsScores.length > 0;

  return (
    <div className="space-y-3 mt-4">

      {/* ── Score Distribution ──────────────────────────────────── */}
      <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
        <CardContent className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Score Distribution
          </p>

          {/* Bar chart — % shown above bars, count shown below in grid */}
          <div style={{ height: 110 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={scoreDistData}
                margin={{ top: 18, right: 4, left: 4, bottom: 4 }}
                barCategoryGap="28%"
              >
                <XAxis
                  dataKey="name"
                  tick={<ScoreTick distColors={DIST_COLORS} />}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={46} minPointSize={0}>
                  {scoreDistData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.count > 0 ? entry.color : (isDark ? "#1e293b" : "#f1f5f9")} />
                  ))}
                  {/* % label above each bar, colored to match */}
                  <LabelList content={<PctLabel data={scoreDistData} />} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Count row below */}
          <div className="grid grid-cols-5 mt-1">
            {scoreDistData.map(d => (
              <div key={d.name} className="text-center">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  {d.count > 0 ? d.count : "—"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Avg Score vs Par ────────────────────────────────────── */}
      {parTypeStats.length > 0 && (
        <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
              Avg Score vs Par
            </p>

            <div className="space-y-3.5">
              {(() => {
                // Max absolute toPar determines bar scale
                const maxVal = Math.max(...parTypeStats.map(d => Math.abs(d.avgToPar)), 0.5);
                return parTypeStats.map(d => {
                  const sign     = d.avgToPar >= 0 ? "+" : "";
                  const barPct   = Math.round((Math.abs(d.avgToPar) / maxVal) * 100);
                  // Color: under par=green, 0-1=amber, 1-2=light blue, 2+=dark blue
                  const barColor = isDark
                    ? (d.avgToPar < 0 ? "#4ade80" : d.avgToPar < 1 ? "#fbbf24" : d.avgToPar < 2 ? "#60a5fa" : "#3b82f6")
                    : (d.avgToPar < 0 ? "#22c55e" : d.avgToPar < 1 ? "#f59e0b" : d.avgToPar < 2 ? "#93c5fd" : "#1e40af");
                  const textColor = isDark
                    ? (d.avgToPar < 0 ? "#4ade80" : d.avgToPar < 1 ? "#fbbf24" : d.avgToPar < 2 ? "#60a5fa" : "#3b82f6")
                    : (d.avgToPar < 0 ? "#16a34a" : d.avgToPar < 1 ? "#d97706" : d.avgToPar < 2 ? "#3b82f6" : "#1e40af");

                  return (
                    <div key={d.par} className="flex items-center gap-3">
                      {/* Label */}
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 w-11 flex-shrink-0">
                        Par {d.par}
                      </span>

                      {/* Bar track */}
                      <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-3.5 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(barPct, 6)}%`,
                            backgroundColor: barColor,
                          }}
                        />
                      </div>

                      {/* Value */}
                      <span
                        className="text-xs font-bold w-12 text-right flex-shrink-0"
                        style={{ color: textColor }}
                      >
                        {sign}{d.avgToPar.toFixed(2)}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Hole counts */}
            <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-3 text-center">
              {parTypeStats.map(d => `Par ${d.par}: ${d.count} hole${d.count !== 1 ? "s" : ""}`).join(" · ")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── FIR + GIR — single compact card ────────────────────── */}
      {hasFirGir && (
        <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Fairways &amp; Greens
            </p>
            <div className={
              firTracked > 0 && girTracked > 0
                ? "grid grid-cols-2 gap-2"
                : "flex justify-center"
            }>
              {firTracked > 0 && (
                <DonutStat
                  hit={firHits}
                  miss={firTracked - firHits}
                  label="Fairways (FIR)"
                  color={isDark ? "#60a5fa" : "#3b82f6"}
                  emptyColor={isDark ? "#334155" : "#e2e8f0"}
                />
              )}
              {girTracked > 0 && (
                <DonutStat
                  hit={girHits}
                  miss={girTracked - girHits}
                  label="Greens (GIR)"
                  color={isDark ? "#4ade80" : "#22c55e"}
                  emptyColor={isDark ? "#334155" : "#e2e8f0"}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Putting ─────────────────────────────────────────────── */}
      {hasPutts && avgPutts !== null && (
        <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Putting
              </p>
              <div className="text-right">
                <span className="text-2xl font-bold text-slate-800 dark:text-slate-200">{avgPutts.toFixed(1)}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1">avg putts/hole</span>
              </div>
            </div>

            {/* Avg putts per par type */}
            {avgPuttsByPar.length > 0 && (
              <div className="space-y-3">
                {(() => {
                  const maxAvg = Math.max(...avgPuttsByPar.map(d => d.avg), 1);
                  return avgPuttsByPar.map(d => {
                    const barPct   = Math.round((d.avg / maxAvg) * 100);
                    // Color: <1.5=green, 1.5-2=slate, 2-2.5=amber, >2.5=red
                    const barColor = isDark
                      ? (d.avg < 1.5 ? "#4ade80" : d.avg < 2.0 ? "#94a3b8" : d.avg < 2.5 ? "#fbbf24" : "#f87171")
                      : (d.avg < 1.5 ? "#22c55e" : d.avg < 2.0 ? "#64748b" : d.avg < 2.5 ? "#f59e0b" : "#ef4444");
                    return (
                      <div key={d.par} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 w-11 flex-shrink-0">
                          Par {d.par}
                        </span>
                        <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-3.5 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.max(barPct, 6)}%`, backgroundColor: barColor }}
                          />
                        </div>
                        <span className="text-xs font-bold w-10 text-right flex-shrink-0" style={{ color: barColor }}>
                          {d.avg.toFixed(1)}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
