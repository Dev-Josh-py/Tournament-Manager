import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { usePlayers, useRounds, useScores, useUpdatePlayerHandicap, useRoundHandicaps, useSubmitScore } from "@/hooks/use-tournament";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/Navigation";
import { PageTransition } from "@/components/PageTransition";
import { ScoreboardTable } from "@/components/ScoreboardTable";
import { RoundStatsCharts } from "@/components/RoundStatsCharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Edit2, X, Check, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

const formatTypeName = (type: string) =>
  type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const getFormatBadgeColor = (formatType: string) => {
  switch (formatType) {
    case "individual_net": return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
    case "individual_match_play": return "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800";
    case "combined_stableford": return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800";
    case "better_ball_stableford": return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
    case "pick_9": return "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800";
    case "individual_stableford": return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800";
    case "team_scramble": return "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800";
    default: return "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600";
  }
};

export default function PlayerScorecard() {
  const params = useParams();
  const playerId = params?.id ? Number(params.id) : null;
  const [, navigate] = useLocation();

  const [selectedRoundId, setSelectedRoundId] = useState<string>("");
  const [editingHandicap, setEditingHandicap] = useState<boolean>(false);
  const [newHandicap, setNewHandicap] = useState<string>("");

  const { data: players } = usePlayers();
  const { data: rounds } = useRounds();
  const updateHandicap = useUpdatePlayerHandicap();
  const { toast } = useToast();

  const selectedPlayer = playerId ? players?.find(p => p.id === playerId) : null;

  const handleSaveHandicap = async () => {
    if (!selectedPlayer) return;

    const handicapValue = parseFloat(newHandicap);
    if (isNaN(handicapValue) || handicapValue < 0 || handicapValue > 54) {
      toast({
        title: "Invalid Input",
        description: "Handicap index must be between 0 and 54",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateHandicap.mutateAsync({
        playerId: selectedPlayer.id,
        handicap: handicapValue,
      });

      toast({
        title: "Success",
        description: "Handicap index updated successfully",
      });

      setEditingHandicap(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update handicap",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <Header
        title="Player Scorecard"
        subtitle="Individual Performance Breakdown"
      />

      <PageTransition>
        <main className="max-w-2xl mx-auto px-2 sm:px-4 space-y-4 sm:space-y-6">

          {/* Back navigation */}
          <Button
            variant="ghost"
            className="pl-0 text-muted-foreground -mb-2"
            onClick={() => navigate("/players")}
          >
            ← Players
          </Button>

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

                  {/* Player Info */}
                  {editingHandicap ? (
                    <div className="space-y-3">
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>Team: <strong>{selectedPlayer.team?.name || "N/A"}</strong></span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Label htmlFor="edit-handicap" className="font-medium whitespace-nowrap">
                          Handicap Index:
                        </Label>
                        <Input
                          id="edit-handicap"
                          type="number"
                          min="0"
                          max="54"
                          step="0.1"
                          value={newHandicap}
                          onChange={(e) => setNewHandicap(e.target.value)}
                          className="w-24 text-center font-bold"
                          autoFocus
                        />
                        <Button
                          onClick={handleSaveHandicap}
                          disabled={updateHandicap.isPending}
                          size="sm"
                          variant="default"
                        >
                          Save
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingHandicap(false);
                            setNewHandicap("");
                          }}
                          disabled={updateHandicap.isPending}
                          size="sm"
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4 text-sm text-muted-foreground items-center">
                      <span>Handicap Index: <strong>{selectedPlayer.handicap}</strong></span>
                      <span>Team: <strong>{selectedPlayer.team?.name || "N/A"}</strong></span>
                      <Button
                        onClick={() => {
                          setEditingHandicap(true);
                          setNewHandicap(String(selectedPlayer.handicap));
                        }}
                        size="sm"
                        variant="outline"
                      >
                        Edit
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Round List / Detail Navigation */}
              {selectedRoundId === "" ? (
                <div className="space-y-3">
                  {rounds && rounds.length > 0 ? (
                    rounds.map((round) => (
                      <RoundListCard
                        key={round.id}
                        round={round}
                        playerId={selectedPlayer.id}
                        onClick={() => setSelectedRoundId(String(round.id))}
                      />
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No rounds available
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <Button
                    variant="ghost"
                    className="pl-0 text-muted-foreground"
                    onClick={() => setSelectedRoundId("")}
                  >
                    ← Back
                  </Button>
                  <RoundDetailCard
                    roundId={Number(selectedRoundId)}
                    playerId={selectedPlayer.id}
                    playerHandicap={selectedPlayer.handicap}
                  />
                </div>
              )}

            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <p>Player not found.</p>
            </div>
          )}

        </main>
      </PageTransition>

      <BottomNav />
    </div>
  );
}

function RoundListCard({
  round,
  playerId,
  onClick,
}: {
  round: any
  playerId: number
  onClick: () => void
}) {
  const { data: scores } = useScores(round.id);
  const { data: handicaps } = useRoundHandicaps(round.id);
  const playerScores = scores?.filter((s: any) => s.playerId === playerId) || [];
  const courseHandicap = handicaps?.find((h: any) => h.playerId === playerId)?.courseHandicap;
  const totalGross = playerScores.reduce((s: number, p: any) => s + (p.grossScore || 0), 0);
  const totalPts = playerScores.reduce((s: number, p: any) => s + (p.stablefordPoints || 0), 0);

  return (
    <Card
      className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-bold text-sm sm:text-base truncate">
                R{round.roundNumber}: {round.course.name}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{round.date}</span>
              <Badge className={clsx("text-[10px] border", getFormatBadgeColor(round.formatType))}>
                {formatTypeName(round.formatType)}
              </Badge>
            </div>
          </div>
          <div className="text-right flex-shrink-0 space-y-0.5">
            {playerScores.length > 0 ? (
              <>
                <div className="text-lg font-bold leading-none">{totalGross}</div>
                <div className="text-[10px] text-muted-foreground">
                  {courseHandicap !== undefined ? `CH ${courseHandicap}` : ''}{courseHandicap !== undefined && ' · '}{totalPts} pts
                </div>
              </>
            ) : (
              <div className="text-xs text-muted-foreground">No scores</div>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
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
  const { data: handicaps } = useRoundHandicaps(round.id);
  const playerScores = scores?.filter(s => s.playerId === playerId) || [];
  const playerHandicapData = handicaps?.find(h => h.playerId === playerId);

  if (playerScores.length === 0) {
    return (
      <Card className="bg-slate-50 dark:bg-slate-900 border-dashed shadow-none">
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          No scores recorded
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-sm sm:text-lg truncate">
              R{round.roundNumber}: {round.course.name}
            </h3>
            <p className="text-[10px] sm:text-xs text-muted-foreground">{round.date}</p>
          </div>
          <Badge className={clsx("text-[10px] sm:text-xs border flex-shrink-0", getFormatBadgeColor(round.formatType))}>{formatTypeName(round.formatType)}</Badge>
        </div>

        <ScoreboardTable
          playerScores={playerScores}
          holes={round.holes || []}
          roundFormat={round.formatType}
          courseHandicap={playerHandicapData?.courseHandicap}
          showStats={true}
        />
        <RoundStatsCharts scores={playerScores} holes={round.holes || []} />
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
  const { data: allScores, refetch } = useScores(roundId);
  const { data: rounds } = useRounds();
  const { data: handicaps } = useRoundHandicaps(roundId);
  const submitScore = useSubmitScore();
  const { toast } = useToast();

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingHole, setEditingHole] = useState<number | null>(null);
  const [editingScore, setEditingScore] = useState<string>("");

  const round = rounds?.find(r => r.id === roundId);
  const playerScores = allScores?.filter(s => s.playerId === playerId) || [];
  const playerHandicapData = handicaps?.find(h => h.playerId === playerId);

  if (!round) return null;

  // Team Scramble: show simplified view
  if (round.formatType === 'team_scramble') {
    const totalGross = playerScores.reduce((s, p) => s + (p.grossScore || 0), 0);
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-base sm:text-xl truncate mr-2">{round.course.name}</h3>
            <Badge className={clsx("text-[10px] sm:text-xs border flex-shrink-0", getFormatBadgeColor(round.formatType))}>Team Scramble</Badge>
          </div>
          {playerScores.length > 0 ? (
            <div className="text-center py-6 space-y-2">
              <div className="text-4xl font-bold">{totalGross}</div>
              <div className="text-sm text-muted-foreground">Team Gross ({playerScores.length} holes)</div>
              <p className="text-xs text-muted-foreground mt-2">
                Individual scorecard not applicable for Team Scramble format.
              </p>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No scores recorded for this round
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (playerScores.length === 0) {
    return (
      <Card className="bg-slate-50 dark:bg-slate-900 border-dashed shadow-none">
        <CardContent className="p-8 text-center text-muted-foreground">
          No scores recorded for this round
        </CardContent>
      </Card>
    );
  }

  const handleStartEditScore = (holeNumber: number, currentScore: number) => {
    setEditingHole(holeNumber);
    setEditingScore(String(currentScore));
  };

  const handleSaveScore = async () => {
    if (editingHole === null) return;

    const score = parseInt(editingScore);
    if (isNaN(score) || score < 1 || score > 15) {
      toast({
        title: "Invalid Score",
        description: "Score must be between 1 and 15",
        variant: "destructive",
      });
      return;
    }

    try {
      await submitScore.mutateAsync({
        roundId,
        playerId,
        holeNumber: editingHole,
        grossScore: score,
        isPick9: false
      });

      toast({
        title: "Score Saved",
        description: `Hole ${editingHole} score updated`,
        variant: "default",
      });

      // Refetch scores
      refetch();
      setEditingHole(null);
      setEditingScore("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save score",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-lg">
        <CardContent className="p-3 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-base sm:text-xl truncate mr-2">{round.course.name}</h3>
            {!isEditMode && playerScores.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditMode(true)}
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Scores
              </Button>
            )}
            {isEditMode && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsEditMode(false);
                  setEditingHole(null);
                  setEditingScore("");
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Exit Edit
              </Button>
            )}
          </div>

          {isEditMode ? (
            <div className="space-y-3">
              {(round.holes || []).map(hole => {
                const existingScore = playerScores.find(s => s.holeNumber === hole.number);
                const isEditing = editingHole === hole.number;

                return (
                  <div
                    key={hole.number}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="font-bold w-8">H{hole.number}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Par {hole.par} (SI {hole.strokeIndex})</div>
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max="15"
                          value={editingScore}
                          onChange={(e) => setEditingScore(e.target.value)}
                          className="w-16 text-center"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={handleSaveScore}
                          disabled={submitScore.isPending}
                          className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
                        >
                          {submitScore.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-bold text-primary">
                          {existingScore?.grossScore || "-"}
                        </div>
                        {existingScore && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartEditScore(hole.number, existingScore.grossScore)}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              <ScoreboardTable
                playerScores={playerScores}
                holes={round.holes || []}
                roundFormat={round.formatType}
                courseHandicap={playerHandicapData?.courseHandicap}
                showStats={true}
              />
              <RoundStatsCharts scores={playerScores} holes={round.holes || []} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
