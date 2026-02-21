import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { calculateStrokesGained } from "@/lib/strokes-gained";
import { useTheme } from "@/lib/theme";
import type { Score } from "@shared/schema";

interface StrokesGainedSectionProps {
  rounds?: { holes?: { number: number; par: number }[]; roundNumber?: number }[];
  allScoresData?: Score[][];
  players?: { id: number; name: string; team?: { name: string; color: string } | null }[];
}

function formatSG(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "\u2212" : "";
  return `${sign}${Math.abs(value).toFixed(1)}`;
}

function sgColor(value: number | null): string {
  if (value === null) return "text-slate-400 dark:text-slate-500";
  if (value > 0) return "text-emerald-600 dark:text-emerald-400";
  if (value < 0) return "text-red-500 dark:text-red-400";
  return "text-slate-600 dark:text-slate-400";
}

// Bar chart label showing SG value above each bar
function SGBarLabel({ x, y, width, height, index, data, isDark }: any) {
  const entry = data?.[index];
  if (!entry) return null;
  const isPositive = entry.sg >= 0;
  const color = isPositive
    ? (isDark ? "#4ade80" : "#16a34a")
    : (isDark ? "#f87171" : "#ef4444");
  const labelY = isPositive ? (y ?? 0) - 5 : (y ?? 0) + (height ?? 0) + 12;
  return (
    <text
      x={(x ?? 0) + (width ?? 0) / 2}
      y={labelY}
      textAnchor="middle"
      style={{ fontSize: 10, fontWeight: 800, fill: color }}
    >
      {formatSG(entry.sg)}
    </text>
  );
}

export function StrokesGainedSection({ rounds, allScoresData, players }: StrokesGainedSectionProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [expandedPlayerId, setExpandedPlayerId] = useState<number | null>(null);

  const sgData = useMemo(() => {
    if (!allScoresData || allScoresData.length === 0 || !rounds) return null;
    return calculateStrokesGained(allScoresData, rounds);
  }, [allScoresData, rounds]);

  const rankedPlayers = useMemo(() => {
    if (!sgData || !players) return [];
    return players
      .filter(p => sgData.has(p.id))
      .map(p => ({ player: p, sg: sgData.get(p.id)! }))
      .sort((a, b) => b.sg.sgTotal - a.sg.sgTotal);
  }, [sgData, players]);

  if (!rankedPlayers.length) return null;

  const totalPlayers = rankedPlayers.length;

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2 px-2 pt-4 pb-1">
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Strokes Gained vs Field
        </span>
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      </div>

      {totalPlayers < 4 && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400 text-center px-2">
          Small field — values may be less meaningful
        </p>
      )}

      {/* Column headers */}
      <div className="grid grid-cols-4 gap-1 px-2 mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Player</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">SG:Total</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">SG:Putt</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">SG:T2G</span>
      </div>

      {rankedPlayers.map(({ player, sg }) => (
        <div key={player.id} className="space-y-2">
          <Card
            className="border-0 shadow-sm bg-white dark:bg-slate-800 cursor-pointer hover:shadow-md transition-all"
            onClick={() => setExpandedPlayerId(prev => prev === player.id ? null : player.id)}
          >
            <CardContent className="p-3">
              <div className="grid grid-cols-4 gap-1 items-center">
                {/* Player name */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: player.team?.color || "#888" }}
                    />
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{player.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-3.5">{player.team?.name || ""}</span>
                </div>

                {/* SG: Total */}
                <div className="text-center">
                  <div className={`text-sm font-bold ${sgColor(sg.sgTotal)}`}>
                    {formatSG(sg.sgTotal)}
                  </div>
                  <div className="text-[9px] text-slate-500 dark:text-slate-400">{sg.holesPlayed} holes</div>
                </div>

                {/* SG: Putting */}
                <div className="text-center">
                  {sg.sgPutting !== null ? (
                    <div className={`text-sm font-bold ${sgColor(sg.sgPutting)}`}>
                      {formatSG(sg.sgPutting)}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </div>

                {/* SG: T2G */}
                <div className="text-center">
                  {sg.sgTeeToGreen !== null ? (
                    <div className={`text-sm font-bold ${sgColor(sg.sgTeeToGreen)}`}>
                      {formatSG(sg.sgTeeToGreen)}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expanded detail */}
          {expandedPlayerId === player.id && (
            <div className="animate-in slide-in-from-top-2 fade-in duration-200">
              <Card className="border-l-4 border-l-primary shadow-md">
                <CardContent className="p-4 space-y-4">
                  {/* SG by Par type bar chart */}
                  {sg.sgByPar.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        SG: Total by Hole Type
                      </p>
                      <div style={{ height: 110 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={sg.sgByPar.map(d => ({
                              name: `Par ${d.par}`,
                              sg: parseFloat(d.sg.toFixed(2)),
                              count: d.holes,
                            }))}
                            margin={{ top: 18, right: 4, left: 4, bottom: 16 }}
                            barCategoryGap="28%"
                          >
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 10, fontWeight: 700, fill: isDark ? "#94a3b8" : "#64748b" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Bar dataKey="sg" radius={[4, 4, 0, 0]} maxBarSize={46}>
                              {sg.sgByPar.map((d, idx) => (
                                <Cell key={idx} fill={d.sg >= 0 ? (isDark ? "#4ade80" : "#22c55e") : (isDark ? "#f87171" : "#ef4444")} />
                              ))}
                              <LabelList
                                content={
                                  <SGBarLabel
                                    isDark={isDark}
                                    data={sg.sgByPar.map(d => ({
                                      sg: d.sg,
                                    }))}
                                  />
                                }
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 text-center mt-1">
                        {sg.sgByPar.map(d => `Par ${d.par}: ${d.holes} hole${d.holes !== 1 ? "s" : ""}`).join(" · ")}
                      </p>
                    </div>
                  )}

                  {/* Per-round summary */}
                  {sg.sgByRound.length > 1 && rounds && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        SG by Round
                      </p>
                      <div className="space-y-2">
                        {sg.sgByRound.map(d => {
                          const round = rounds[d.roundIndex];
                          return (
                            <div key={d.roundIndex} className="flex items-center justify-between">
                              <span className="text-xs text-slate-600 dark:text-slate-400">
                                Round {round?.roundNumber ?? d.roundIndex + 1}
                              </span>
                              <span className={`text-xs font-bold ${sgColor(d.sg)}`}>
                                {formatSG(d.sg)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      ))}

      <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center px-2">
        SG = Strokes Gained vs field average · Positive = better than peers
      </p>
    </div>
  );
}
