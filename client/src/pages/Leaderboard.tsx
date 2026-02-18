import { useState, useMemo } from "react";
import { useTournamentLeaderboard, useRounds, useRoundLeaderboard, useMatchPairings, useScores, usePlayers, useSetMatchWinner } from "@/hooks/use-tournament";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/Navigation";
import { PageTransition } from "@/components/PageTransition";
import { TeamBadge } from "@/components/TeamBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy, Medal, AlertCircle, Swords, TrendingDown, TrendingUp, ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import type { Round, Score, MatchPairing, PlayerBreakdown } from "@shared/schema";

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500 fill-yellow-500" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-400 fill-gray-400" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-700 fill-amber-700" />;
  return <span className="font-mono font-bold text-muted-foreground w-5 text-center">{rank}</span>;
}

export default function Leaderboard() {
  const { data: overallData, isLoading: loadingOverall, error: overallError } = useTournamentLeaderboard();
  const { data: rounds, error: roundsError } = useRounds();
  const [expandedTeamId, setExpandedTeamId] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header title="Tournament Standings" subtitle="Live Tournament Updates" />

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
              <TabsTrigger value="overall" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm data-[state=active]:text-foreground dark:data-[state=active]:text-white text-xs">Tournament</TabsTrigger>
              <TabsTrigger value="live-matches" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm data-[state=active]:text-foreground dark:data-[state=active]:text-white text-xs">Matches</TabsTrigger>
              <TabsTrigger value="rounds" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm data-[state=active]:text-foreground dark:data-[state=active]:text-white text-xs">By Round</TabsTrigger>
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
                  <Card
                    key={entry.teamId}
                    className={clsx(
                      "border-none shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden relative cursor-pointer",
                      idx === 0 ? "bg-gradient-to-r from-yellow-50 to-white border-l-4 border-l-yellow-400" : "bg-white"
                    )}
                    onClick={() => setExpandedTeamId(expandedTeamId === entry.teamId ? null : entry.teamId)}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="flex-shrink-0 w-6 flex justify-center">
                        <RankIcon rank={entry.rank} />
                      </div>

                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-2.5 h-2.5 rounded-full shadow-sm flex-shrink-0"
                            style={{ backgroundColor: entry.teamColor }}
                          />
                          <span className="font-semibold text-sm text-slate-900 truncate">
                            {entry.teamName}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 flex items-center gap-2">
                        <div>
                          <span className="text-xl font-bold font-display text-slate-900">
                            {entry.totalPoints}
                          </span>
                          <span className="block text-[10px] uppercase tracking-wider text-slate-600 font-bold">
                            pts
                          </span>
                        </div>
                        <ChevronDown className={clsx(
                          "w-4 h-4 text-slate-400 transition-transform duration-200",
                          expandedTeamId === entry.teamId && "rotate-180"
                        )} />
                      </div>
                    </CardContent>

                    {expandedTeamId === entry.teamId && rounds && (
                      <TournamentTeamExpanded teamId={entry.teamId} rounds={rounds} />
                    )}

                    {idx === 0 && (
                      <div className="absolute -right-6 -top-6 w-24 h-24 bg-yellow-400/10 rounded-full blur-2xl pointer-events-none" />
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

function PlayerBreakdownRow({ breakdown }: { breakdown: PlayerBreakdown }) {
  const hasIndividualPoints = breakdown.pointsEarned > 0;

  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-xs text-slate-700 font-medium truncate">
          {breakdown.playerName}
        </span>
        {breakdown.description && (
          <span className="text-[10px] text-slate-500 truncate">
            ({breakdown.description})
          </span>
        )}
      </div>
      <div className="text-right flex-shrink-0 ml-2">
        {hasIndividualPoints ? (
          <span className="text-xs font-semibold text-primary">+{breakdown.pointsEarned} pts</span>
        ) : (
          <span className="text-xs text-slate-600">{breakdown.metric} {breakdown.metricLabel}</span>
        )}
      </div>
    </div>
  );
}

const FORMAT_LABELS: Record<string, string> = {
  individual_net: "Individual Net",
  individual_stableford: "Individual Stableford",
  individual_match_play: "Match Play",
  better_ball_stableford: "Better Ball",
  combined_stableford: "Combined Stableford",
  best_worst: "Best/Worst",
  pick_9: "Pick 9",
};

function TournamentTeamExpanded({ teamId, rounds }: { teamId: number; rounds: Round[] }) {
  return (
    <div
      className="px-3 pb-3 border-t border-slate-100 animate-in slide-in-from-top-2 fade-in duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {rounds.map((round) => (
        <TournamentRoundRow key={round.id} round={round} teamId={teamId} />
      ))}
    </div>
  );
}

