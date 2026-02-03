import { useState } from "react";
import { usePlayers, useRounds, useScores } from "@/hooks/use-tournament";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/Navigation";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { clsx } from "clsx";

export default function PlayerScorecard() {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [selectedRoundId, setSelectedRoundId] = useState<string>("");

  const { data: players } = usePlayers();
  const { data: rounds } = useRounds();

  const selectedPlayer = players?.find(p => p.id === Number(selectedPlayerId));
  const selectedRound = rounds?.find(r => r.id === Number(selectedRoundId));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <Header
        title="Player Scorecard"
        subtitle="Individual Performance Breakdown"
      />

      <PageTransition>
        <main className="max-w-2xl mx-auto px-4 space-y-6">

          {/* Player Selection */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground ml-1">Select Player</Label>
            <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
              <SelectTrigger className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700">
                <SelectValue placeholder="Choose a player..." />
              </SelectTrigger>
              <SelectContent className="z-[100] bg-white dark:bg-slate-800 dark:border-slate-700 backdrop-blur-sm">
                {players?.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name} (HCP: {p.handicap}) - {p.team?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPlayer ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

              {/* Player Header */}
              <Card className="border-0 shadow-lg bg-gradient-to-r from-primary/5 to-primary/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-3xl font-bold font-display">{selectedPlayer.name}</h2>
                    <div
                      className="w-12 h-12 rounded-full shadow-md"
                      style={{ backgroundColor: selectedPlayer.team?.color || "#888" }}
                    />
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>Handicap: <strong>{selectedPlayer.handicap}</strong></span>
                    <span>Team: <strong>{selectedPlayer.team?.name || "N/A"}</strong></span>
                  </div>
                </CardContent>
              </Card>

              {/* Round Tabs */}
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="w-full grid grid-cols-2 mb-6 bg-slate-200 dark:bg-slate-800 p-1">
                  <TabsTrigger value="all" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm data-[state=active]:text-foreground dark:data-[state=active]:text-white">
                    All Rounds
                  </TabsTrigger>
                  <TabsTrigger value="single" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm data-[state=active]:text-foreground dark:data-[state=active]:text-white">
                    Single Round
                  </TabsTrigger>
                </TabsList>

                {/* All Rounds Summary */}
                <TabsContent value="all" className="space-y-3">
                  {rounds && rounds.length > 0 ? (
                    rounds.map((round) => (
                      <RoundSummaryCard
                        key={round.id}
                        round={round}
                        playerId={selectedPlayer.id}
                        playerHandicap={selectedPlayer.handicap}
                      />
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No rounds available
                    </div>
                  )}
                </TabsContent>

                {/* Single Round Detail */}
                <TabsContent value="single" className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground ml-1">Select Round</Label>
                    <Select value={selectedRoundId} onValueChange={setSelectedRoundId}>
                      <SelectTrigger className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700">
                        <SelectValue placeholder="Choose a round..." />
                      </SelectTrigger>
                      <SelectContent className="z-[100] bg-white dark:bg-slate-800 dark:border-slate-700 backdrop-blur-sm">
                        {rounds?.map((r) => (
                          <SelectItem key={r.id} value={String(r.id)}>
                            R{r.roundNumber}: {r.course.name} - {r.date}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedRoundId && (
                    <RoundDetailCard
                      roundId={Number(selectedRoundId)}
                      playerId={selectedPlayer.id}
                      playerHandicap={selectedPlayer.handicap}
                    />
                  )}
                </TabsContent>
              </Tabs>

            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">👤</span>
              </div>
              <p>Select a player to view their scorecard</p>
            </div>
          )}

        </main>
      </PageTransition>

      <BottomNav />
    </div>
  );
}

function RoundSummaryCard({
  round,
  playerId,
  playerHandicap
}: {
  round: any
  playerId: number
  playerHandicap: number
}) {
  const { data: scores } = useScores(round.id);
  const playerScores = scores?.filter(s => s.playerId === playerId) || [];

  if (playerScores.length === 0) {
    return (
      <Card className="bg-slate-50 border-dashed shadow-none">
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          No scores recorded
        </CardContent>
      </Card>
    );
  }

  // Calculate totals
  const grossTotal = playerScores.reduce((sum, s) => sum + (s.grossScore || 0), 0);
  const netTotal = playerScores.reduce((sum, s) => sum + (s.netScore || 0), 0);
  const totalHandicap = playerScores.reduce((sum, s) => sum + (s.handicapStrokes || 0), 0);
  const stablefordTotal = playerScores.reduce((sum, s) => sum + (s.stablefordPoints || 0), 0);

  // Determine score quality color
  const getScoreColor = (gross: number, par: number) => {
    const diff = gross - par;
    if (diff <= -2) return "text-amber-500 bg-amber-50"; // Eagle+
    if (diff === -1) return "text-red-500 bg-red-50"; // Birdie
    if (diff === 0) return "text-slate-900 bg-slate-50"; // Par
    if (diff === 1) return "text-blue-600 bg-blue-50"; // Bogey
    return "text-slate-500 bg-slate-50"; // Double+
  };

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-lg">
              R{round.roundNumber}: {round.course.name}
            </h3>
            <p className="text-xs text-muted-foreground">{round.date}</p>
          </div>
          <Badge variant="outline" className="dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600">{round.formatType.replace(/_/g, ' ')}</Badge>
        </div>

        {/* Score Grid */}
        <div className="grid grid-cols-9 gap-1 mb-4">
          {playerScores.map((score, idx) => {
            const hole = round.holes?.[idx];
            return (
              <div key={score.id} className="text-center">
                <div className="text-[10px] text-muted-foreground mb-1">H{score.holeNumber}</div>
                <div className={clsx(
                  "rounded px-2 py-1 font-bold text-sm",
                  getScoreColor(score.grossScore || 0, hole?.par || 4)
                )}>
                  {score.grossScore}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {score.netScore}
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals */}
        <div className="border-t pt-3 grid grid-cols-4 gap-2 text-sm">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Gross</div>
            <div className="font-bold text-lg">{grossTotal}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Course HCP</div>
            <div className="font-bold text-lg">
              {playerScores[0]?.handicapUsed ?? playerHandicap}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Net</div>
            <div className="font-bold text-lg text-primary">{netTotal}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Stableford</div>
            <div className="font-bold text-lg text-primary">{stablefordTotal}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RoundDetailCard({
  roundId,
  playerId,
  playerHandicap
}: {
  roundId: number
  playerId: number
  playerHandicap: number
}) {
  const { data: allScores } = useScores(roundId);
  const { data: rounds } = useRounds();

  const round = rounds?.find(r => r.id === roundId);
  const playerScores = allScores?.filter(s => s.playerId === playerId) || [];

  if (!round) return null;

  if (playerScores.length === 0) {
    return (
      <Card className="bg-slate-50 border-dashed shadow-none">
        <CardContent className="p-8 text-center text-muted-foreground">
          No scores recorded for this round
        </CardContent>
      </Card>
    );
  }

  const grossTotal = playerScores.reduce((sum, s) => sum + (s.grossScore || 0), 0);
  const netTotal = playerScores.reduce((sum, s) => sum + (s.netScore || 0), 0);
  const stablefordTotal = playerScores.reduce((sum, s) => sum + (s.stablefordPoints || 0), 0);

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <h3 className="font-bold text-xl mb-4">{round.course.name}</h3>

          {/* Hole-by-Hole Scorecard */}
          <div className="space-y-4">
            {/* Front 9 */}
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-2">Front 9</h4>
              <div className="grid grid-cols-9 gap-2">
                {playerScores.slice(0, 9).map((score) => {
                  const hole = round.holes?.find(h => h.number === score.holeNumber);
                  const diff = (score.grossScore || 0) - (hole?.par || 4);
                  return (
                    <div key={score.id} className="text-center">
                      <div className="text-xs font-bold text-muted-foreground mb-1">H{score.holeNumber}</div>
                      <div className="bg-white border-2 border-slate-200 rounded p-2">
                        <div className="font-bold text-lg text-slate-900">{score.grossScore}</div>
                        <div className="text-xs text-slate-700">
                          {diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : 'E'}
                        </div>
                      </div>
                      <div className="text-xs mt-1">
                        <div className="text-muted-foreground">Par {hole?.par}</div>
                        <div className="text-primary font-semibold">{score.stablefordPoints}pts</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Back 9 */}
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-2">Back 9</h4>
              <div className="grid grid-cols-9 gap-2">
                {playerScores.slice(9, 18).map((score) => {
                  const hole = round.holes?.find(h => h.number === score.holeNumber);
                  const diff = (score.grossScore || 0) - (hole?.par || 4);
                  return (
                    <div key={score.id} className="text-center">
                      <div className="text-xs font-bold text-muted-foreground mb-1">H{score.holeNumber}</div>
                      <div className="bg-white border-2 border-slate-200 rounded p-2">
                        <div className="font-bold text-lg text-slate-900">{score.grossScore}</div>
                        <div className="text-xs text-slate-700">
                          {diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : 'E'}
                        </div>
                      </div>
                      <div className="text-xs mt-1">
                        <div className="text-muted-foreground">Par {hole?.par}</div>
                        <div className="text-primary font-semibold">{score.stablefordPoints}pts</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="border-t mt-6 pt-6 grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">GROSS</div>
              <div className="text-3xl font-bold">{grossTotal}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">COURSE HANDICAP</div>
              <div className="text-3xl font-bold">
                {playerScores[0]?.handicapUsed ?? playerHandicap}
              </div>
              {playerScores[0]?.handicapUsed !== playerHandicap && (
                <div className="text-xs text-muted-foreground mt-1">
                  (Base: {playerHandicap})
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">NET</div>
              <div className="text-3xl font-bold text-primary">{netTotal}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">STABLEFORD</div>
              <div className="text-3xl font-bold text-primary">{stablefordTotal}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
