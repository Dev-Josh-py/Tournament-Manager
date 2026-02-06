import { useState } from "react";
import { Link } from "wouter";
import { useRounds, useRound, usePlayers, useSubmitScore, useScores, useRoundHandicaps } from "@/hooks/use-tournament";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/Navigation";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, ChevronLeft, ChevronRight, Hash, ClipboardEdit, AlertCircle, Settings } from "lucide-react";
import { clsx } from "clsx";

export default function Scoring() {
  const [selectedRoundId, setSelectedRoundId] = useState<string>("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [currentHole, setCurrentHole] = useState<number>(1);
  const [strokes, setStrokes] = useState<number>(4);
  const [isPick9, setIsPick9] = useState<boolean>(false);

  const { data: rounds } = useRounds();
  const { data: players } = usePlayers();
  const { data: roundDetails } = useRound(Number(selectedRoundId));
  const { data: existingScores } = useScores(Number(selectedRoundId));
  const { data: roundHandicaps } = useRoundHandicaps(Number(selectedRoundId));

  const submitScore = useSubmitScore();
  const { toast } = useToast();

  const currentHoleData = roundDetails?.holes.find(h => h.number === currentHole);
  
  // Check if score already exists for this hole/player
  const existingScore = existingScores?.find(s => 
    s.playerId === Number(selectedPlayerId) && 
    s.holeNumber === currentHole
  );

  const handleScoreSubmit = async () => {
    if (!selectedRoundId || !selectedPlayerId) return;

    try {
      await submitScore.mutateAsync({
        roundId: Number(selectedRoundId),
        playerId: Number(selectedPlayerId),
        holeNumber: currentHole,
        grossScore: strokes,
        isPick9: isPick9
      });

      toast({
        title: "Score Saved",
        description: `Hole ${currentHole} recorded for player.`,
        variant: "default",
      });

      // Auto-advance to next hole if not 18
      if (currentHole < 18) {
        setCurrentHole(prev => prev + 1);
        // Reset strokes for next hole to par (approx)
        const nextHolePar = roundDetails?.holes.find(h => h.number === currentHole + 1)?.par || 4;
        setStrokes(nextHolePar);
      }

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit score",
        variant: "destructive",
      });
    }
  };

  // Determine score color relative to par
  const getScoreColor = (score: number, par: number) => {
    const diff = score - par;
    if (diff <= -2) return "text-amber-500"; // Eagle+
    if (diff === -1) return "text-red-500"; // Birdie
    if (diff === 0) return "text-slate-900"; // Par
    if (diff === 1) return "text-blue-600"; // Bogey
    return "text-slate-500"; // Double+
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <Header title="Score Entry" subtitle="Enter Hole-by-Hole Results" />
      
      <PageTransition>
        <main className="max-w-md mx-auto px-4 space-y-6">

          {/* Selectors - Always at top */}
          <div className="grid grid-cols-2 gap-3 relative z-20">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground ml-1">Round</Label>
              <Select value={selectedRoundId} onValueChange={setSelectedRoundId}>
                <SelectTrigger className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700">
                  <SelectValue placeholder="Select Round" />
                </SelectTrigger>
                <SelectContent className="z-[100] bg-white dark:bg-slate-800 dark:border-slate-700 backdrop-blur-sm">
                  {rounds?.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      R{r.roundNumber}: {r.course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground ml-1">Player</Label>
              <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                <SelectTrigger className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700 disabled:opacity-50" disabled={!selectedRoundId}>
                  <SelectValue placeholder="Select Player" />
                </SelectTrigger>
                <SelectContent className="z-[100] bg-white dark:bg-slate-800 dark:border-slate-700 backdrop-blur-sm">
                  {players?.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} (HCP Index: {Number(p.handicap).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Check if handicaps are set for this round */}
          {selectedRoundId && roundHandicaps && selectedPlayerId && (() => {
            const allHandicapsSet = roundHandicaps.every(h => h.courseHandicap !== null && h.courseHandicap !== undefined);
            const currentPlayerHandicap = roundHandicaps.find(h => h.playerId === Number(selectedPlayerId));

            if (!allHandicapsSet) {
              // BLOCK SCORING - handicaps not set
              return (
                <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-900">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <div className="font-bold text-red-900 dark:text-red-100">
                        Course Handicaps Not Set
                      </div>
                    </div>
                    <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                      Course handicaps must be configured before entering scores for this round.
                    </p>
                    <Link href={`/round-setup?round=${selectedRoundId}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        <Settings className="w-4 h-4 mr-2" />
                        Set Handicaps Now
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            }

            // Show current course handicap
            return currentPlayerHandicap && (
              <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-900">
                <CardContent className="p-3">
                  <div className="text-sm flex items-center justify-between">
                    <span className="text-muted-foreground">Course Handicap:</span>
                    <div>
                      <span className="text-lg font-bold text-primary ml-2">
                        {currentPlayerHandicap.courseHandicap}
                      </span>
                      {currentPlayerHandicap.courseHandicap !== currentPlayerHandicap.baseHandicap && (
                        <span className="text-xs text-muted-foreground ml-2">
                          (Index: {currentPlayerHandicap.baseHandicap})
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {selectedRoundId && selectedPlayerId && currentHoleData && (() => {
            const allHandicapsSet = roundHandicaps?.every(h => h.courseHandicap !== undefined);

            if (!allHandicapsSet) {
              return null; // Don't show hole navigator and score input
            }

            return (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Hole Navigator */}
              <div className="flex items-center justify-between bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setCurrentHole(Math.max(1, currentHole - 1))}
                  disabled={currentHole === 1}
                >
                  <ChevronLeft className="w-6 h-6 text-slate-400" />
                </Button>
                
                <div className="text-center">
                  <h2 className="text-2xl font-bold font-display text-primary">Hole {currentHole}</h2>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
                    <span>Par {currentHoleData.par}</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full" />
                    <span>SI {currentHoleData.strokeIndex}</span>
                  </div>
                </div>

                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setCurrentHole(Math.min(18, currentHole + 1))}
                  disabled={currentHole === 18}
                >
                  <ChevronRight className="w-6 h-6 text-slate-400" />
                </Button>
              </div>

              {/* Big Score Input */}
              <Card className="border-none shadow-lg bg-white overflow-hidden relative">
                <CardContent className="p-8 flex flex-col items-center justify-center gap-6">
                  
                  <div className="flex items-center gap-8">
                    <Button
                      variant="outline"
                      className="h-16 w-16 rounded-full border-2 text-3xl font-light hover:bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:hover:bg-slate-600"
                      onClick={() => setStrokes(Math.max(1, strokes - 1))}
                    >
                      -
                    </Button>

                    <div className="text-center w-24 relative z-10">
                      <span className={clsx(
                        "text-7xl font-bold font-display block leading-none tracking-tighter transition-colors",
                        getScoreColor(strokes, currentHoleData.par)
                      )}>
                        {strokes}
                      </span>
                      <span className="text-xs uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest mt-2 block">
                        Strokes
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      className="h-16 w-16 rounded-full border-2 text-3xl font-light hover:bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:hover:bg-slate-600"
                      onClick={() => setStrokes(Math.min(15, strokes + 1))}
                    >
                      +
                    </Button>
                  </div>

                  {roundDetails?.formatType === "pick_9" && (
                    <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-lg w-full justify-between">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium">Include in Pick 9?</span>
                      </div>
                      <Switch checked={isPick9} onCheckedChange={setIsPick9} />
                    </div>
                  )}

                  {existingScore && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold uppercase tracking-wide">
                      <CheckCircle className="w-3 h-3" /> Saved: {existingScore.grossScore}
                    </div>
                  )}

                </CardContent>
              </Card>

              {/* Action Button */}
              <Button 
                size="lg" 
                className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20 bg-gradient-to-r from-primary to-emerald-700 hover:to-emerald-800 transition-all active:scale-[0.98]"
                onClick={handleScoreSubmit}
                disabled={submitScore.isPending}
              >
                {submitScore.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  "Save Score"
                )}
              </Button>

            </div>
            );
          })()}

          {!selectedRoundId || !selectedPlayerId || !currentHoleData && (
            <div className="text-center py-20 text-muted-foreground opacity-50 relative z-0">
              <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClipboardEdit className="w-8 h-8" />
              </div>
              <p>Select a round and player to begin scoring</p>
            </div>
          )}

        </main>
      </PageTransition>

      <BottomNav />
    </div>
  );
}