function ordinalSuffix(rank: number): string {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return `${rank}th`;
}

function TournamentRoundRow({ round, teamId }: { round: Round; teamId: number }) {
  const { data } = useRoundLeaderboard(round.id);

  const teamEntry = data?.find((e) => e.teamId === teamId);
  if (!teamEntry || teamEntry.points === 0) return null;

  const breakdowns = teamEntry.playerBreakdown?.filter((b) => b.teamId === teamId) || [];

  return (
    <div className="py-2 border-b border-slate-50 last:border-b-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-slate-600">
          R{round.roundNumber}: {FORMAT_LABELS[round.formatType] || round.formatType} ({round.course?.name})
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 rounded px-1 py-0.5">
            {ordinalSuffix(teamEntry.rank)}
          </span>
          <span className="text-xs font-bold text-primary">+{teamEntry.points}</span>
        </div>
      </div>
      {breakdowns.map((b) => (
        <PlayerBreakdownRow key={b.playerId} breakdown={b} />
      ))}
    </div>
  );
}

function RoundLeaderboard({ roundId, formatType }: { roundId: number; formatType: string }) {
  const { data, isLoading } = useRoundLeaderboard(roundId);
  const [expandedTeamId, setExpandedTeamId] = useState<number | null>(null);

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
              <span className="text-xs">8 pts for match win, 3 pts for loss — no draws (playoff if all square)</span>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-2">
        {data.map((entry) => (
          <Card
            key={entry.teamId}
            className="border-0 shadow-sm bg-white/80 cursor-pointer"
            onClick={() => setExpandedTeamId(expandedTeamId === entry.teamId ? null : entry.teamId)}
          >
            <CardContent className="p-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-xs font-bold text-slate-700 w-4 text-center flex-shrink-0">
                    {entry.rank}
                  </span>
                  <div className="min-w-0">
                    <span className="font-semibold text-sm text-slate-900 block truncate">
                      {entry.teamName}
                    </span>
                    <span className="text-[11px] text-slate-600">
                      {isMatchPlay ? `${entry.scoreMetric} pts` : `Score: ${entry.scoreMetric}`}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 flex items-center gap-1.5">
                  <div>
                    <span className="font-bold text-primary text-base">+{entry.points}</span>
                    <span className="text-[9px] text-slate-600 block uppercase font-bold">pts</span>
                  </div>
                  <ChevronDown className={clsx(
                    "w-3.5 h-3.5 text-slate-400 transition-transform duration-200",
                    expandedTeamId === entry.teamId && "rotate-180"
                  )} />
                </div>
              </div>
              {expandedTeamId === entry.teamId && entry.playerBreakdown && entry.playerBreakdown.length > 0 && (
                <div
                  className="mt-2 pt-2 border-t border-slate-100 animate-in slide-in-from-top-2 fade-in duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  {entry.playerBreakdown.map((b) => (
                    <PlayerBreakdownRow key={b.playerId} breakdown={b} />
                  ))}
                </div>
              )}
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
  p1Gross: number | null | undefined;
  p2Gross: number | null | undefined;
  p1TeamColor?: string;
  p2TeamColor?: string;
}

