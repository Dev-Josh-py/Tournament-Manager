import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { useRounds, useRound, usePlayers, useSubmitScore, useScores, useRoundHandicaps, useRoundGroupings } from "@/hooks/use-tournament";
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
  // General state
  const [selectedRoundId, setSelectedRoundId] = useState<string>("");
  const [currentHole, setCurrentHole] = useState<number>(1);

  // Single player mode state
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [strokes, setStrokes] = useState<number>(4);
  const [isPick9, setIsPick9] = useState<boolean>(false);

  // Group mode state
  const [selectedGroupNumber, setSelectedGroupNumber] = useState<number>(0);
  const [groupScores, setGroupScores] = useState<Record<number, Record<number, { strokes: number; isPick9: boolean }>>>({});

  const { data: rounds } = useRounds();
  const { data: players } = usePlayers();
  const { data: roundDetails } = useRound(Number(selectedRoundId));
  const { data: existingScores } = useScores(Number(selectedRoundId));
  const { data: roundHandicaps } = useRoundHandicaps(Number(selectedRoundId));
  const { data: groupings } = useRoundGroupings(Number(selectedRoundId));

  const submitScore = useSubmitScore();
  const { toast } = useToast();

  // Determine mode
  const isGroupMode = (groupings && groupings.length > 0) ? true : false;
  const currentGrouping = isGroupMode && selectedGroupNumber > 0
    ? groupings?.find(g => g.groupNumber === selectedGroupNumber)
    : null;

  const playersInGroup = useMemo(() => {
    if (!currentGrouping || !players) return [];
    return currentGrouping.players
      .map(p => players.find(pl => pl.id === p.playerId))
      .filter(Boolean) as typeof players;
  }, [currentGrouping, players]);

  const currentHoleData = roundDetails?.holes.find(h => h.number === currentHole);

  // Single player mode: check for existing score
  const existingScore = useMemo(() => {
    if (!isGroupMode && selectedPlayerId && existingScores) {
      return existingScores.find(s =>
        s.playerId === Number(selectedPlayerId) &&
        s.holeNumber === currentHole
      );
    }
    return undefined;
  }, [isGroupMode, selectedPlayerId, existingScores, currentHole]);

  // Single player mode: calculate scored holes
  const scoredHoles = useMemo(() => {
    if (isGroupMode || !existingScores || !selectedPlayerId) return new Set<number>();
    return new Set(
      existingScores
        .filter(s => s.playerId === Number(selectedPlayerId))
        .map(s => s.holeNumber)
    );
  }, [isGroupMode, existingScores, selectedPlayerId]);

  // Group mode: check for unsaved scores when advancing hole
  useEffect(() => {
    if (isGroupMode && currentGrouping && existingScores) {
      const hasUnsaved = playersInGroup.some(player => {
        const playerGroupScore = groupScores[selectedGroupNumber]?.[player.id];
        if (!playerGroupScore) return false; // No unsaved score
        return true; // Has unsaved score
      });
      if (hasUnsaved) {
        setUnsavedWarningShown(true);
      }
    }
  }, [currentHole, isGroupMode, currentGrouping, selectedGroupNumber, playersInGroup, groupScores, existingScores]);

  const [unsavedWarningShown, setUnsavedWarningShown] = useState(false);

  const handleScoreSubmit = async () => {
    if (!selectedRoundId) return;

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

      // Auto-advance to next hole
      if (currentHole < 18) {
        setCurrentHole(prev => prev + 1);
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

  const handleGroupPlayerScoreSubmit = async (playerId: number) => {
    if (!selectedRoundId || !selectedGroupNumber) return;

    const playerGroupScore = groupScores[selectedGroupNumber]?.[playerId];
    if (!playerGroupScore) return;

    try {
      await submitScore.mutateAsync({
        roundId: Number(selectedRoundId),
        playerId,
        holeNumber: currentHole,
        grossScore: playerGroupScore.strokes,
        isPick9: playerGroupScore.isPick9
      });

      toast({
        title: "Score Saved",
        description: `Hole ${currentHole} recorded.`,
        variant: "default",
      });

      // Clear the unsaved score
      setGroupScores(prev => {
        const updated = { ...prev };
        if (updated[selectedGroupNumber]) {
          const { [playerId]: _, ...rest } = updated[selectedGroupNumber];
          updated[selectedGroupNumber] = rest;
        }
        return updated;
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit score",
        variant: "destructive",
      });
    }
  };

  const getScoreColor = (score: number, par: number) => {
    const diff = score - par;
    if (diff <= -2) return "text-amber-500";
    if (diff === -1) return "text-red-500";
    if (diff === 0) return "text-slate-900";
    if (diff === 1) return "text-blue-600";
    return "text-slate-500";
  };

  const HoleButton = ({
    holeNumber,
    isActive,
    isScored
  }: {
    holeNumber: number;
    isActive: boolean;
    isScored: boolean;
  }) => {
    return (
      <button
        onClick={() => {
          setUnsavedWarningShown(false);
          setCurrentHole(holeNumber);
        }}
        aria-label={`Hole ${holeNumber}${isScored ? " (scored)" : ""}`}
        aria-current={isActive ? "true" : undefined}
        className={clsx(
          "w-10 h-10 rounded-lg font-semibold text-sm transition-all",
          "hover:scale-105 active:scale-95",
          isActive && "bg-primary text-white ring-2 ring-primary ring-offset-2",
          !isActive && isScored && "bg-green-100 text-green-800 border-2 border-green-500 dark:bg-green-900 dark:text-green-100 dark:border-green-600",
          !isActive && !isScored && "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
        )}
      >
        {holeNumber}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <Header title="Score Entry" subtitle="Enter Hole-by-Hole Results" />

      <PageTransition>
        <main className="max-w-md mx-auto px-4 space-y-6">

          {/* Selectors */}
          <div className="grid grid-cols-2 gap-3 relative z-20">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground ml-1">Round</Label>
              <Select value={selectedRoundId} onValueChange={(val) => {
                setSelectedRoundId(val);
                setSelectedPlayerId("");
                setSelectedGroupNumber(0);
                setCurrentHole(1);
              }}>
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

            {/* Single player mode selector */}
            {selectedRoundId && !isGroupMode && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground ml-1">Player</Label>
                <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                  <SelectTrigger className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700 disabled:opacity-50" disabled={!selectedRoundId}>
                    <SelectValue placeholder="Select Player" />
                  </SelectTrigger>
                  <SelectContent className="z-[100] bg-white dark:bg-slate-800 dark:border-slate-700 backdrop-blur-sm">
                    {players?.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Group mode selector */}
            {selectedRoundId && isGroupMode && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground ml-1">Group</Label>
                <Select value={String(selectedGroupNumber)} onValueChange={(val) => {
                  setSelectedGroupNumber(Number(val));
                  setUnsavedWarningShown(false);
                }}>
                  <SelectTrigger className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700">
                    <SelectValue placeholder="Select Group" />
                  </SelectTrigger>
                  <SelectContent className="z-[100] bg-white dark:bg-slate-800 dark:border-slate-700 backdrop-blur-sm">
                    {groupings?.map((g) => (
                      <SelectItem key={g.id} value={String(g.groupNumber)}>
                        Group {g.groupNumber} {g.players.length} player{g.players.length !== 1 ? 's' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Handicap validation */}
          {selectedRoundId && roundHandicaps && (() => {
            const allHandicapsSet = roundHandicaps.every(h => h.courseHandicap !== null && h.courseHandicap !== undefined);

            if (!allHandicapsSet) {
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
                      Course handicaps must be configured before entering scores.
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

            return null;
          })()}

          {/* Unsaved warning for group mode */}
          {isGroupMode && unsavedWarningShown && (
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-900">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <div className="font-bold text-amber-900 dark:text-amber-100">
                    Unsaved Scores
                  </div>
                </div>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  One or more players in this group have unsaved scores for this hole. You can proceed to the next hole.
                </p>
              </CardContent>
            </Card>
          )}

          {/* SINGLE PLAYER MODE */}
          {selectedRoundId && !isGroupMode && selectedPlayerId && currentHoleData && roundHandicaps?.every(h => h.courseHandicap !== null) && (() => {
            const currentPlayerHandicap = roundHandicaps?.find(h => h.playerId === Number(selectedPlayerId));

            return (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Course Handicap Display */}
                {currentPlayerHandicap && (
                  <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-900">
                    <CardContent className="p-3">
                      <div className="text-sm flex items-center justify-between">
                        <span className="text-muted-foreground">Course Handicap:</span>
                        <span className="text-lg font-bold text-primary ml-2">
                          {currentPlayerHandicap.courseHandicap}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

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

                {/* Hole Selector Grid */}
                <Card className="border-none shadow-sm bg-white">
                  <CardContent className="p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-2 text-center">
                      Quick Jump to Hole
                    </div>
                    <div className="grid grid-cols-9 gap-1.5 mb-1.5">
                      {Array.from({ length: 9 }, (_, i) => i + 1).map(hole => (
                        <HoleButton
                          key={hole}
                          holeNumber={hole}
                          isActive={currentHole === hole}
                          isScored={scoredHoles.has(hole)}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-9 gap-1.5">
                      {Array.from({ length: 9 }, (_, i) => i + 10).map(hole => (
                        <HoleButton
                          key={hole}
                          holeNumber={hole}
                          isActive={currentHole === hole}
                          isScored={scoredHoles.has(hole)}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Score Input */}
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

          {/* GROUP MODE */}
          {selectedRoundId && isGroupMode && selectedGroupNumber > 0 && currentHoleData && roundHandicaps?.every(h => h.courseHandicap !== null) && (() => {
            return (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Group Navigation */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const prevGroup = groupings?.find(g => g.groupNumber === selectedGroupNumber - 1);
                      if (prevGroup) {
                        setSelectedGroupNumber(prevGroup.groupNumber);
                        setUnsavedWarningShown(false);
                      }
                    }}
                    disabled={selectedGroupNumber === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  <div className="text-center">
                    <p className="font-bold">Group {selectedGroupNumber} of {groupings?.length}</p>
                    <p className="text-xs text-slate-600">{playersInGroup.length} player{playersInGroup.length !== 1 ? 's' : ''}</p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const nextGroup = groupings?.find(g => g.groupNumber === selectedGroupNumber + 1);
                      if (nextGroup) {
                        setSelectedGroupNumber(nextGroup.groupNumber);
                        setUnsavedWarningShown(false);
                      }
                    }}
                    disabled={selectedGroupNumber === groupings?.length}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Hole Selector Grid */}
                <Card className="border-none shadow-sm bg-white">
                  <CardContent className="p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-2 text-center">
                      Quick Jump to Hole
                    </div>
                    <div className="grid grid-cols-9 gap-1.5 mb-1.5">
                      {Array.from({ length: 9 }, (_, i) => i + 1).map(hole => {
                        const allPlayersScored = playersInGroup.every(p => {
                          return existingScores?.some(s => s.playerId === p.id && s.holeNumber === hole);
                        });
                        return (
                          <HoleButton
                            key={hole}
                            holeNumber={hole}
                            isActive={currentHole === hole}
                            isScored={allPlayersScored}
                          />
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-9 gap-1.5">
                      {Array.from({ length: 9 }, (_, i) => i + 10).map(hole => {
                        const allPlayersScored = playersInGroup.every(p => {
                          return existingScores?.some(s => s.playerId === p.id && s.holeNumber === hole);
                        });
                        return (
                          <HoleButton
                            key={hole}
                            holeNumber={hole}
                            isActive={currentHole === hole}
                            isScored={allPlayersScored}
                          />
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Hole Navigator */}
                <div className="flex items-center justify-between bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setUnsavedWarningShown(false);
                      setCurrentHole(Math.max(1, currentHole - 1));
                    }}
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
                    onClick={() => {
                      setUnsavedWarningShown(false);
                      setCurrentHole(Math.min(18, currentHole + 1));
                    }}
                    disabled={currentHole === 18}
                  >
                    <ChevronRight className="w-6 h-6 text-slate-400" />
                  </Button>
                </div>

                {/* Compact Player Scoring List */}
                <Card className="border-none shadow-sm bg-white overflow-hidden">
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {playersInGroup.map(player => {
                        const existingPlayerScore = existingScores?.find(s => s.playerId === player.id && s.holeNumber === currentHole);
                        const playerUnsaved = groupScores[selectedGroupNumber]?.[player.id];
                        const currentScore = playerUnsaved?.strokes || (existingPlayerScore?.grossScore) || 0;
                        const scoreColor = getScoreColor(currentScore, currentHoleData.par);

                        return (
                          <div key={player.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition">
                            {/* Player Info */}
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: player.team?.color || "#999" }}
                              />
                              <div className="min-w-0">
                                <div className="text-sm font-semibold truncate">{player.name}</div>
                                <div className="text-xs text-slate-500 truncate">HCP {player.handicap}</div>
                              </div>
                            </div>

                            {/* Score Controls */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 text-sm font-light rounded border-slate-300"
                                onClick={() => {
                                  const newStrokes = Math.max(1, (playerUnsaved?.strokes || currentScore || 4) - 1);
                                  setGroupScores(prev => ({
                                    ...prev,
                                    [selectedGroupNumber]: {
                                      ...prev[selectedGroupNumber],
                                      [player.id]: {
                                        strokes: newStrokes,
                                        isPick9: playerUnsaved?.isPick9 || false
                                      }
                                    }
                                  }));
                                }}
                              >
                                −
                              </Button>

                              <div className={clsx(
                                "w-10 text-center font-bold text-sm",
                                scoreColor
                              )}>
                                {currentScore || "-"}
                              </div>

                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 text-sm font-light rounded border-slate-300"
                                onClick={() => {
                                  const newStrokes = Math.min(15, (playerUnsaved?.strokes || currentScore || 4) + 1);
                                  setGroupScores(prev => ({
                                    ...prev,
                                    [selectedGroupNumber]: {
                                      ...prev[selectedGroupNumber],
                                      [player.id]: {
                                        strokes: newStrokes,
                                        isPick9: playerUnsaved?.isPick9 || false
                                      }
                                    }
                                  }));
                                }}
                              >
                                +
                              </Button>

                              <Button
                                size="sm"
                                variant={playerUnsaved ? "default" : "outline"}
                                className="text-xs h-8 px-2 ml-1"
                                onClick={() => handleGroupPlayerScoreSubmit(player.id)}
                                disabled={submitScore.isPending}
                              >
                                {submitScore.isPending ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : playerUnsaved ? (
                                  "✓"
                                ) : existingPlayerScore ? (
                                  "✓"
                                ) : (
                                  "−"
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

              </div>
            );
          })()}

          {!selectedRoundId && (
            <div className="text-center py-20 text-muted-foreground opacity-50 relative z-0">
              <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClipboardEdit className="w-8 h-8" />
              </div>
              <p>Select a round to begin scoring</p>
            </div>
          )}

        </main>
      </PageTransition>

      <BottomNav />
    </div>
  );
}
