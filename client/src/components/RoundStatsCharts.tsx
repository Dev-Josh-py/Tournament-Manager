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

// Donut — % is rendered inside the SVG via recharts Label so it's always centered
function DonutStat({
  hit, miss, label, color,
}: { hit: number; miss: number; label: string; color: string }) {
  const total = hit + miss;
  const pct   = total > 0 ? Math.round((hit / total) * 100) : 0;
  const data  = [{ value: hit }, { value: Math.max(miss, 0) }];

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardContent className="p-3 flex flex-col items-center gap-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>

        {/* ResponsiveContainer lets the donut fill available width on any screen */}
        <div className="w-full" style={{ height: 120 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="38%"
                outerRadius="58%"
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                strokeWidth={0}
              >
                <Cell fill={color} />
                <Cell fill="#e2e8f0" />
                {/* Center label rendered inside the SVG — always visible */}
                <Label
                  content={({ viewBox }) => {
                    const { cx = 0, cy = 0 } = (viewBox as { cx?: number; cy?: number }) ?? {};
                    return (
                      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
                        <tspan
                          style={{ fontSize: 20, fontWeight: 800, fill: color }}
                        >
                          {pct}%
                        </tspan>
                      </text>
                    );
                  }}
                />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] font-semibold text-slate-700">HIT {hit}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
            <span className="text-[10px] font-semibold text-slate-500">MISS {miss}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Mini bar chart for 9 holes of putts
interface PuttEntry { hole: number; putts: number }
function PuttsNine({ data, label }: { data: PuttEntry[]; label: string }) {
  if (data.length === 0) return null;
  return (
    <div>
      <p className="text-[9px] font-bold uppercase text-slate-400 mb-1 tracking-wider">{label}</p>
      <div style={{ height: 68 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 14, right: 2, left: 2, bottom: 0 }} barCategoryGap="20%">
            <XAxis
              dataKey="hole"
              tick={{ fontSize: 8, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <Bar dataKey="putts" radius={[3, 3, 0, 0]} maxBarSize={22} minPointSize={4}>
              <LabelList
                dataKey="putts"
                position="top"
                style={{ fontSize: 9, fontWeight: 700, fill: "#475569" }}
              />
              {data.map((d, idx) => (
                <Cell
                  key={idx}
                  fill={d.putts >= 3 ? "#ef4444" : d.putts === 1 ? "#22c55e" : "#64748b"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function RoundStatsCharts({ scores, holes }: RoundStatsChartsProps) {
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
  const puttsData = scores
    .filter(s => s.putts !== null && s.putts !== undefined)
    .sort((a, b) => a.holeNumber - b.holeNumber)
    .map(s => ({ hole: s.holeNumber, putts: s.putts as number }));

  const totalPutts = puttsData.reduce((sum, d) => sum + d.putts, 0);
  const avgPutts   = puttsData.length > 0 ? (totalPutts / puttsData.length).toFixed(1) : null;

  const front9Putts = puttsData.filter(d => d.hole <= 9);
  const back9Putts  = puttsData.filter(d => d.hole > 9);

  const hasFirGir = firTracked > 0 || girTracked > 0;
  const hasPutts  = puttsData.length > 0;

  return (
    <div className="space-y-3 mt-4">

      {/* ── Score Distribution ──────────────────────────────────── */}
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
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
                  tick={<ScoreTick />}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={46} minPointSize={3}>
                  {scoreDistData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.count > 0 ? entry.color : "#f1f5f9"} />
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
                <span className="text-[10px] font-bold text-slate-500">
                  {d.count > 0 ? d.count : "—"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── FIR + GIR Donuts ────────────────────────────────────── */}
      {hasFirGir && (
        <div className={
          firTracked > 0 && girTracked > 0
            ? "grid grid-cols-2 gap-3"
            : "flex justify-center"
        }>
          {firTracked > 0 && (
            <DonutStat
              hit={firHits}
              miss={firTracked - firHits}
              label="Fairways (FIR)"
              color="#3b82f6"
            />
          )}
          {girTracked > 0 && (
            <DonutStat
              hit={girHits}
              miss={girTracked - girHits}
              label="Greens (GIR)"
              color="#22c55e"
            />
          )}
        </div>
      )}

      {/* ── Putts per Hole ──────────────────────────────────────── */}
      {hasPutts && (
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Putts per Hole
              </p>
              {avgPutts && (
                <span className="text-sm font-bold text-slate-700">
                  {avgPutts}
                  <span className="text-[10px] font-normal text-slate-500 ml-0.5">avg/hole</span>
                </span>
              )}
            </div>

            {/* Split into front 9 / back 9 so bars aren't cramped on mobile */}
            <div className="space-y-3">
              <PuttsNine data={front9Putts} label="Front 9" />
              <PuttsNine data={back9Putts}  label="Back 9" />
            </div>

            <div className="flex items-center gap-4 mt-3 justify-center">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] text-slate-500">1 putt</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                <span className="text-[9px] text-slate-500">2 putts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-[9px] text-slate-500">3+ putts</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