function HoleCell({ holeNumber, p1Points, p2Points, p1Gross, p2Gross, p1TeamColor, p2TeamColor }: HoleCellProps) {
  let glowColor = "transparent";
  let glowOpacity = 0;

  if (p1Points !== null && p1Points !== undefined && p2Points !== null && p2Points !== undefined) {
    if (p1Points > p2Points) {
      glowColor = p1TeamColor || "#3b82f6";
      glowOpacity = 0.3;
    } else if (p2Points > p1Points) {
      glowColor = p2TeamColor || "#3b82f6";
      glowOpacity = 0.3;
    }
  }

  return (
    <div
      className="aspect-square flex flex-col items-center justify-center rounded border text-center bg-white relative overflow-hidden min-w-0"
      style={{
        boxShadow: `0 0 8px ${glowColor}${Math.round(glowOpacity * 255).toString(16).padStart(2, '0')}`,
      }}
    >
      <div className="text-[9px] sm:text-xs font-bold text-slate-600 leading-none">{holeNumber}</div>
      {p1Gross !== null && p1Gross !== undefined && p2Gross !== null && p2Gross !== undefined && (
        <div className="flex flex-col text-center text-[7px] sm:text-[9px] leading-tight mt-0.5">
          <div className="font-semibold text-slate-700">{p1Gross}<span className="text-slate-400">({p1Points})</span></div>
          <div className="font-semibold text-slate-700">{p2Gross}<span className="text-slate-400">({p2Points})</span></div>
        </div>
      )}
    </div>
  );
}

interface HoleByHoleGridProps {
  player1Scores: Record<number, number | null | undefined>;
  player2Scores: Record<number, number | null | undefined>;
  player1Gross: Record<number, number | null | undefined>;
  player2Gross: Record<number, number | null | undefined>;
  p1TeamColor?: string;
  p2TeamColor?: string;
}

function HoleByHoleGrid({ player1Scores, player2Scores, player1Gross, player2Gross, p1TeamColor, p2TeamColor }: HoleByHoleGridProps) {
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-9 gap-0.5 sm:gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(hole => (
          <HoleCell
            key={hole}
            holeNumber={hole}
            p1Points={player1Scores[hole]}
            p2Points={player2Scores[hole]}
            p1Gross={player1Gross[hole]}
            p2Gross={player2Gross[hole]}
            p1TeamColor={p1TeamColor}
            p2TeamColor={p2TeamColor}
          />
        ))}
      </div>
      <div className="grid grid-cols-9 gap-0.5 sm:gap-1">
        {[10, 11, 12, 13, 14, 15, 16, 17, 18].map(hole => (
          <HoleCell
            key={hole}
            holeNumber={hole}
            p1Points={player1Scores[hole]}
            p2Points={player2Scores[hole]}
            p1Gross={player1Gross[hole]}
            p2Gross={player2Gross[hole]}
            p1TeamColor={p1TeamColor}
            p2TeamColor={p2TeamColor}
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
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5 mb-0.5">
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: teamColor || "#999" }}
        />
        <p className="font-semibold text-xs sm:text-sm text-slate-900 truncate">{playerName}</p>
      </div>
      <div className="text-[10px] sm:text-xs text-slate-600 ml-4">
        {holesWon} holes | {totalStableford} pts
      </div>
    </div>
  );
}

interface MatchCardProps {
  pairing: MatchPairing & { player1?: any; player2?: any };
  scores: Score[];
  playerTeams: Record<number, { name: string; color?: string }>;
  playerNames: Record<number, string>;
}

