import { useMemo, useState } from "react";
import { usePlayers, useRounds, useAllRoundsScores, useScores } from "@/hooks/use-tournament";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/Navigation";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreboardTable } from "@/components/ScoreboardTable";
import { Users } from "lucide-react";
import { clsx } from "clsx";
import { useLocation } from "wouter";

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

export default function IndividualLeaderboard() {
  const { data: players } = usePlayers();
  const { data: rounds } = useRounds();
  const [expandedPlayerId, setExpandedPlayerId] = useState<number | null>(null);
  const [, navigate] = useLocation();

  // Fetch scores for all rounds in parallel
  const roundIds = rounds?.map(r => r.id) || [];
  const { data: allScoresData } = useAllRoundsScores(roundIds);

  // Toggle function for accordion behavior
  const togglePlayer = (playerId: number) => {
    setExpandedPlayerId(prev => prev === playerId ? null : playerId);
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
      const roundScores = allScoresData[roundIndex];
      if (!roundScores) return;

      // Par for standard 18-hole course is 72
      const roundPar = 72;

      // Group scores by player
      const playerRoundScores = new Map<number, number[]>();
      roundScores.forEach(score => {
        if (!playerRoundScores.has(score.playerId)) {
          playerRoundScores.set(score.playerId, []);
        }
        playerRoundScores.get(score.playerId)!.push(score.netScore || 0);
      });

      // Update player totals
      playerRoundScores.forEach((netScores, playerId) => {
        const player = playerScoresMap.get(playerId);
        if (player) {
          const roundNetTotal = netScores.reduce((a, b) => a + b, 0);
          player.totalNetScore += roundNetTotal;
          player.totalPar += roundPar;
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
      .sort((a, b) => a.totalNetScore - b.totalNetScore)
      .map((p, idx) => ({ ...p, rank: idx + 1 }));

    return standings;
  }, [players, rounds, allScoresData, roundIds]);

  const getToParColor = (toPar: number) => {
    if (toPar <= -8) return "text-amber-500"; // Eagle+
    if (toPar <= -4) return "text-red-500"; // Birdie range
    if (toPar === 0) return "text-slate-900"; // Even
    if (toPar <= 4) return "text-blue-600"; // Bogey range
    return "text-slate-500"; // Double+
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return "🏆";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return null;
  };

  // Determine which round to display for a player
  const getDisplayRound = (player: PlayerScore) => {
    if (!rounds) return null;

    // Find first incomplete round (score = 0)
    const incompleteRoundIndex = player.netScoresByRound.findIndex(score => score === 0);

    if (incompleteRoundIndex !== -1 && incompleteRoundIndex < rounds.length) {
      return { round: rounds[incompleteRoundIndex], isIncomplete: true };
    }

    // All rounds complete - return last round
    if (rounds.length > 0) {
      return { round: rounds[rounds.length - 1], isIncomplete: false };
    }

    return null;
  };

  const expandedPlayer = standings.find(p => p.playerId === expandedPlayerId);
  const displayRoundInfo = expandedPlayer ? getDisplayRound(expandedPlayer) : null;

  // Fetch scores for expanded player's round
  const { data: expandedRoundScores, isLoading: scoresLoading } = useScores(
    displayRoundInfo?.round?.id ?? 0,
    { enabled: !!displayRoundInfo }
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <Header
        title="Individual Standings"
        subtitle="Net Score Leaderboard"
      />

      <PageTransition>
        <main className="max-w-2xl mx-auto px-4 space-y-4">

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

        </main>
      </PageTransition>

      <BottomNav />
    </div>
  );
}
