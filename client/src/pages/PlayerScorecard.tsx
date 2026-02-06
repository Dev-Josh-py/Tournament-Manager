import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { usePlayers, useRounds, useScores, useUpdatePlayerHandicap, useRoundHandicaps, useSubmitScore } from "@/hooks/use-tournament";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/Navigation";
import { PageTransition } from "@/components/PageTransition";
import { ScoreboardTable } from "@/components/ScoreboardTable";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Edit2, X, Check } from "lucide-react";
import { clsx } from "clsx";

export default function PlayerScorecard() {
  const params = useParams();
  const playerId = params?.id ? Number(params.id) : null;

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(playerId ? String(playerId) : "");
  const [selectedRoundId, setSelectedRoundId] = useState<string>("");
  const [editingHandicap, setEditingHandicap] = useState<boolean>(false);
  const [newHandicap, setNewHandicap] = useState<string>("");

  const { data: players } = usePlayers();
  const { data: rounds } = useRounds();
  const updateHandicap = useUpdatePlayerHandicap();
  const { toast } = useToast();

  // Set selectedPlayerId from URL params on mount
  useEffect(() => {
    if (playerId && !selectedPlayerId) {
      setSelectedPlayerId(String(playerId));
    }
  }, [playerId]);

  const selectedPlayer = players?.find(p => p.id === Number(selectedPlayerId));
  const selectedRound = rounds?.find(r => r.id === Number(selectedRoundId));

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
                    {p.name} (HCP Index: {p.handicap}) - {p.team?.name}
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
  const { data: handicaps } = useRoundHandicaps(round.id);
  const playerScores = scores?.filter(s => s.playerId === playerId) || [];
  const playerHandicapData = handicaps?.find(h => h.playerId === playerId);

  if (playerScores.length === 0) {
    return (
      <Card className="bg-slate-50 border-dashed shadow-none">
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          No scores recorded
        </CardContent>
      </Card>
    );
  }

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

        <ScoreboardTable
          playerScores={playerScores}
          holes={round.holes || []}
          roundFormat={round.formatType}
          courseHandicap={playerHandicapData?.courseHandicap}
        />
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

  if (playerScores.length === 0) {
    return (
      <Card className="bg-slate-50 border-dashed shadow-none">
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
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-xl">{round.course.name}</h3>
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
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="font-bold w-8">H{hole.number}</div>
                      <div className="text-sm text-slate-600">Par {hole.par} (SI {hole.strokeIndex})</div>
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
                          className="bg-green-600 hover:bg-green-700"
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
            <ScoreboardTable
              playerScores={playerScores}
              holes={round.holes || []}
              roundFormat={round.formatType}
              courseHandicap={playerHandicapData?.courseHandicap}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