function MatchCard({ pairing, scores, playerTeams, playerNames }: MatchCardProps) {
  const setMatchWinner = useSetMatchWinner();
  const player1Id = pairing.player1Id;
  const player2Id = pairing.player2Id;

  // Get player names from the playerNames map
  const player1Name = playerNames[player1Id] || `Player ${player1Id}`;
  const player2Name = playerNames[player2Id] || `Player ${player2Id}`;

  // Build score maps by hole (stableford points and gross scores)
  const player1Scores: Record<number, number | null | undefined> = {};
  const player2Scores: Record<number, number | null | undefined> = {};
  const player1Gross: Record<number, number | null | undefined> = {};
  const player2Gross: Record<number, number | null | undefined> = {};

  scores.forEach(score => {
    if (score.playerId === player1Id) {
      player1Scores[score.holeNumber] = score.stablefordPoints;
      player1Gross[score.holeNumber] = score.grossScore;
    } else if (score.playerId === player2Id) {
      player2Scores[score.holeNumber] = score.stablefordPoints;
      player2Gross[score.holeNumber] = score.grossScore;
    }
  });

  // Calculate match status and detect when match was decided
  let player1HolesWon = 0;
  let player2HolesWon = 0;
  let holesHalved = 0;
  let matchDecidedHole = -1;
  let decidingMatchStatus = 0;
  let decidingHolesRemaining = 0;

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

      // Check if match is now decided
      const currentMatchStatus = player1HolesWon - player2HolesWon;
      const currentHolesRemaining = 18 - (player1HolesWon + player2HolesWon + holesHalved);

      // Match is decided if one player's lead > remaining holes (not equal, as a draw is still possible if equal)
      if (matchDecidedHole === -1 && (
        currentMatchStatus > currentHolesRemaining ||
        -currentMatchStatus > currentHolesRemaining
      )) {
        matchDecidedHole = hole;
        decidingMatchStatus = currentMatchStatus;
        decidingHolesRemaining = currentHolesRemaining;
      }
    }
  }

  const matchStatus = player1HolesWon - player2HolesWon;
  const holesPlayed = player1HolesWon + player2HolesWon + holesHalved;
  const holesRemaining = 18 - holesPlayed;

  // Use the match status at decision point if match was already decided
  const finalMatchStatus = matchDecidedHole !== -1 ? decidingMatchStatus : matchStatus;
  const finalHolesRemaining = matchDecidedHole !== -1 ? decidingHolesRemaining : holesRemaining;

  // Calculate total stableford
  const player1Total = Object.values(player1Scores).reduce((sum, pts) =>
    sum + (pts !== null && pts !== undefined ? pts : 0), 0);
  const player2Total = Object.values(player2Scores).reduce((sum, pts) =>
    sum + (pts !== null && pts !== undefined ? pts : 0), 0);

  const getMatchStatusDisplay = () => {
    if (finalHolesRemaining === 0) {
      if (finalMatchStatus === 0) {
        if (pairing.winnerId) {
          const winnerName = pairing.winnerId === player1Id ? player1Name : player2Name;
          return `${winnerName} wins (Playoff)`;
        }
        return "All Square — Playoff Needed";
      }
      if (finalMatchStatus > 0) return `${player1Name} wins ${finalMatchStatus} & ${finalHolesRemaining}`;
      return `${player2Name} wins ${Math.abs(finalMatchStatus)} & ${finalHolesRemaining}`;
    }

    if (finalMatchStatus === 0) return "All Square";
    if (finalMatchStatus > 0) {
      if (finalMatchStatus === finalHolesRemaining) return `Dormie ${finalMatchStatus}`;
      if (finalMatchStatus > finalHolesRemaining) return `${player1Name} wins ${finalMatchStatus} & ${finalHolesRemaining}`;
      return `${player1Name} ${finalMatchStatus} Up`;
    }
    if (finalMatchStatus < 0) {
      const absStatus = Math.abs(finalMatchStatus);
      if (absStatus === finalHolesRemaining) return `Dormie ${absStatus}`;
      if (absStatus > finalHolesRemaining) return `${player2Name} wins ${absStatus} & ${finalHolesRemaining}`;
      return `${player2Name} ${absStatus} Up`;
    }
    return "Not started";
  };

  const getCurrentStatus = () => {
    if (finalHolesRemaining === 0) {
      if (finalMatchStatus === 0) {
        if (pairing.winnerId) {
          const winnerName = pairing.winnerId === player1Id ? player1Name : player2Name;
          return `${winnerName} wins (Playoff)`;
        }
        return "All Square";
      }
      if (finalMatchStatus > 0) return `${player1Name} wins`;
      return `${player2Name} wins`;
    }

    if (finalMatchStatus === 0) return "All Square";
    if (finalMatchStatus > 0) {
      if (finalMatchStatus === finalHolesRemaining) return `Dormie ${finalMatchStatus}`;
      if (finalMatchStatus > finalHolesRemaining) return `${player1Name} wins`;
      return `${player1Name} ${finalMatchStatus} Up`;
    }
    if (finalMatchStatus < 0) {
      const absStatus = Math.abs(finalMatchStatus);
      if (absStatus === finalHolesRemaining) return `Dormie ${absStatus}`;
      if (absStatus > finalHolesRemaining) return `${player2Name} wins`;
      return `${player2Name} ${absStatus} Up`;
    }
    return "Not started";
  };

  const player1Team = playerTeams[player1Id];
  const player2Team = playerTeams[player2Id];

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardContent className="p-3 sm:p-4">
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-semibold text-slate-600">Match {pairing.matchNumber}</span>
            <div className="text-right min-w-0 ml-2">
              <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">{getCurrentStatus()}</div>
              <div className="text-[10px] sm:text-xs text-slate-600">
                {matchDecidedHole !== -1 ? getMatchStatusDisplay() : `Thru ${holesPlayed}`}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
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
            <div className="text-[10px] sm:text-xs text-slate-600 mb-1.5">
              {holesPlayed} of 18 holes played
            </div>
            <HoleByHoleGrid
              player1Scores={player1Scores}
              player2Scores={player2Scores}
              player1Gross={player1Gross}
              player2Gross={player2Gross}
              p1TeamColor={player1Team?.color}
              p2TeamColor={player2Team?.color}
            />
          </>
        )}

        {holesPlayed === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No scores entered yet</p>
          </div>
        )}

        {/* Playoff winner selection - shown when match is all square after 18 holes */}
        {holesPlayed === 18 && finalMatchStatus === 0 && !pairing.winnerId && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-700 mb-2 text-center">Select Playoff Winner</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMatchWinner.mutate({ matchId: pairing.id, winnerId: player1Id })}
                disabled={setMatchWinner.isPending}
                className="px-3 py-2 text-xs font-semibold rounded-lg border-2 transition-colors hover:opacity-90 disabled:opacity-50"
                style={{
                  borderColor: player1Team?.color || '#999',
                  backgroundColor: `${player1Team?.color || '#999'}15`,
                  color: player1Team?.color || '#999',
                }}
              >
                {player1Name}
              </button>
              <button
                onClick={() => setMatchWinner.mutate({ matchId: pairing.id, winnerId: player2Id })}
                disabled={setMatchWinner.isPending}
                className="px-3 py-2 text-xs font-semibold rounded-lg border-2 transition-colors hover:opacity-90 disabled:opacity-50"
                style={{
                  borderColor: player2Team?.color || '#999',
                  backgroundColor: `${player2Team?.color || '#999'}15`,
                  color: player2Team?.color || '#999',
                }}
              >
                {player2Name}
              </button>
            </div>
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

  // Build maps of player IDs to team info and names
  const playerTeams: Record<number, { name: string; color?: string }> = {};
  const playerNames: Record<number, string> = {};
  if (players) {
    players.forEach(player => {
      playerNames[player.id] = player.name;
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
          playerNames={playerNames}
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
          <div className="mb-3">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-0.5">
              R{round.roundNumber}: {round.course.name}
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-600">{round.date}</p>
          </div>
          <MatchRoundScorecard roundId={round.id} />
        </div>
      ))}
    </div>
  );
}
