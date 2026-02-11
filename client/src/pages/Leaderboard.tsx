import { useTournamentLeaderboard, useRounds, useRoundLeaderboard } from "@/hooks/use-tournament";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/Navigation";
import { PageTransition } from "@/components/PageTransition";
import { TeamBadge } from "@/components/TeamBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy, Medal, AlertCircle, Swords } from "lucide-react";
import { clsx } from "clsx";

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
            <TabsList className="w-full grid grid-cols-2 mb-6 bg-slate-200 dark:bg-slate-800 p-1">
              <TabsTrigger value="overall" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm data-[state=active]:text-foreground dark:data-[state=active]:text-white">Tournament</TabsTrigger>
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
