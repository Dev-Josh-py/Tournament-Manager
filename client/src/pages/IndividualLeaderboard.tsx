import { useMemo, useState } from "react";
import { usePlayers, useRounds, useAllRoundsScores, useScores } from "@/hooks/use-tournament";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/Navigation";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ScoreboardTable } from "@/components/ScoreboardTable";
import { RoundStatsCharts } from "@/components/RoundStatsCharts";
import { calculateStrokesGained, type PlayerStrokesGained } from "@/lib/strokes-gained";
import { Users, ChevronDown, ChevronUp, Target, ChevronRight } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import type { Score } from "@shared/schema";
import { clsx } from "clsx";
import { useLocation } from "wouter";
import { useTheme } from "@/lib/theme";

interface PlayerScore {
  playerId: number;
  playerName: string;
  teamName: string;
  teamColor: string;
  totalNetScore: number;
  totalPar: number;
  toPar: number;
  roundCount: number;
  netScoresByRound: number[];
  handicap: number;
}

interface PlayerRoundScore {
  playerId: number;
  playerName: string;
  teamName: string;
  teamColor: string;
  netScore: number;
  grossScore: number;
  par: number;
  toPar: number;
  handicap: number;
  rank?: number;
}

export default function IndividualLeaderboard() {
  const { data: players } = usePlayers();
  const { data: rounds } = useRounds();
  const [expandedPlayerId, setExpandedPlayerId] = useState<number | null>(null);
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set());
  const [expandedPlayersByRound, setExpandedPlayersByRound] = useState<Map<number, number | null>>(new Map());
  const [expandedStatsPlayerId, setExpandedStatsPlayerId] = useState<number | null>(null);
  const [, navigate] = useLocation();

  // Fetch scores for all rounds in parallel
  const roundIds = rounds?.map(r => r.id) || [];
  const { data: allScoresData } = useAllRoundsScores(roundIds);

  // Toggle function for accordion behavior (Tournament tab)
  const togglePlayer = (playerId: number) => {
    setExpandedPlayerId(prev => prev === playerId ? null : playerId);
  };

  // Toggle "Show All" for a round
  const toggleRoundExpansion = (roundId: number) => {
    setExpandedRounds(prev => {
      const next = new Set(prev);
      if (next.has(roundId)) {
        next.delete(roundId);
        // Clear expanded player in this round
        setExpandedPlayersByRound(prev => {
          const next = new Map(prev);
          next.delete(roundId);
          return next;
        });
      } else {
        next.add(roundId);
      }
      return next;
    });
  };

  // Toggle scorecard for a player within a round
  const togglePlayerInRound = (roundId: number, playerId: number) => {
    setExpandedPlayersByRound(prev => {
      const next = new Map(prev);
      const current = next.get(roundId);
      next.set(roundId, current === playerId ? null : playerId);
      return next;
    });
  };

  // Calculate individual standings
  const standings = useMemo(() => {
    if (!players || !rounds || !allScoresData) return [];

    // Check if all required data has loaded
    const hasAllData = allScoresData.length > 0 && allScoresData.length === rounds.length;
    if (!hasAllData) return [];

    const playerScoresMap = new Map<number, PlayerScore>();

    // Initialize players
    players.forEach(player => {
      playerScoresMap.set(player.id, {
        playerId: player.id,
        playerName: player.name,
        teamName: player.team?.name || "N/A",
        teamColor: player.team?.color || "#888",
        totalNetScore: 0,
        totalPar: 0,
        toPar: 0,
        roundCount: 0,
        netScoresByRound: [],
        handicap: player.handicap,
      });
    });

    // Aggregate scores from all rounds
    rounds.forEach((round, roundIndex) => {
      // Skip scramble rounds — they have no individual net scores
      if (round.formatType === 'team_scramble') return;

      const roundScores = allScoresData[roundIndex];
      if (!roundScores) return;

      // Group scores by player and calculate par based on actual holes played
      const playerRoundScores = new Map<number, { netScores: number[], par: number }>();
      roundScores.forEach(score => {
        if (!playerRoundScores.has(score.playerId)) {
          playerRoundScores.set(score.playerId, { netScores: [], par: 0 });
        }
        const playerData = playerRoundScores.get(score.playerId)!;
        playerData.netScores.push(score.netScore || 0);

        // Calculate par for this hole based on actual hole data
        const hole = round.holes?.find(h => h.number === score.holeNumber);
        if (hole) {
          playerData.par += hole.par;
        }
      });

      // Update player totals
      playerRoundScores.forEach((data, playerId) => {
        const player = playerScoresMap.get(playerId);
        if (player) {
          const roundNetTotal = data.netScores.reduce((a, b) => a + b, 0);
          player.totalNetScore += roundNetTotal;
          player.totalPar += data.par;
          player.netScoresByRound.push(roundNetTotal);
          player.roundCount += 1;
        }
      });
    });

    // Calculate to par and rank
    const standings = Array.from(playerScoresMap.values())
      .filter(p => p.roundCount > 0)
      .map(p => ({
        ...p,
        toPar: p.totalNetScore - p.totalPar,
      }))
      .sort((a, b) => a.toPar - b.toPar)
      .map((p, idx) => ({ ...p, rank: idx + 1 }));

    return standings;
  }, [players, rounds, allScoresData]);

  const getToParColor = (toPar: number) => {
    if (toPar <= -8) return "text-amber-500"; // Eagle+
    if (toPar <= -4) return "text-red-500 dark:text-red-400"; // Birdie range
    if (toPar === 0) return "text-slate-900 dark:text-slate-100"; // Even
    if (toPar <= 4) return "text-blue-600 dark:text-blue-400"; // Bogey range
    return "text-slate-500 dark:text-slate-400"; // Double+
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return "🏆";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return null;
  };

  const expandedPlayer = standings.find(p => p.playerId === expandedPlayerId);

  // Determine which round to display for a player
  const getDisplayRound = () => {
    if (!rounds || !expandedPlayer || !allScoresData) return null;

    // Check each round to find incomplete one (1-17 holes filled)
    for (let i = 0; i < rounds.length; i++) {
      const roundScores = allScoresData[i] || [];
      const playerScoresInRound = roundScores.filter(s => s.playerId === expandedPlayer.playerId);
      const holesFilledCount = playerScoresInRound.length;

      // Incomplete round: has some holes (1-17) but not all 18
      if (holesFilledCount > 0 && holesFilledCount < 18) {
        return { round: rounds[i], isIncomplete: true };
      }
    }

    // No incomplete rounds found - return last round with all 18 holes
    for (let i = rounds.length - 1; i >= 0; i--) {
      const roundScores = allScoresData[i] || [];
      const playerScoresInRound = roundScores.filter(s => s.playerId === expandedPlayer.playerId);
      if (playerScoresInRound.length === 18) {
        return { round: rounds[i], isIncomplete: false };
      }
    }

    // Fallback: return last round with any scores
    for (let i = rounds.length - 1; i >= 0; i--) {
      const roundScores = allScoresData[i] || [];
      const playerScoresInRound = roundScores.filter(s => s.playerId === expandedPlayer.playerId);
      if (playerScoresInRound.length > 0) {
        return { round: rounds[i], isIncomplete: true };
      }
    }

    return null;
  };

  const displayRoundInfo = getDisplayRound();

  // Fetch scores for expanded player's round (the specific round being displayed)
  const { data: expandedRoundScores, isLoading: scoresLoading } = useScores(
    displayRoundInfo?.round?.id ?? 0,
    { enabled: !!displayRoundInfo }
  );

  // CompactPlayerCard Component - for By Round tab
  const CompactPlayerCard = ({
    player,
    roundId,
    round
  }: {
    player: PlayerRoundScore;
    roundId: number;
    round: any;
  }) => {
    const isExpanded = expandedPlayersByRound.get(roundId) === player.playerId;
    const { data: roundScores } = useScores(roundId, { enabled: isExpanded });

    return (
      <div className="space-y-2">
        <Card
          className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer"
          onClick={() => togglePlayerInRound(roundId, player.playerId)}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              {/* Rank */}
              <div className="w-8 text-center">
                <span className="text-sm font-bold text-muted-foreground">#{player.rank}</span>
              </div>

              {/* Player Info */}
              <div className="flex-grow">
                <h4 className="font-semibold text-base">{player.playerName}</h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: player.teamColor }} />
                  <span>{player.teamName}</span>
                  <span>•</span>
                  <span>HCP {player.handicap}</span>
                </div>
              </div>

              {/* Scores */}
              <div className="text-right">
                <div className="text-xl font-bold">
                  {player.netScore}
                  <span className="text-xs font-normal text-muted-foreground ml-1">({player.grossScore})</span>
                </div>
                <div className={clsx("text-sm font-semibold", getToParColor(player.toPar))}>
                  {player.toPar > 0 ? '+' : ''}{player.toPar}
                </div>
                <div className="text-xs text-muted-foreground">({player.par} par)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expanded Scorecard */}
        {isExpanded && (
          <div className="animate-in slide-in-from-top-2 fade-in duration-200">
            <Card className="border-l-4 border-l-primary shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-lg">
                      R{round.roundNumber}: {round.course.name}
                      {roundScores && (() => {
                        const ps = roundScores.filter(s => s.playerId === player.playerId);
                        if (ps.length === 0) return null;
                        const gross = ps.reduce((sum, s) => sum + (s.grossScore || 0), 0);
                        const pts = ps.reduce((sum, s) => sum + (s.stablefordPoints || 0), 0);
                        return (
                          <span className="text-sm font-normal text-muted-foreground ml-2">
                            — {gross} ({pts} pts)
                          </span>
                        );
                      })()}
                    </h3>
                  </div>
                </div>

                {roundScores && roundScores.some(s => s.playerId === player.playerId) ? (
                  <ScoreboardTable
                    playerScores={roundScores.filter(s => s.playerId === player.playerId)}
                    holes={round.holes || []}
                    roundFormat={round.formatType}
                    compact={true}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No scores recorded for this round yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  };

  // RoundIndividualLeaderboard Component
  const RoundIndividualLeaderboard = ({ roundId, round }: { roundId: number; round: any }) => {
    const { data: roundScores } = useScores(roundId);

    const roundStandings = useMemo(() => {
      if (!players || !roundScores) return [];

      const playerScoresMap = new Map<number, PlayerRoundScore>();

      players.forEach(player => {
        const playerRoundScores = roundScores.filter(s => s.playerId === player.id);
        if (playerRoundScores.length === 0) return;

        const netScore = playerRoundScores.reduce((sum, s) => sum + (s.netScore || 0), 0);
        const grossScore = playerRoundScores.reduce((sum, s) => sum + (s.grossScore || 0), 0);
        const par = playerRoundScores.reduce((sum, s) => {
          const hole = round.holes?.find((h: any) => h.number === s.holeNumber);
          return sum + (hole?.par || 0);
        }, 0);

        playerScoresMap.set(player.id, {
          playerId: player.id,
          playerName: player.name,
          teamName: player.team?.name || "N/A",
          teamColor: player.team?.color || "#888",
          netScore,
          grossScore,
          par,
          toPar: netScore - par,
          handicap: player.handicap,
        });
      });

      return Array.from(playerScoresMap.values())
        .sort((a, b) => a.toPar - b.toPar)
        .map((p, idx) => ({ ...p, rank: idx + 1 }));
    }, [players, roundScores, round]);

    const top3 = roundStandings.slice(0, 3);
    const remaining = roundStandings.slice(3);

    return (
      <div className="space-y-3">
        {/* Round Header */}
        <div className="flex items-baseline justify-between px-1">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
            Round {round.roundNumber}
          </h3>
          <span className="text-xs text-muted-foreground">{round.course.name}</span>
        </div>

        {/* Top 3 Players */}
        {top3.length > 0 ? (
          <div className="space-y-2">
            {top3.map(player => (
              <CompactPlayerCard key={player.playerId} player={player} roundId={roundId} round={round} />
            ))}
          </div>
        ) : (
          <Card className="bg-slate-50 dark:bg-slate-900 border-dashed shadow-none">
            <CardContent className="p-4 flex items-center justify-center gap-2 text-muted-foreground text-sm">
              No scores posted yet
            </CardContent>
          </Card>
        )}

        {/* Collapsible for Remaining Players */}
        {remaining.length > 0 && (
          <Collapsible open={expandedRounds.has(roundId)} onOpenChange={() => toggleRoundExpansion(roundId)}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full text-xs h-auto py-2">
                {expandedRounds.has(roundId) ? (
                  <><ChevronUp className="w-4 h-4 mr-1" />Show Less</>
                ) : (
                  <><ChevronDown className="w-4 h-4 mr-1" />Show All Players ({remaining.length} more)</>
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {remaining.map(player => (
                <CompactPlayerCard key={player.playerId} player={player} roundId={roundId} round={round} />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <Header
        title="Individual Standings"
        subtitle="Net Score Leaderboard"
      />

      <PageTransition>
        <main className="max-w-2xl mx-auto px-4">
          <Tabs defaultValue="tournament" className="w-full">
            <TabsList className="w-full grid grid-cols-3 mb-6 bg-slate-200 dark:bg-slate-800 p-1">
              <TabsTrigger value="tournament">Tournament</TabsTrigger>
              <TabsTrigger value="rounds">By Round</TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
            </TabsList>

            <TabsContent value="tournament" className="space-y-4">
              {standings.length > 0 ? (
                standings.map((player, idx) => (
              <div key={player.playerId} className="space-y-2">
                {/* Player Summary Card */}
                <Card className={clsx(
                  "border-0 shadow-sm hover:shadow-lg transition-all overflow-hidden cursor-pointer active:scale-[0.99]",
                  idx === 0 ? "ring-2 ring-yellow-400 shadow-lg" : "",
                  idx === 1 ? "ring-2 ring-gray-400 shadow-md" : "",
                  idx === 2 ? "ring-2 ring-amber-700 shadow-md" : "",
                  expandedPlayerId === player.playerId && "ring-2 ring-primary"
                )}
                onClick={() => togglePlayer(player.playerId)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className="flex items-center justify-center w-12 h-12">
                        {getRankIcon(player.rank) ? (
                          <span className="text-2xl">{getRankIcon(player.rank)}</span>
                        ) : (
                          <span className="text-lg font-bold text-muted-foreground">
                            #{player.rank}
                          </span>
                        )}
                      </div>

                      {/* Player Info */}
                      <div className="flex-grow">
                        <h3 className="font-bold text-lg">{player.playerName}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: player.teamColor }}
                          />
                          <span>{player.teamName}</span>
                          <span>•</span>
                          <span>HCP Index {player.handicap}</span>
                        </div>
                      </div>

                      {/* Score Stats */}
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground font-medium mb-0.5">
                            Total
                          </div>
                          <div className="text-2xl font-bold">{player.totalNetScore}</div>
                          <div className="text-xs text-muted-foreground">
                            Rounds: {player.roundCount}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs text-muted-foreground font-medium mb-0.5">
                            To Par
                          </div>
                          <div className={clsx(
                            "text-2xl font-bold",
                            getToParColor(player.toPar)
                          )}>
                            {player.toPar > 0 ? '+' : ''}{player.toPar}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ({player.totalPar} par)
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Round Breakdown */}
                    {player.netScoresByRound.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs text-muted-foreground font-medium mb-2">
                          Round Scores
                        </div>
                        <div className="flex gap-2">
                          {player.netScoresByRound.map((score, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs"
                            >
                              R{idx + 1}: {score}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Expanded Scorecard - Inline */}
                {expandedPlayerId === player.playerId && displayRoundInfo && (
                  <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                    <Card className="border-l-4 border-l-primary shadow-md">
                      <CardContent className="p-4">
                        {/* Header with round info and link to full scorecard */}
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-bold text-lg">
                              R{displayRoundInfo.round.roundNumber}: {displayRoundInfo.round.course.name}
                              {expandedRoundScores && (() => {
                                const ps = expandedRoundScores.filter(s => s.playerId === player.playerId);
                                if (ps.length === 0) return null;
                                const gross = ps.reduce((sum, s) => sum + (s.grossScore || 0), 0);
                                const pts = ps.reduce((sum, s) => sum + (s.stablefordPoints || 0), 0);
                                return (
                                  <span className="text-sm font-normal text-muted-foreground ml-2">
                                    — {gross} ({pts} pts)
                                  </span>
                                );
                              })()}
                            </h3>
                            {displayRoundInfo.isIncomplete && (
                              <Badge variant="secondary" className="mt-1">In Progress</Badge>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/player/${player.playerId}`);
                            }}
                          >
                            Full Scorecard →
                          </Button>
                        </div>

                        {/* Scorecard Table */}
                        {scoresLoading ? (
                          <div className="text-center py-8 text-muted-foreground">
                            Loading scorecard...
                          </div>
                        ) : expandedRoundScores && expandedRoundScores.some(s => s.playerId === player.playerId) ? (
                          <ScoreboardTable
                            playerScores={expandedRoundScores.filter(s => s.playerId === player.playerId)}
                            holes={displayRoundInfo.round.holes || []}
                            roundFormat={displayRoundInfo.round.formatType}
                            compact={true}
                          />
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            No scores recorded for this round yet
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <div className="bg-slate-100 dark:bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 opacity-50" />
              </div>
              <p>No score data available yet</p>
            </div>
          )}
            </TabsContent>

            <TabsContent value="rounds" className="space-y-8">
              {rounds && rounds.length > 0 ? (
                rounds.map(round => (
                  round.formatType === 'team_scramble' ? (
                    <div key={round.id} className="space-y-3">
                      <div className="flex items-baseline justify-between px-1">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                          Round {round.roundNumber}
                        </h3>
                        <span className="text-xs text-muted-foreground">{round.course.name}</span>
                      </div>
                      <Card className="bg-slate-50 dark:bg-slate-900 border-dashed shadow-none">
                        <CardContent className="p-4 text-center text-muted-foreground text-sm">
                          Team Scramble — No individual scores
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <RoundIndividualLeaderboard key={round.id} roundId={round.id} round={round} />
                  )
                ))
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <div className="bg-slate-100 dark:bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-10 h-10 opacity-50" />
                  </div>
                  <p>No rounds scheduled yet</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="stats">
              <PlayerStatsTab
                rounds={rounds}
                allScoresData={allScoresData}
                players={players}
                expandedPlayerId={expandedStatsPlayerId}
                onTogglePlayer={(id) => setExpandedStatsPlayerId(prev => prev === id ? null : id)}
              />
            </TabsContent>
          </Tabs>

        </main>
      </PageTransition>

      <BottomNav />
    </div>
  );
}

// ============================================
// Stats Tab
// ============================================

interface PlayerStatSummary {
  playerId: number;
  playerName: string;
  teamName: string;
  teamColor?: string;
  firHits: number;
  firTracked: number;
  girHits: number;
  girTracked: number;
  totalPutts: number;
  puttsTracked: number;
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

function sgColorHex(value: number, isDark: boolean): string {
  return value >= 0 ? (isDark ? "#4ade80" : "#22c55e") : (isDark ? "#f87171" : "#ef4444");
}

function SGBarLabel({ x, y, width, height, index, data, isDark }: any) {
  const entry = data?.[index];
  if (!entry) return null;
  const isPositive = entry.sg >= 0;
  const color = isPositive
    ? (isDark ? "#4ade80" : "#16a34a")
    : (isDark ? "#f87171" : "#ef4444");
  // Positive bars: label floats above the bar. Negative bars: label floats below the bar.
  const labelY = isPositive
    ? (y ?? 0) - 5
    : (y ?? 0) + Math.abs(height ?? 0) + 12;
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

interface MergedPlayerStats {
  playerId: number;
  playerName: string;
  teamName: string;
  teamColor?: string;
  firHits: number;
  firTracked: number;
  girHits: number;
  girTracked: number;
  totalPutts: number;
  puttsTracked: number;
  sg: PlayerStrokesGained | null;
}

function PlayerStatsTab({
  rounds,
  allScoresData,
  players,
  expandedPlayerId,
  onTogglePlayer,
}: {
  rounds?: any[];
  allScoresData?: Score[][];
  players?: any[];
  expandedPlayerId: number | null;
  onTogglePlayer: (id: number) => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  // Compute FIR/GIR/Putts stats
  const statsMap = useMemo<Map<number, PlayerStatSummary>>(() => {
    const map = new Map<number, PlayerStatSummary>();
    if (!players || !allScoresData || allScoresData.length === 0) return map;

    players.forEach(player => {
      map.set(player.id, {
        playerId: player.id,
        playerName: player.name,
        teamName: player.team?.name || "",
        teamColor: player.team?.color,
        firHits: 0, firTracked: 0,
        girHits: 0, girTracked: 0,
        totalPutts: 0, puttsTracked: 0,
      });
    });

    allScoresData.forEach((roundScores, roundIndex) => {
      // Skip scramble rounds — stats are null
      if (rounds && rounds[roundIndex]?.formatType === 'team_scramble') return;

      roundScores.forEach((score: Score) => {
        if (score.playerId == null) return;
        const entry = map.get(score.playerId);
        if (!entry) return;
        if (score.fir !== null && score.fir !== undefined) {
          entry.firTracked++;
          if (score.fir) entry.firHits++;
        }
        if (score.gir !== null && score.gir !== undefined) {
          entry.girTracked++;
          if (score.gir) entry.girHits++;
        }
        if (score.putts !== null && score.putts !== undefined) {
          entry.puttsTracked++;
          entry.totalPutts += score.putts;
        }
      });
    });

    return map;
  }, [players, allScoresData, rounds]);

  // Compute Strokes Gained
  const sgMap = useMemo<Map<number, PlayerStrokesGained>>(() => {
    if (!allScoresData || allScoresData.length === 0 || !rounds) return new Map();
    return calculateStrokesGained(allScoresData, rounds);
  }, [allScoresData, rounds]);

  // Merge and sort by SG:Total descending
  const mergedStats = useMemo<MergedPlayerStats[]>(() => {
    if (!players) return [];

    const merged: MergedPlayerStats[] = [];
    const seen = new Set<number>();

    players.forEach(player => {
      const stat = statsMap.get(player.id);
      const sg = sgMap.get(player.id) || null;
      const hasStat = stat && (stat.firTracked > 0 || stat.girTracked > 0 || stat.puttsTracked > 0);
      if (!hasStat && !sg) return;
      seen.add(player.id);
      merged.push({
        playerId: player.id,
        playerName: player.name,
        teamName: player.team?.name || "",
        teamColor: player.team?.color,
        firHits: stat?.firHits ?? 0,
        firTracked: stat?.firTracked ?? 0,
        girHits: stat?.girHits ?? 0,
        girTracked: stat?.girTracked ?? 0,
        totalPutts: stat?.totalPutts ?? 0,
        puttsTracked: stat?.puttsTracked ?? 0,
        sg,
      });
    });

    // Sort: players with SG data first (by sgTotal desc), then players without SG data
    merged.sort((a, b) => {
      if (a.sg && b.sg) return b.sg.sgTotal - a.sg.sgTotal;
      if (a.sg && !b.sg) return -1;
      if (!a.sg && b.sg) return 1;
      return 0;
    });

    return merged;
  }, [players, statsMap, sgMap]);

  const sgPlayerCount = useMemo(() => {
    return mergedStats.filter(s => s.sg).length;
  }, [mergedStats]);

  if (!rounds || rounds.length === 0) {
    return (
      <Card className="bg-slate-50 dark:bg-slate-900 border-dashed shadow-none">
        <CardContent className="p-4 flex items-center justify-center gap-2 text-muted-foreground text-sm">
          No rounds available
        </CardContent>
      </Card>
    );
  }

  if (mergedStats.length === 0) {
    return (
      <Card className="bg-slate-50 dark:bg-slate-900 border-dashed shadow-none">
        <CardContent className="p-4 text-center text-muted-foreground text-sm">
          <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No stats data recorded yet.</p>
          <p className="text-xs mt-1">Stats are tracked during score entry.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {sgPlayerCount > 0 && sgPlayerCount < 4 && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400 text-center px-2">
          Small field — Strokes Gained values may be less meaningful
        </p>
      )}

      {mergedStats.map(s => (
        <div key={s.playerId} className="space-y-2">
          <Card
            className="border-0 shadow-sm bg-white dark:bg-slate-800 cursor-pointer hover:shadow-md transition-all"
            onClick={() => onTogglePlayer(s.playerId)}
          >
            <CardContent className="p-3">
              {/* Top row: player name + SG:Total */}
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.teamColor }} />
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{s.playerName}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-3.5">{s.teamName}</span>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  {s.sg ? (
                    <>
                      <div className={`text-base font-extrabold ${sgColor(s.sg.sgTotal)}`}>
                        {formatSG(s.sg.sgTotal)}
                      </div>
                      <div className="text-[9px] text-slate-400 dark:text-slate-500">{s.sg.holesPlayed} holes</div>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                  )}
                </div>
              </div>

              {/* Stat cells row */}
              <div className="grid grid-cols-5 gap-1">
                {/* FIR */}
                <div className="text-center">
                  <div className="text-[9px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">FIR</div>
                  {s.firTracked > 0 ? (
                    <>
                      <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                        {Math.round((s.firHits / s.firTracked) * 100)}%
                      </div>
                      <div className="text-[9px] text-slate-400 dark:text-slate-500">{s.firHits}/{s.firTracked}</div>
                    </>
                  ) : (
                    <div className="text-xs text-slate-400 dark:text-slate-500">—</div>
                  )}
                </div>
                {/* GIR */}
                <div className="text-center">
                  <div className="text-[9px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">GIR</div>
                  {s.girTracked > 0 ? (
                    <>
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {Math.round((s.girHits / s.girTracked) * 100)}%
                      </div>
                      <div className="text-[9px] text-slate-400 dark:text-slate-500">{s.girHits}/{s.girTracked}</div>
                    </>
                  ) : (
                    <div className="text-xs text-slate-400 dark:text-slate-500">—</div>
                  )}
                </div>
                {/* Putts */}
                <div className="text-center">
                  <div className="text-[9px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Putts</div>
                  {s.puttsTracked > 0 ? (
                    <>
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {(s.totalPutts / s.puttsTracked).toFixed(1)}
                      </div>
                      <div className="text-[9px] text-slate-400 dark:text-slate-500">{s.totalPutts} tot</div>
                    </>
                  ) : (
                    <div className="text-xs text-slate-400 dark:text-slate-500">—</div>
                  )}
                </div>
                {/* SG:Putt */}
                <div className="text-center">
                  <div className="text-[9px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">SG:P</div>
                  {s.sg && s.sg.sgPutting !== null ? (
                    <div className={`text-xs font-bold ${sgColor(s.sg.sgPutting)}`}>
                      {formatSG(s.sg.sgPutting)}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 dark:text-slate-500">—</div>
                  )}
                </div>
                {/* SG:T2G */}
                <div className="text-center">
                  <div className="text-[9px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">SG:T2G</div>
                  {s.sg && s.sg.sgTeeToGreen !== null ? (
                    <div className={`text-xs font-bold ${sgColor(s.sg.sgTeeToGreen)}`}>
                      {formatSG(s.sg.sgTeeToGreen)}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 dark:text-slate-500">—</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expanded detail */}
          {expandedPlayerId === s.playerId && rounds && allScoresData && (
            <div className="animate-in slide-in-from-top-2 fade-in duration-200 space-y-2">
              <PlayerStatsCharts
                playerId={s.playerId}
                rounds={rounds}
                allScoresData={allScoresData}
              />

              {/* SG detail charts */}
              {s.sg && (s.sg.sgByPar.length > 0 || s.sg.sgByRound.length > 1) && (
                <Card className="border-l-4 border-l-primary shadow-md">
                  <CardContent className="p-4 space-y-4">
                    {/* SG by Par type bar chart */}
                    {s.sg.sgByPar.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                          SG: Total by Hole Type
                        </p>
                        <div style={{ height: 110 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={s.sg.sgByPar.map(d => ({
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
                                {s.sg.sgByPar.map((d, idx) => (
                                  <Cell key={idx} fill={sgColorHex(d.sg, isDark)} />
                                ))}
                                <LabelList
                                  content={
                                    <SGBarLabel
                                      isDark={isDark}
                                      data={s.sg.sgByPar.map(d => ({ sg: d.sg }))}
                                    />
                                  }
                                />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 text-center mt-1">
                          {s.sg.sgByPar.map(d => `Par ${d.par}: ${d.holes} hole${d.holes !== 1 ? "s" : ""}`).join(" · ")}
                        </p>
                      </div>
                    )}

                    {/* Per-round summary */}
                    {s.sg.sgByRound.length > 1 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                          SG by Round
                        </p>
                        <div className="space-y-2">
                          {s.sg.sgByRound.map(d => {
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
              )}
            </div>
          )}
        </div>
      ))}

      <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center px-2">
        FIR = Fairways in Regulation · GIR = Greens in Regulation · Putts = avg per hole · SG = Strokes Gained vs field
      </p>
    </div>
  );
}

function PlayerStatsCharts({
  playerId,
  rounds,
  allScoresData,
}: {
  playerId: number;
  rounds: any[];
  allScoresData: Score[][];
}) {
  const combinedScores = useMemo(() => {
    const result: Score[] = [];
    rounds.forEach((round, i) => {
      if (round.formatType === 'team_scramble') return;
      const offset = i * 100;
      const roundPlayerScores = allScoresData[i]?.filter(s => s.playerId === playerId) || [];
      roundPlayerScores.forEach(s => result.push({ ...s, holeNumber: s.holeNumber + offset }));
    });
    return result;
  }, [playerId, rounds, allScoresData]);

  const combinedHoles = useMemo(() => {
    const result: any[] = [];
    rounds.forEach((round, i) => {
      if (round.formatType === 'team_scramble') return;
      const offset = i * 100;
      (round.holes || []).forEach((h: any) => result.push({ ...h, number: h.number + offset }));
    });
    return result;
  }, [rounds]);

  if (combinedScores.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 text-center text-muted-foreground text-sm">
          No scores recorded yet
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-primary shadow-md">
      <CardContent className="p-4">
        <RoundStatsCharts scores={combinedScores} holes={combinedHoles} />
      </CardContent>
    </Card>
  );
}
