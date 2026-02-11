import { useTournamentLeaderboard, useRounds, useRoundLeaderboard, useMatchPairings, useScores, usePlayers } from "@/hooks/use-tournament";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/Navigation";
import { PageTransition } from "@/components/PageTransition";
import { TeamBadge } from "@/components/TeamBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy, Medal, AlertCircle, Swords, TrendingDown, TrendingUp } from "lucide-react";
import { clsx } from "clsx";
import type { Round, Score, MatchPairing } from "@shared/schema";

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500 fill-yellow-500" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-400 fill-gray-400" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-700 fill-amber-700" />;
  return <span className="font-mono font-bold text-muted-foreground w-5 text-center">{rank}</span>;
}

export default function Leaderboard() {
  const { data: overallData, isLoading: loadingOverall, error: overallError } = useTournamentLeaderboard();
  const { data: rounds, error: roundsError } = useRounds();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header title="Championship Standings" subtitle="Live Tournament Updates" />
      
      <PageTransition>
        <main className="max-w-3xl mx-auto px-4 space-y-6">

          {overallError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <p className="font-bold">Error loading tournament leaderboard:</p>
              <p className="text-sm">{(overallError as Error).message}</p>
            </div>
          )}

          {roundsError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <p className="font-bold">Error loading rounds:</p>
              <p className="text-sm">{(roundsError as Error).message}</p>
            </div>
          )}

          <Tabs defaultValue="overall" className="w-full">
            <TabsList className="w-full grid grid-cols-3 mb-6 bg-slate-200 dark:bg-slate-800 p-1">
              <TabsTrigger value="overall" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm data-[state=active]:text-foreground dark:data-[state=active]:text-white">Tournament</TabsTrigger>
              <TabsTrigger value="live-matches" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm data-[state=active]:text-foreground dark:data-[state=active]:text-white">Live Matches</TabsTrigger>
              <TabsTrigger value="rounds" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm data-[state=active]:text-foreground dark:data-[state=active]:text-white">By Round</TabsTrigger>
            </TabsList>

            <TabsContent value="overall" className="space-y-4">
              {loadingOverall ? (
                <div className="flex flex-col gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-20 bg-white dark:bg-slate-900 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : overallData?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Trophy className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No tournament data available yet.</p>
                </div>
              ) : (
                overallData?.map((entry, idx) => (
                  <Card key={entry.teamId} className={clsx(
                    "border-none shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden relative",
                    idx === 0 ? "bg-gradient-to-r from-yellow-50 to-white border-l-4 border-l-yellow-400" : "bg-white"
                  )}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="flex-shrink-0 w-8 flex justify-center">
                        <RankIcon rank={entry.rank} />
                      </div>
                      
                      <div className="flex-grow">
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className="w-3 h-3 rounded-full shadow-sm"
                            style={{ backgroundColor: entry.teamColor }}
                          />
                          <span className="font-semibold text-sm text-slate-900">
                            {entry.teamName}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 font-medium">
                          {entry.totalPoints} pts
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-2xl font-bold font-display text-slate-900">
                          {entry.totalPoints}
                        </span>
                        <span className="block text-[10px] uppercase tracking-wider text-slate-600 font-bold">
                          Total
                        </span>
                      </div>
                    </CardContent>
                    
                    {/* Background decoration for 1st place */}
                    {idx === 0 && (
                      <div className="absolute -right-6 -top-6 w-24 h-24 bg-yellow-400/10 rounded-full blur-2xl" />
                    )}
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="live-matches">
              <MatchPlayLiveScoreboard rounds={rounds} />
            </TabsContent>

            <TabsContent value="rounds" className="space-y-8">
              {rounds?.map((round) => (
                <div key={round.id} className="space-y-3">
                  <div className="flex items-baseline justify-between px-1">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                      Round {round.roundNumber}
                    </h3>
                    <span className="text-xs text-muted-foreground">{round.course.name}</span>
                  </div>
                  <RoundLeaderboard roundId={round.id} formatType={round.formatType} />
                </div>
              ))}
            </TabsContent>
          </Tabs>

        </main>
      </PageTransition>

      <BottomNav />
    </div>
  );
}

function RoundLeaderboard({ roundId, formatType }: { roundId: number; formatType: string }) {
  const { data, isLoading } = useRoundLeaderboard(roundId);

  if (isLoading) return <div className="h-16 bg-white/50 rounded-xl animate-pulse" />;

  if (!data || data.length === 0) {
    return (
      <Card className="bg-slate-50 border-dashed shadow-none">
        <CardContent className="p-4 flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <AlertCircle className="w-4 h-4" /> No scores posted yet
        </CardContent>
      </Card>
    );
  }

  const isMatchPlay = formatType === 'individual_match_play';

  return (
    <div className="space-y-3">
      {isMatchPlay && (
        <Card className="bg-blue-50 border-blue-200 shadow-sm">
          <CardContent className="p-3 flex items-start gap-2">
            <Swords className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <span className="font-semibold block mb-1">Match Play Results</span>
              <span className="text-xs">Teams earn 6 pts for match win, 3 pts for draw, 1.5 pts for loss (based on Stableford comparison per hole)</span>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-2">
        {data.map((entry) => (
          <Card key={entry.teamId} className="border-0 shadow-sm bg-white/80">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-slate-700 w-4 text-center">
                  {entry.rank}
                </span>
                <div>
                  <span className="font-semibold text-sm text-slate-900 block">
                    {entry.teamName}
                  </span>
                  <span className="text-xs text-slate-600">
                    {isMatchPlay ? `Match Result: ${entry.scoreMetric} pts` : `Score Metric: ${entry.scoreMetric}`}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-bold text-primary text-lg">+{entry.points}</span>
                <span className="text-[10px] text-slate-600 block uppercase font-bold">Points</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Match Play Live Scoreboard Components
// ============================================

interface HoleCellProps {
  holeNumber: number;
  p1Points: number | null | undefined;
  p2Points: number | null | undefined;
}

function HoleCell({ holeNumber, p1Points, p2Points }: HoleCellProps) {
  let bgColor = "bg-slate-100";
  let winner = "";

  if (p1Points !== null && p1Points !== undefined && p2Points !== null && p2Points !== undefined) {
    if (p1Points > p2Points) {
      bgColor = "bg-green-100";
      winner = "P1";
    } else if (p2Points > p1Points) {
      bgColor = "bg-blue-100";
      winner = "P2";
    } else {
      bgColor = "bg-gray-200";
      winner = "Tie";
    }
  }

  return (
    <div className={clsx(
      "aspect-square flex flex-col items-center justify-center rounded border text-center",
      bgColor
    )}>
      <div className="text-xs font-bold text-slate-600">{holeNumber}</div>
      {p1Points !== null && p1Points !== undefined && p2Points !== null && p2Points !== undefined && (
        <div className="text-[10px] text-slate-500 mt-0.5">
          {p1Points}/{p2Points}
        </div>
      )}
    </div>
  );
}

interface HoleByHoleGridProps {
  player1Scores: Record<number, number | null | undefined>;
  player2Scores: Record<number, number | null | undefined>;
}

function HoleByHoleGrid({ player1Scores, player2Scores }: HoleByHoleGridProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-9 gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(hole => (
          <HoleCell
            key={hole}
            holeNumber={hole}
            p1Points={player1Scores[hole]}
            p2Points={player2Scores[hole]}
          />
        ))}
      </div>
      <div className="grid grid-cols-9 gap-1">
        {[10, 11, 12, 13, 14, 15, 16, 17, 18].map(hole => (
          <HoleCell
            key={hole}
            holeNumber={hole}
            p1Points={player1Scores[hole]}
            p2Points={player2Scores[hole]}
          />
        ))}
      </div>
    </div>
  );
}

interface PlayerInfoProps {
  playerName: string;
  teamName: string;
  teamColor?: string;
  holesWon: number;
  totalStableford: number;
}

function PlayerInfo({ playerName, teamName, teamColor, holesWon, totalStableford }: PlayerInfoProps) {
  return (
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: teamColor || "#999" }}
        />
        <div className="min-w-0">
          <p className="font-semibold text-sm text-slate-900 truncate">{playerName}</p>
          <p className="text-xs text-slate-500 truncate">{teamName}</p>
        </div>
      </div>
      <div className="text-xs text-slate-600">
        {holesWon} holes | {totalStableford} pts
      </div>
    </div>
  );
}

interface MatchCardProps {
  pairing: MatchPairing & { player1?: any; player2?: any };
  scores: Score[];
  playerTeams: Record<number, { name: string; color?: string }>;
}

function MatchCard({ pairing, scores, playerTeams }: MatchCardProps) {
  const player1Id = pairing.player1Id;
  const player2Id = pairing.player2Id;

  // Get player names from the pairing data or scores
  const player1Name = pairing.player1?.name || `Player ${player1Id}`;
  const player2Name = pairing.player2?.name || `Player ${player2Id}`;

  // Build score maps by hole
  const player1Scores: Record<number, number | null | undefined> = {};
  const player2Scores: Record<number, number | null | undefined> = {};

  scores.forEach(score => {
    if (score.playerId === player1Id) {
      player1Scores[score.holeNumber] = score.stablefordPoints;
    } else if (score.playerId === player2Id) {
      player2Scores[score.holeNumber] = score.stablefordPoints;
    }
  });

  // Calculate match status
  let player1HolesWon = 0;
  let player2HolesWon = 0;
  let holesHalved = 0;

  for (let hole = 1; hole <= 18; hole++) {
    const p1Points = player1Scores[hole];
    const p2Points = player2Scores[hole];

    if (p1Points !== null && p1Points !== undefined && p2Points !== null && p2Points !== undefined) {
      if (p1Points > p2Points) {
        player1HolesWon++;
      } else if (p2Points > p1Points) {
        player2HolesWon++;
      } else {
        holesHalved++;
      }
    }
  }

  const matchStatus = player1HolesWon - player2HolesWon;
  const holesPlayed = player1HolesWon + player2HolesWon + holesHalved;
  const holesRemaining = 18 - holesPlayed;

  // Calculate total stableford
  const player1Total = Object.values(player1Scores).reduce((sum, pts) =>
    sum + (pts !== null && pts !== undefined ? pts : 0), 0);
  const player2Total = Object.values(player2Scores).reduce((sum, pts) =>
    sum + (pts !== null && pts !== undefined ? pts : 0), 0);

  const getMatchStatusDisplay = () => {
    if (holesRemaining === 0) {
      if (matchStatus === 0) return "Match Tied - All Square";
      if (matchStatus > 0) return `${player1Name} wins ${matchStatus} & ${holesRemaining}`;
      return `${player2Name} wins ${Math.abs(matchStatus)} & ${holesRemaining}`;
    }

    if (matchStatus === 0) return "All Square";
    if (matchStatus > 0) {
      if (matchStatus === holesRemaining) return `Dormie ${matchStatus}`;
      if (matchStatus > holesRemaining) return `${player1Name} wins`;
      return `${player1Name} ${matchStatus} Up`;
    }
    if (matchStatus < 0) {
      const absStatus = Math.abs(matchStatus);
      if (absStatus === holesRemaining) return `Dormie ${absStatus}`;
      if (absStatus > holesRemaining) return `${player2Name} wins`;
      return `${player2Name} ${absStatus} Up`;
    }
    return "Not started";
  };

  const player1Team = playerTeams[player1Id];
  const player2Team = playerTeams[player2Id];

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardContent className="p-4">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-600">Match {pairing.matchNumber}</span>
            <span className="text-sm font-bold text-slate-900">{getMatchStatusDisplay()}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <PlayerInfo
              playerName={player1Name}
              teamName={player1Team?.name || "Unknown"}
              teamColor={player1Team?.color}
              holesWon={player1HolesWon}
              totalStableford={player1Total}
            />
            <PlayerInfo
              playerName={player2Name}
              teamName={player2Team?.name || "Unknown"}
              teamColor={player2Team?.color}
              holesWon={player2HolesWon}
              totalStableford={player2Total}
            />
          </div>
        </div>

        {holesPlayed > 0 && (
          <>
            <div className="text-xs text-slate-600 mb-2">
              {holesPlayed} of 18 holes played
            </div>
            <HoleByHoleGrid player1Scores={player1Scores} player2Scores={player2Scores} />
          </>
        )}

        {holesPlayed === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No scores entered yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface MatchRoundScorecardProps {
  roundId: number;
}

function MatchRoundScorecard({ roundId }: MatchRoundScorecardProps) {
  const { data: pairings, isLoading: loadingPairings } = useMatchPairings(roundId);
  const { data: scores, isLoading: loadingScores } = useScores(roundId);
  const { data: players } = usePlayers();

  // Build a map of player IDs to team info
  const playerTeams: Record<number, { name: string; color?: string }> = {};
  if (players) {
    players.forEach(player => {
      if (player.team) {
        playerTeams[player.id] = {
          name: player.team.name,
          color: player.team.color,
        };
      }
    });
  }

  if (loadingPairings || loadingScores) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-48 bg-white/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!pairings || pairings.length === 0) {
    return (
      <Card className="bg-slate-50 border-dashed shadow-none">
        <CardContent className="p-4 flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <AlertCircle className="w-4 h-4" /> No matches configured
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {pairings.map(pairing => (
        <MatchCard
          key={pairing.id}
          pairing={pairing}
          scores={scores || []}
          playerTeams={playerTeams}
        />
      ))}
    </div>
  );
}

interface MatchPlayLiveScorecardProps {
  rounds?: Round[];
}

function MatchPlayLiveScoreboard({ rounds }: MatchPlayLiveScorecardProps) {
  const matchPlayRounds = rounds?.filter(r => r.formatType === 'individual_match_play') || [];

  if (!matchPlayRounds || matchPlayRounds.length === 0) {
    return (
      <Card className="bg-slate-50 border-dashed shadow-none">
        <CardContent className="p-4 flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Swords className="w-4 h-4" /> No match play rounds available
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {matchPlayRounds.map(round => (
        <div key={round.id}>
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Round {round.roundNumber}: {round.course.name}
            </h3>
            <p className="text-xs text-slate-600">{round.date}</p>
          </div>
          <MatchRoundScorecard roundId={round.id} />
        </div>
      ))}
    </div>
  );
}
