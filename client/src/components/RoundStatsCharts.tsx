import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";

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

const DIST_COLORS = {
  eagle:  "#f59e0b",
  birdie: "#ef4444",
  par:    "#9ca3af",
  bogey:  "#93c5fd",
  double: "#1e40af",
};

// Custom XAxis tick renders the category name
function ScoreTick({ x, y, payload }: any) {
  const colors: Record<string, string> = {
    EAGLE:   DIST_COLORS.eagle,
    BIRDIE:  DIST_COLORS.birdie,
    PAR:     DIST_COLORS.par,
    BOGEY:   DIST_COLORS.bogey,
    "D.BOG": DIST_COLORS.double,
  };
  return (
    <g transform={`translate(${x},${y + 4})`}>
      <text
        textAnchor="middle"
        style={{ fontSize: 8, fontWeight: 700, fill: colors[payload.value] || "#64748b" }}
      >
        {payload.value}
      </text>
    </g>
  );
}

// Donut chart for FIR or GIR
function DonutStat({
  hit, miss, label, color,
}: { hit: number; miss: number; label: string; color: string }) {
  const total = hit + miss;
  const pct = total > 0 ? Math.round((hit / total) * 100) : 0;
  const data = [{ value: hit }, { value: Math.max(miss, 0) }];

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardContent className="p-3 flex flex-col items-center gap-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>

        <div className="relative w-[100px] h-[100px]">
          <PieChart width={100} height={100}>
            <Pie
              data={data}
              cx={50}
              cy={50}
              innerRadius={30}
              outerRadius={46}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              strokeWidth={0}
            >
              <Cell fill={color} />
              <Cell fill="#e2e8f0" />
            </Pie>
          </PieChart>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xl font-bold leading-none" style={{ color }}>
              {pct}%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[9px] font-semibold text-slate-600">HIT {hit}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-slate-200" />
            <span className="text-[9px] font-semibold text-slate-500">MISS {miss}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function RoundStatsCharts({ scores, holes }: RoundStatsChartsProps) {
  if (scores.length === 0 || holes.length === 0) return null;

  // ── Score distribution ──────────────────────────────────────────
  const dist = { eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0 };
  scores.forEach(s => {
    const hole = holes.find(h => h.number === s.holeNumber);
    if (!hole || !s.grossScore) return;
    const diff = s.grossScore - hole.par;
    if (diff <= -2)     dist.eagle++;
    else if (diff === -1) dist.birdie++;
    else if (diff === 0)  dist.par++;
    else if (diff === 1)  dist.bogey++;
    else                  dist.double++;
  });

  const holesPlayed = scores.filter(s => s.grossScore).length;

  const scoreDistData = [
    { name: "EAGLE",  count: dist.eagle,  pct: holesPlayed > 0 ? Math.round(dist.eagle  / holesPlayed * 100) : 0, color: DIST_COLORS.eagle },
    { name: "BIRDIE", count: dist.birdie, pct: holesPlayed > 0 ? Math.round(dist.birdie / holesPlayed * 100) : 0, color: DIST_COLORS.birdie },
    { name: "PAR",    count: dist.par,    pct: holesPlayed > 0 ? Math.round(dist.par    / holesPlayed * 100) : 0, color: DIST_COLORS.par },
    { name: "BOGEY",  count: dist.bogey,  pct: holesPlayed > 0 ? Math.round(dist.bogey  / holesPlayed * 100) : 0, color: DIST_COLORS.bogey },
    { name: "D.BOG",  count: dist.double, pct: holesPlayed > 0 ? Math.round(dist.double / holesPlayed * 100) : 0, color: DIST_COLORS.double },
  ];

  // ── FIR stats ───────────────────────────────────────────────────
  const firEligible = holes.filter(h => h.par !== 3);
  const firTracked = firEligible.filter(h => {
    const s = scores.find(sc => sc.holeNumber === h.number);
    return s?.fir !== null && s?.fir !== undefined;
  }).length;
  const firHits  = firEligible.filter(h => scores.find(sc => sc.holeNumber === h.number)?.fir === true).length;
  const firMiss  = firTracked - firHits;

  // ── GIR stats ───────────────────────────────────────────────────
  const girTracked = scores.filter(s => s.gir !== null && s.gir !== undefined).length;
  const girHits    = scores.filter(s => s.gir === true).length;
  const girMiss    = girTracked - girHits;

  // ── Putts per hole ──────────────────────────────────────────────
  const puttsData = scores
    .filter(s => s.putts !== null && s.putts !== undefined)
    .sort((a, b) => a.holeNumber - b.holeNumber)
    .map(s => ({ hole: s.holeNumber, putts: s.putts as number }));

  const totalPutts = puttsData.reduce((sum, d) => sum + d.putts, 0);
  const avgPutts   = puttsData.length > 0 ? (totalPutts / puttsData.length).toFixed(1) : null;

  const hasFirGir = firTracked > 0 || girTracked > 0;
  const hasPutts  = puttsData.length > 0;

  return (
    <div className="space-y-3 mt-4">

      {/* ── Score Distribution ─────────────────────────────────── */}
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">
            Score Distribution
          </p>

          {/* % labels row */}
          <div className="grid grid-cols-5 mb-1 px-1">
            {scoreDistData.map(d => (
              <div key={d.name} className="text-center">
                <span
                  className="text-xs font-bold"
                  style={{ color: d.count > 0 ? d.color : "#cbd5e1" }}
                >
                  {d.count > 0 ? `${d.pct}%` : ""}
                </span>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={scoreDistData}
                margin={{ top: 0, right: 4, left: 4, bottom: 4 }}
                barCategoryGap="30%"
              >
                <XAxis
                  dataKey="name"
                  tick={<ScoreTick />}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={44} minPointSize={2}>
                  {scoreDistData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.count > 0 ? entry.color : "#f1f5f9"} />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="insideTop"
                    style={{ fontSize: 11, fontWeight: 800, fill: "#fff" }}
                    formatter={(v: number) => (v > 0 ? v : "")}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── FIR + GIR Donuts ──────────────────────────────────── */}
      {hasFirGir && (
        <div className={`grid gap-3 ${firTracked > 0 && girTracked > 0 ? "grid-cols-2" : "grid-cols-1 max-w-[180px] mx-auto"}`}>
          {firTracked > 0 && (
            <DonutStat hit={firHits} miss={firMiss} label="Fairways (FIR)" color="#3b82f6" />
          )}
          {girTracked > 0 && (
            <DonutStat hit={girHits} miss={girMiss} label="Greens (GIR)" color="#22c55e" />
          )}
        </div>
      )}

      {/* ── Putts per Hole ────────────────────────────────────── */}
      {hasPutts && (
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Putts per Hole
              </p>
              {avgPutts && (
                <div className="text-right">
                  <span className="text-base font-bold text-slate-800">{avgPutts}</span>
                  <span className="text-[10px] text-slate-500 ml-0.5">avg</span>
                </div>
              )}
            </div>

            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={puttsData}
                  margin={{ top: 10, right: 2, left: 2, bottom: 0 }}
                  barCategoryGap="15%"
                >
                  <XAxis
                    dataKey="hole"
                    tick={{ fontSize: 7, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  <Bar dataKey="putts" fill="#64748b" radius={[2, 2, 0, 0]} maxBarSize={20}>
                    <LabelList
                      dataKey="putts"
                      position="top"
                      style={{ fontSize: 8, fontWeight: 700, fill: "#475569" }}
                    />
                    {puttsData.map((d, idx) => (
                      <Cell
                        key={idx}
                        fill={d.putts >= 3 ? "#ef4444" : d.putts === 1 ? "#22c55e" : "#64748b"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 mt-2 justify-center">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[9px] text-slate-500">1 putt</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-slate-500" />
                <span className="text-[9px] text-slate-500">2 putts</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[9px] text-slate-500">3+ putts</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
