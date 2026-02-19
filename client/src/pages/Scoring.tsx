import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { useRounds, useRound, usePlayers, useSubmitScore, useScores, useRoundHandicaps, useRoundGroupings, useMatchPairings } from "@/hooks/use-tournament";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/Navigation";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, ChevronLeft, ChevronRight, Hash, ClipboardEdit, AlertCircle, Settings, Check, Calendar, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { clsx } from "clsx";

export default function Scoring() {
  // Step navigation state
  const [currentStep, setCurrentStep] = useState<'selectRound' | 'selectGroup' | 'scoring'>('selectRound');

  // General state
  const [selectedRoundId, setSelectedRoundId] = useState<string>("");
  const [currentHole, setCurrentHole] = useState<number>(1);

  // Single player mode state
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [strokes, setStrokes] = useState<number>(4);
  const [isPick9, setIsPick9] = useState<boolean>(false);
  const [gir, setGir] = useState<boolean | null>(null);
  const [fir, setFir] = useState<boolean | null>(null);
  const [putts, setPutts] = useState<number | null>(null);

  // Group mode state
  const [selectedGroupNumber, setSelectedGroupNumber] = useState<number>(0);
  const [groupScores, setGroupScores] = useState<Record<number, Record<number, { strokes: number; isPick9: boolean; gir?: boolean | null; fir?: boolean | null; putts?: number | null }>>>({});

  // Match play mode state
  const [selectedMatchNumber, setSelectedMatchNumber] = useState<number>(0);
  const [matchScores, setMatchScores] = useState<Record<number, Record<number, Record<number, { strokes: number; gir?: boolean | null; fir?: boolean | null; putts?: number | null }>>>>({});

  const { data: rounds } = useRounds();
  const { data: players } = usePlayers();
  const { data: roundDetails } = useRound(Number(selectedRoundId));
  const { data: existingScores } = useScores(Number(selectedRoundId));
  const { data: roundHandicaps } = useRoundHandicaps(Number(selectedRoundId));
  const { data: groupings, isLoading: groupingsLoading } = useRoundGroupings(Number(selectedRoundId));
  const { data: matchPairings, isLoading: matchPairingsLoading } = useMatchPairings(Number(selectedRoundId));

  const submitScore = useSubmitScore();
  const { toast } = useToast();

  // Determine mode
  const selectedRound = rounds?.find(r => String(r.id) === selectedRoundId);
  const isMatchPlayMode = selectedRound?.formatType === 'individual_match_play';
  const isGroupMode = !isMatchPlayMode && (groupings && groupings.length > 0) ? true : false;

  const currentGrouping = isGroupMode && selectedGroupNumber > 0
    ? groupings?.find(g => g.groupNumber === selectedGroupNumber)
    : null;

  const currentMatch = isMatchPlayMode && selectedMatchNumber > 0
    ? matchPairings?.find(m => m.matchNumber === selectedMatchNumber)
    : null;

  const playersInGroup = useMemo(() => {
    if (!currentGrouping || !players) return [];
    return currentGrouping.players
      .map(p => players.find(pl => pl.id === p.playerId))
      .filter(Boolean) as typeof players;
  }, [currentGrouping, players]);

  const playersInMatch = useMemo(() => {
    if (!currentMatch || !players) return [];
    const p1 = players.find(p => p.id === currentMatch.player1Id);
    const p2 = players.find(p => p.id === currentMatch.player2Id);
    return [p1, p2].filter(Boolean) as typeof players;
  }, [currentMatch, players]);

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

  // Single player mode: load stats from existing score when hole changes
  useEffect(() => {
    if (existingScore) {
      setGir(existingScore.gir ?? null);
      setFir(existingScore.fir ?? null);
      setPutts(existingScore.putts ?? null);
    } else {
      setGir(null);
      setFir(null);
      setPutts(null);
    }
  }, [existingScore]);

  // Single player mode: calculate scored holes
  const scoredHoles = useMemo(() => {
    if (isGroupMode || !existingScores || !selectedPlayerId) return new Set<number>();
    return new Set(
      existingScores
        .filter(s => s.playerId === Number(selectedPlayerId))
        .map(s => s.holeNumber)
    );
  }, [isGroupMode, existingScores, selectedPlayerId]);


  const handleScoreSubmit = async () => {
    if (!selectedRoundId) return;

    // Force fir to null on par 3 holes
    const isPar3 = currentHoleData?.par === 3;

    try {
      await submitScore.mutateAsync({
        roundId: Number(selectedRoundId),
        playerId: Number(selectedPlayerId),
        holeNumber: currentHole,
        grossScore: strokes,
        isPick9: isPick9,
        gir,
        fir: isPar3 ? null : fir,
        putts,
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

    const isPar3 = currentHoleData?.par === 3;

    try {
      await submitScore.mutateAsync({
        roundId: Number(selectedRoundId),
        playerId,
        holeNumber: currentHole,
        grossScore: playerGroupScore.strokes,
        isPick9: playerGroupScore.isPick9,
        gir: playerGroupScore.gir,
        fir: isPar3 ? null : playerGroupScore.fir,
        putts: playerGroupScore.putts,
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

  const handleNextHole = async () => {
    if (!selectedRoundId || !selectedGroupNumber) return;

    const groupScoresForHole = groupScores[selectedGroupNumber];

    try {
      // Save any unsaved scores for current hole
      if (groupScoresForHole && Object.keys(groupScoresForHole).length > 0) {
        const isPar3 = currentHoleData?.par === 3;
        const promises = Object.entries(groupScoresForHole).map(([playerId, score]) =>
          submitScore.mutateAsync({
            roundId: Number(selectedRoundId),
            playerId: Number(playerId),
            holeNumber: currentHole,
            grossScore: score.strokes,
            isPick9: score.isPick9,
            gir: score.gir,
            fir: isPar3 ? null : score.fir,
            putts: score.putts,
          })
        );

        await Promise.all(promises);

        // Clear all unsaved scores for this group
        setGroupScores(prev => {
          const updated = { ...prev };
          updated[selectedGroupNumber] = {};
          return updated;
        });
      }

      // Advance to next hole
      if (currentHole < 18) {
        setCurrentHole(prev => prev + 1);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save hole",
        variant: "destructive",
      });
    }
  };

  const handlePrevHole = () => {
    if (currentHole > 1) {
      setCurrentHole(prev => prev - 1);
    }
  };

  const handleMatchScoreSubmit = async (playerId: number) => {
    if (!selectedRoundId || !selectedMatchNumber) return;

    const playerMatchScore = matchScores[selectedMatchNumber]?.[playerId]?.[currentHole];
    if (!playerMatchScore) return;

    const isPar3 = currentHoleData?.par === 3;

    try {
      await submitScore.mutateAsync({
        roundId: Number(selectedRoundId),
        playerId,
        holeNumber: currentHole,
        grossScore: playerMatchScore.strokes,
        gir: playerMatchScore.gir,
        fir: isPar3 ? null : playerMatchScore.fir,
        putts: playerMatchScore.putts,
      });

      toast({
        title: "Score Saved",
        description: `Hole ${currentHole} recorded.`,
        variant: "default",
      });

      // Clear the unsaved score
      setMatchScores(prev => {
        const updated = { ...prev };
        if (updated[selectedMatchNumber]?.[playerId]) {
          delete updated[selectedMatchNumber][playerId][currentHole];
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

  const handleFinish = async () => {
    if (!selectedRoundId) return;

    try {
      // For single player mode: save the final score
      const isPar3 = currentHoleData?.par === 3;
      if (!isGroupMode && !isMatchPlayMode && selectedPlayerId) {
        await submitScore.mutateAsync({
          roundId: Number(selectedRoundId),
          playerId: Number(selectedPlayerId),
          holeNumber: currentHole,
          grossScore: strokes,
          isPick9: isPick9,
          gir,
          fir: isPar3 ? null : fir,
          putts,
        });
      }
      // For group mode: save any unsaved scores
      else if (isGroupMode && selectedGroupNumber > 0) {
        const groupScoresForHole = groupScores[selectedGroupNumber];
        if (groupScoresForHole && Object.keys(groupScoresForHole).length > 0) {
          const promises = Object.entries(groupScoresForHole).map(([playerId, score]) =>
            submitScore.mutateAsync({
              roundId: Number(selectedRoundId),
              playerId: Number(playerId),
              holeNumber: currentHole,
              grossScore: score.strokes,
              isPick9: score.isPick9,
              gir: score.gir,
              fir: isPar3 ? null : score.fir,
              putts: score.putts,
            })
          );
          await Promise.all(promises);
        }
      }
      // For match play mode: save any unsaved scores
      else if (isMatchPlayMode && selectedMatchNumber > 0) {
        const matchHoleScores = matchScores[selectedMatchNumber];
        if (matchHoleScores) {
          const promises: Promise<any>[] = [];
          for (const [playerId, holes] of Object.entries(matchHoleScores)) {
            for (const [hole, scoreData] of Object.entries(holes)) {
              const holeNum = Number(hole);
              const holePar3 = roundDetails?.holes.find(h => h.number === holeNum)?.par === 3;
              promises.push(
                submitScore.mutateAsync({
                  roundId: Number(selectedRoundId),
                  playerId: Number(playerId),
                  holeNumber: holeNum,
                  grossScore: scoreData.strokes,
                  gir: scoreData.gir,
                  fir: holePar3 ? null : scoreData.fir,
                  putts: scoreData.putts,
                })
              );
            }
          }
          if (promises.length > 0) {
            await Promise.all(promises);
          }
        }
      }

      toast({
        title: "Round Completed",
        description: "All scores have been saved.",
        variant: "default",
      });

      // Return to round selection screen
      setSelectedGroupNumber(0);
      setSelectedPlayerId("");
      setSelectedMatchNumber(0);
      setCurrentHole(1);
      setCurrentStep('selectRound');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete round",
        variant: "destructive",
      });
    }
  };

  const handleBackToRoundSelection = () => {
    setSelectedGroupNumber(0);
    setSelectedPlayerId("");
    setSelectedMatchNumber(0);
    setCurrentHole(1);
    setCurrentStep('selectRound');
  };

  const handleBackToGroupSelection = () => {
    setCurrentHole(1);
    setCurrentStep('selectGroup');
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

          {/* STEP 1: SELECT ROUND */}
          {currentStep === 'selectRound' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-bold">Select Round</h2>
              <div className="grid grid-cols-1 gap-3">
                {rounds?.map(round => (
                  <Card
                    key={round.id}
                    className="overflow-hidden border-border/50 shadow-md cursor-pointer hover:shadow-lg transition-all"
                    onClick={() => {
                      setSelectedRoundId(String(round.id));
                      setCurrentStep('selectGroup');
                    }}
                  >
                    <div className="h-2 bg-primary/20 w-full" />
                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex gap-2">
                          <Badge variant="outline" className="font-mono text-xs uppercase tracking-wider">
                            Round {round.roundNumber}
                          </Badge>
                        </div>
                        {round.isCompleted ? (
                          <Badge className="bg-slate-200 text-slate-600 hover:bg-slate-300">Completed</Badge>
                        ) : (
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">Upcoming</Badge>
                        )}
                      </div>
                      <div className="text-xl font-display font-bold">
                        {round.course.name}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(round.date), "EEEE MMM d, yyyy (a)")}</span>
                      </div>
                      {round.description && (
                        <div className="text-sm text-slate-600">{round.description}</div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: SELECT MATCH (for match play rounds) OR SELECT GROUP OR PLAYER */}
          {currentStep === 'selectGroup' && selectedRoundId && (() => {
            // Show loading state while pairings/groupings are being fetched
            if ((isMatchPlayMode && matchPairingsLoading) || (!isMatchPlayMode && groupingsLoading)) {
              return (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={handleBackToRoundSelection}>
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Back
                    </Button>
                    <h2 className="text-2xl font-bold">Loading...</h2>
                  </div>
                  <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
                    <CardContent className="p-3">
                      <div className="text-sm text-muted-foreground">Selected Round:</div>
                      <div className="font-semibold">
                        Round {selectedRound?.roundNumber} - {selectedRound?.course.name}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-8 flex justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </CardContent>
                  </Card>
                </div>
              );
            }

            return (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleBackToRoundSelection}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                  <h2 className="text-2xl font-bold">{isMatchPlayMode ? 'Select Match' : isGroupMode ? 'Select Group' : 'Select Player'}</h2>
                </div>

                {/* Show selected round info */}
                <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
                  <CardContent className="p-3">
                    <div className="text-sm text-muted-foreground">Selected Round:</div>
                    <div className="font-semibold">
                      Round {selectedRound?.roundNumber} - {selectedRound?.course.name}
                    </div>
                  </CardContent>
                </Card>

                {/* Match play mode: show match cards */}
                {isMatchPlayMode && (
                  <div className="grid grid-cols-1 gap-3">
                    {matchPairings?.map(match => {
                      const p1 = players?.find(p => p.id === match.player1Id);
                      const p2 = players?.find(p => p.id === match.player2Id);
                      return (
                        <Card
                          key={match.id}
                          className="overflow-hidden border-border/50 shadow-md cursor-pointer hover:shadow-lg transition-all"
                          onClick={() => {
                            setSelectedMatchNumber(match.matchNumber);
                            setCurrentStep('scoring');
                          }}
                        >
                          <div className="h-2 bg-primary/20 w-full" />
                          <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="font-mono text-xs uppercase tracking-wider">
                                Match {match.matchNumber}
                              </Badge>
                              <Badge variant="secondary">1v1</Badge>
                            </div>
                            <div className="flex items-center justify-center gap-4">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: p1?.team?.color || "#999" }}
                                />
                                <div>
                                  <div className="font-semibold">{p1?.name}</div>
                                  <div className="text-xs text-slate-500">HCP {p1?.handicap}</div>
                                </div>
                              </div>
                              <div className="text-muted-foreground font-bold">vs</div>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: p2?.team?.color || "#999" }}
                                />
                                <div>
                                  <div className="font-semibold">{p2?.name}</div>
                                  <div className="text-xs text-slate-500">HCP {p2?.handicap}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Group mode: show group cards */}
                {isGroupMode && (
                  <div className="grid grid-cols-1 gap-3">
                    {groupings?.map(grouping => {
                      const groupPlayers = grouping.players
                        .map(p => players?.find(pl => pl.id === p.playerId))
                        .filter(Boolean);
                      return (
                        <Card
                          key={grouping.id}
                          className="overflow-hidden border-border/50 shadow-md cursor-pointer hover:shadow-lg transition-all"
                          onClick={() => {
                            setSelectedGroupNumber(grouping.groupNumber);
                            setCurrentStep('scoring');
                          }}
                        >
                          <div className="h-2 bg-primary/20 w-full" />
                          <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="font-mono text-xs uppercase tracking-wider">
                                Group {grouping.groupNumber}
                              </Badge>
                              <Badge variant="secondary">{groupPlayers.length} player{groupPlayers.length !== 1 ? 's' : ''}</Badge>
                            </div>
                            {grouping.groupName && (
                              <div className="text-lg font-display font-bold">
                                {grouping.groupName}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                              {groupPlayers.map(player => (
                                player && (
                                  <div key={player.id} className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded text-sm">
                                    <div
                                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: player.team?.color || "#999" }}
                                    />
                                    <span>{player.name}</span>
                                  </div>
                                )
                              ))}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Single player mode: show player cards */}
                {!isGroupMode && (
                  <div className="grid grid-cols-1 gap-3">
                    {players?.map(player => (
                      <Card
                        key={player.id}
                        className="overflow-hidden border-border/50 shadow-md cursor-pointer hover:shadow-lg transition-all"
                        onClick={() => {
                          setSelectedPlayerId(String(player.id));
                          setCurrentStep('scoring');
                        }}
                      >
                        <div className="h-2 bg-primary/20 w-full" />
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1">
                              <div
                                className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: player.team?.color || "#999" }}
                              />
                              <div>
                                <div className="text-lg font-display font-bold">{player.name}</div>
                                <div className="text-xs text-muted-foreground">Handicap {player.handicap}</div>
                              </div>
                            </div>
                            {player.team && (
                              <Badge variant="outline" className="text-xs">{player.team.name}</Badge>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

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

          {/* STEP 3: INPUT SCORES - SINGLE PLAYER MODE */}
          {currentStep === 'scoring' && selectedRoundId && !isGroupMode && selectedPlayerId && currentHoleData && roundHandicaps?.every(h => h.courseHandicap !== null) && (() => {
            const currentPlayerHandicap = roundHandicaps?.find(h => h.playerId === Number(selectedPlayerId));
            const selectedRound = rounds?.find(r => String(r.id) === selectedRoundId);
            const selectedPlayer = players?.find(p => String(p.id) === selectedPlayerId);

            return (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Back button and context */}
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleBackToGroupSelection}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                </div>

                {/* Show selected round and player info */}
                <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
                  <CardContent className="p-3">
                    <div className="text-sm text-muted-foreground">
                      Round {selectedRound?.roundNumber} - {selectedRound?.course.name}
                    </div>
                    <div className="font-semibold">
                      {selectedPlayer?.name}
                    </div>
                  </CardContent>
                </Card>

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

                    <div className="flex flex-col items-center">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={strokes}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          if (!isNaN(v)) setStrokes(Math.min(15, Math.max(1, v)));
                        }}
                        className={clsx(
                          "text-7xl font-bold font-display text-center w-32 bg-transparent border-none outline-none leading-none tracking-tighter",
                          getScoreColor(strokes, currentHoleData.par)
                        )}
                      />
                      <span className="text-xs uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest mt-2 block">
                        Strokes
                      </span>
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

                    {/* Stats Inputs — always visible */}
                    <div className="w-full space-y-3">
                      {/* FIR - hidden on par 3 */}
                      {currentHoleData.par !== 3 && (
                        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/30 px-4 py-3 rounded-lg">
                          <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">FIR</span>
                          <div className="flex gap-2 flex-1 ml-4">
                            <button
                              onClick={() => setFir(fir === true ? null : true)}
                              className={clsx(
                                "flex-1 min-h-[44px] rounded-lg text-lg font-bold transition",
                                fir === true ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-400"
                              )}
                            >
                              &#10003;
                            </button>
                            <button
                              onClick={() => setFir(fir === false ? null : false)}
                              className={clsx(
                                "flex-1 min-h-[44px] rounded-lg text-lg font-bold transition",
                                fir === false ? "bg-red-500 text-white" : "bg-white border border-slate-200 text-slate-400"
                              )}
                            >
                              &#10007;
                            </button>
                          </div>
                        </div>
                      )}

                      {/* GIR */}
                      <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 rounded-lg">
                        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">GIR</span>
                        <div className="flex gap-2 flex-1 ml-4">
                          <button
                            onClick={() => setGir(gir === true ? null : true)}
                            className={clsx(
                              "flex-1 min-h-[44px] rounded-lg text-lg font-bold transition",
                              gir === true ? "bg-emerald-600 text-white" : "bg-white border border-slate-200 text-slate-400"
                            )}
                          >
                            &#10003;
                          </button>
                          <button
                            onClick={() => setGir(gir === false ? null : false)}
                            className={clsx(
                              "flex-1 min-h-[44px] rounded-lg text-lg font-bold transition",
                              gir === false ? "bg-red-500 text-white" : "bg-white border border-slate-200 text-slate-400"
                            )}
                          >
                            &#10007;
                          </button>
                        </div>
                      </div>

                      {/* Putts — quick-tap number row */}
                      <div className="bg-slate-50 dark:bg-slate-800 px-4 py-3 rounded-lg">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">Putts</span>
                        <div className="flex gap-2">
                          {[0, 1, 2, 3].map(n => (
                            <button
                              key={n}
                              onClick={() => setPutts(putts === n ? null : n)}
                              className={clsx(
                                "flex-1 min-h-[44px] rounded-lg text-base font-bold transition",
                                putts === n ? "bg-slate-700 text-white" : "bg-white border border-slate-200 text-slate-600"
                              )}
                            >
                              {n}
                            </button>
                          ))}
                          <button
                            onClick={() => setPutts(putts !== null && putts >= 4 ? putts + 1 : 4)}
                            className={clsx(
                              "flex-1 min-h-[44px] rounded-lg text-base font-bold transition",
                              putts !== null && putts >= 4 ? "bg-slate-700 text-white" : "bg-white border border-slate-200 text-slate-600"
                            )}
                          >
                            {putts !== null && putts > 4 ? putts : '4+'}
                          </button>
                        </div>
                      </div>
                    </div>

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
                  onClick={currentHole === 18 ? handleFinish : handleScoreSubmit}
                  disabled={submitScore.isPending}
                >
                  {submitScore.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : currentHole === 18 ? (
                    <>
                      Finish
                      <CheckCircle2 className="w-5 h-5 ml-2" />
                    </>
                  ) : (
                    "Save Score"
                  )}
                </Button>

              </div>
            );
          })()}

          {/* STEP 3: INPUT SCORES - GROUP MODE */}
          {currentStep === 'scoring' && selectedRoundId && isGroupMode && selectedGroupNumber > 0 && currentHoleData && roundHandicaps?.every(h => h.courseHandicap !== null) && (() => {
            const selectedRound = rounds?.find(r => String(r.id) === selectedRoundId);
            return (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Back button and context */}
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleBackToGroupSelection}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                </div>

                {/* Show selected round and group info */}
                <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
                  <CardContent className="p-3">
                    <div className="text-sm text-muted-foreground">
                      Round {selectedRound?.roundNumber} - {selectedRound?.course.name}
                    </div>
                    <div className="font-semibold">
                      Group {selectedGroupNumber} - {currentGrouping?.groupName || `${playersInGroup.length} players`}
                    </div>
                  </CardContent>
                </Card>

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
                        const isSaved = existingPlayerScore && !playerUnsaved;

                        const playerGir = playerUnsaved?.gir ?? existingPlayerScore?.gir ?? null;
                        const playerFir = playerUnsaved?.fir ?? existingPlayerScore?.fir ?? null;
                        const playerPutts = playerUnsaved?.putts ?? existingPlayerScore?.putts ?? null;

                        const updateGroupStat = (field: 'gir' | 'fir' | 'putts', value: any) => {
                          setGroupScores(prev => {
                            const existing = prev[selectedGroupNumber]?.[player.id];
                            return {
                              ...prev,
                              [selectedGroupNumber]: {
                                ...prev[selectedGroupNumber],
                                [player.id]: {
                                  strokes: existing?.strokes || currentScore || 4,
                                  isPick9: existing?.isPick9 || false,
                                  gir: existing?.gir ?? playerGir,
                                  fir: existing?.fir ?? playerFir,
                                  putts: existing?.putts ?? playerPutts,
                                  [field]: value,
                                }
                              }
                            };
                          });
                        };

                        return (
                          <div key={player.id} className="p-3 hover:bg-slate-50 transition">
                            <div className="flex items-center justify-between gap-3">
                              {/* Player Info */}
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: player.team?.color || "#999" }}
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1">
                                    <div className="text-sm font-semibold truncate">{player.name}</div>
                                    {isSaved && (
                                      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                                    )}
                                  </div>
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
                                          ...prev[selectedGroupNumber]?.[player.id],
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
                                          ...prev[selectedGroupNumber]?.[player.id],
                                          strokes: newStrokes,
                                          isPick9: playerUnsaved?.isPick9 || false
                                        }
                                      }
                                    }));
                                  }}
                                >
                                  +
                                </Button>
                              </div>
                            </div>

                            {/* Compact Stats Row */}
                            <div className="flex items-center gap-2 mt-2 ml-5">
                              {currentHoleData.par !== 3 && (
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-blue-600 font-medium">F</span>
                                  <button
                                    onClick={() => updateGroupStat('fir', playerFir === true ? null : true)}
                                    className={clsx("w-7 h-7 rounded text-xs font-bold transition", playerFir === true ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400")}
                                  >&#10003;</button>
                                  <button
                                    onClick={() => updateGroupStat('fir', playerFir === false ? null : false)}
                                    className={clsx("w-7 h-7 rounded text-xs font-bold transition", playerFir === false ? "bg-red-500 text-white" : "bg-slate-100 text-slate-400")}
                                  >&#10007;</button>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-emerald-600 font-medium">G</span>
                                <button
                                  onClick={() => updateGroupStat('gir', playerGir === true ? null : true)}
                                  className={clsx("w-7 h-7 rounded text-xs font-bold transition", playerGir === true ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400")}
                                >&#10003;</button>
                                <button
                                  onClick={() => updateGroupStat('gir', playerGir === false ? null : false)}
                                  className={clsx("w-7 h-7 rounded text-xs font-bold transition", playerGir === false ? "bg-red-500 text-white" : "bg-slate-100 text-slate-400")}
                                >&#10007;</button>
                              </div>
                              <div className="flex items-center gap-0.5">
                                <span className="text-[10px] text-slate-500 font-medium mr-0.5">P</span>
                                {[0, 1, 2, 3].map(n => (
                                  <button
                                    key={n}
                                    onClick={() => updateGroupStat('putts', playerPutts === n ? null : n)}
                                    className={clsx("w-7 h-7 rounded text-xs font-bold transition", playerPutts === n ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-500")}
                                  >{n}</button>
                                ))}
                                <button
                                  onClick={() => updateGroupStat('putts', playerPutts !== null && playerPutts >= 4 ? playerPutts + 1 : 4)}
                                  className={clsx("w-7 h-7 rounded text-xs font-bold transition", playerPutts !== null && playerPutts >= 4 ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-500")}
                                >{playerPutts !== null && playerPutts > 4 ? playerPutts : '4+'}</button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Navigation Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={handlePrevHole}
                    size="lg"
                    className="flex-1 h-12 text-base font-bold shadow-md"
                    variant="outline"
                    disabled={currentHole === 1}
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Prev Hole
                  </Button>

                  <Button
                    onClick={currentHole === 18 ? handleFinish : handleNextHole}
                    size="lg"
                    className="flex-1 h-12 text-base font-bold shadow-xl bg-gradient-to-r from-primary to-emerald-700 hover:to-emerald-800 transition-all active:scale-[0.98]"
                    disabled={submitScore.isPending}
                  >
                    {submitScore.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : currentHole === 18 ? (
                      <>
                        Finish
                        <CheckCircle2 className="w-5 h-5 ml-2" />
                      </>
                    ) : (
                      <>
                        Next Hole
                        <ChevronRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </div>

              </div>
            );
          })()}

          {/* STEP 3: INPUT SCORES - MATCH PLAY MODE */}
          {currentStep === 'scoring' && selectedRoundId && isMatchPlayMode && selectedMatchNumber > 0 && currentHoleData && roundHandicaps?.every(h => h.courseHandicap !== null) && (() => {
            const selectedRound = rounds?.find(r => String(r.id) === selectedRoundId);

            return (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Back button and context */}
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleBackToGroupSelection}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                </div>

                {/* Show selected round and match info */}
                <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
                  <CardContent className="p-3">
                    <div className="text-sm text-muted-foreground">
                      Round {selectedRound?.roundNumber} - {selectedRound?.course.name}
                    </div>
                    <div className="font-semibold">
                      Match {selectedMatchNumber}: {playersInMatch[0]?.name} vs {playersInMatch[1]?.name}
                    </div>
                  </CardContent>
                </Card>

                {/* Hole Selector Grid */}
                <Card className="border-none shadow-sm bg-white">
                  <CardContent className="p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-2 text-center">
                      Quick Jump to Hole
                    </div>
                    <div className="grid grid-cols-9 gap-1.5 mb-1.5">
                      {Array.from({ length: 9 }, (_, i) => i + 1).map(hole => {
                        const p1Scored = playersInMatch[0] && existingScores?.some(s => s.playerId === playersInMatch[0].id && s.holeNumber === hole);
                        const p2Scored = playersInMatch[1] && existingScores?.some(s => s.playerId === playersInMatch[1].id && s.holeNumber === hole);
                        const bothScored = p1Scored && p2Scored;
                        return (
                          <HoleButton
                            key={hole}
                            holeNumber={hole}
                            isActive={currentHole === hole}
                            isScored={bothScored}
                          />
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-9 gap-1.5">
                      {Array.from({ length: 9 }, (_, i) => i + 10).map(hole => {
                        const p1Scored = playersInMatch[0] && existingScores?.some(s => s.playerId === playersInMatch[0].id && s.holeNumber === hole);
                        const p2Scored = playersInMatch[1] && existingScores?.some(s => s.playerId === playersInMatch[1].id && s.holeNumber === hole);
                        const bothScored = p1Scored && p2Scored;
                        return (
                          <HoleButton
                            key={hole}
                            holeNumber={hole}
                            isActive={currentHole === hole}
                            isScored={bothScored}
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

                {/* Match Play Scoring - Split Screen */}
                <Card className="border-none shadow-sm bg-white overflow-hidden">
                  <CardContent className="p-0">
                    <div className="divide-x">
                      {playersInMatch.map((player, idx) => {
                        const existingPlayerScore = existingScores?.find(s => s.playerId === player.id && s.holeNumber === currentHole);
                        const playerUnsaved = matchScores[selectedMatchNumber]?.[player.id]?.[currentHole];
                        const currentScore = playerUnsaved?.strokes ?? (existingPlayerScore?.grossScore) ?? 0;
                        const scoreColor = getScoreColor(currentScore, currentHoleData.par);
                        const isSaved = existingPlayerScore && !playerUnsaved;

                        const playerGir = playerUnsaved?.gir ?? existingPlayerScore?.gir ?? null;
                        const playerFir = playerUnsaved?.fir ?? existingPlayerScore?.fir ?? null;
                        const playerPutts = playerUnsaved?.putts ?? existingPlayerScore?.putts ?? null;

                        const updateMatchStat = (field: 'gir' | 'fir' | 'putts', value: any) => {
                          setMatchScores(prev => {
                            const existing = prev[selectedMatchNumber]?.[player.id]?.[currentHole];
                            return {
                              ...prev,
                              [selectedMatchNumber]: {
                                ...prev[selectedMatchNumber],
                                [player.id]: {
                                  ...(prev[selectedMatchNumber]?.[player.id] || {}),
                                  [currentHole]: {
                                    strokes: existing?.strokes ?? (currentScore || 4),
                                    gir: existing?.gir ?? playerGir,
                                    fir: existing?.fir ?? playerFir,
                                    putts: existing?.putts ?? playerPutts,
                                    [field]: value,
                                  }
                                }
                              }
                            };
                          });
                        };

                        return (
                          <div key={player.id} className="p-4 space-y-4 flex-1">
                            {/* Player Header */}
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: player.team?.color || "#999" }}
                              />
                              <div>
                                <div className="flex items-center gap-1">
                                  <div className="text-sm font-semibold">{player.name}</div>
                                  {isSaved && (
                                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                                  )}
                                </div>
                                <div className="text-xs text-slate-500">HCP {player.handicap}</div>
                              </div>
                            </div>

                            {/* Score Controls */}
                            <div className="flex items-center justify-center gap-4">
                              <Button
                                variant="outline"
                                className="h-12 w-12 rounded-full border-2 text-2xl font-light"
                                onClick={() => {
                                  const base = playerUnsaved?.strokes ?? (currentScore || 4);
                                  const newStrokes = Math.max(1, base - 1);
                                  setMatchScores(prev => ({
                                    ...prev,
                                    [selectedMatchNumber]: {
                                      ...prev[selectedMatchNumber],
                                      [player.id]: {
                                        ...(prev[selectedMatchNumber]?.[player.id] || {}),
                                        [currentHole]: {
                                          ...prev[selectedMatchNumber]?.[player.id]?.[currentHole],
                                          strokes: newStrokes,
                                        }
                                      }
                                    }
                                  }));
                                }}
                              >
                                −
                              </Button>

                              <div className={clsx(
                                "w-16 text-center font-bold text-2xl",
                                scoreColor
                              )}>
                                {currentScore || "-"}
                              </div>

                              <Button
                                variant="outline"
                                className="h-12 w-12 rounded-full border-2 text-2xl font-light"
                                onClick={() => {
                                  const base = playerUnsaved?.strokes ?? (currentScore || 4);
                                  const newStrokes = Math.min(15, base + 1);
                                  setMatchScores(prev => ({
                                    ...prev,
                                    [selectedMatchNumber]: {
                                      ...prev[selectedMatchNumber],
                                      [player.id]: {
                                        ...(prev[selectedMatchNumber]?.[player.id] || {}),
                                        [currentHole]: {
                                          ...prev[selectedMatchNumber]?.[player.id]?.[currentHole],
                                          strokes: newStrokes,
                                        }
                                      }
                                    }
                                  }));
                                }}
                              >
                                +
                              </Button>
                            </div>

                            {/* Compact Stats */}
                            <div className="flex items-center justify-center gap-2">
                              {currentHoleData.par !== 3 && (
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-blue-600 font-medium">F</span>
                                  <button
                                    onClick={() => updateMatchStat('fir', playerFir === true ? null : true)}
                                    className={clsx("w-7 h-7 rounded text-xs font-bold transition", playerFir === true ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400")}
                                  >&#10003;</button>
                                  <button
                                    onClick={() => updateMatchStat('fir', playerFir === false ? null : false)}
                                    className={clsx("w-7 h-7 rounded text-xs font-bold transition", playerFir === false ? "bg-red-500 text-white" : "bg-slate-100 text-slate-400")}
                                  >&#10007;</button>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-emerald-600 font-medium">G</span>
                                <button
                                  onClick={() => updateMatchStat('gir', playerGir === true ? null : true)}
                                  className={clsx("w-7 h-7 rounded text-xs font-bold transition", playerGir === true ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400")}
                                >&#10003;</button>
                                <button
                                  onClick={() => updateMatchStat('gir', playerGir === false ? null : false)}
                                  className={clsx("w-7 h-7 rounded text-xs font-bold transition", playerGir === false ? "bg-red-500 text-white" : "bg-slate-100 text-slate-400")}
                                >&#10007;</button>
                              </div>
                              <div className="flex items-center gap-0.5">
                                <span className="text-[10px] text-slate-500 font-medium mr-0.5">P</span>
                                {[0, 1, 2, 3].map(n => (
                                  <button
                                    key={n}
                                    onClick={() => updateMatchStat('putts', playerPutts === n ? null : n)}
                                    className={clsx("w-7 h-7 rounded text-xs font-bold transition", playerPutts === n ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-500")}
                                  >{n}</button>
                                ))}
                                <button
                                  onClick={() => updateMatchStat('putts', playerPutts !== null && playerPutts >= 4 ? playerPutts + 1 : 4)}
                                  className={clsx("w-7 h-7 rounded text-xs font-bold transition", playerPutts !== null && playerPutts >= 4 ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-500")}
                                >{playerPutts !== null && playerPutts > 4 ? playerPutts : '4+'}</button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Navigation Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={handlePrevHole}
                    size="lg"
                    className="flex-1 h-12 text-base font-bold shadow-md"
                    variant="outline"
                    disabled={currentHole === 1}
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Prev Hole
                  </Button>

                  <Button
                    onClick={currentHole === 18 ? handleFinish : () => {
                      // Save any unsaved scores before moving to next hole
                      if (playersInMatch[0]) handleMatchScoreSubmit(playersInMatch[0].id);
                      if (playersInMatch[1]) handleMatchScoreSubmit(playersInMatch[1].id);
                      if (currentHole < 18) setCurrentHole(currentHole + 1);
                    }}
                    size="lg"
                    className="flex-1 h-12 text-base font-bold shadow-xl bg-gradient-to-r from-primary to-emerald-700 hover:to-emerald-800 transition-all active:scale-[0.98]"
                    disabled={submitScore.isPending}
                  >
                    {submitScore.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : currentHole === 18 ? (
                      <>
                        Finish
                        <CheckCircle2 className="w-5 h-5 ml-2" />
                      </>
                    ) : (
                      <>
                        Next Hole
                        <ChevronRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })()}

          {currentStep === 'selectRound' && !selectedRoundId && (
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
