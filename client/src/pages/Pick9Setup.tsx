import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useRounds, usePlayers, usePick9Assignments, useUpsertPick9Assignments } from "@/hooks/use-tournament";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/Navigation";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Save, RotateCcw } from "lucide-react";

interface Pick9FormData {
  playerId: number;
  holeRange: "1-9" | "10-18" | null;
}

export default function Pick9Setup() {
  const [location] = useLocation();
  const [selectedRoundId, setSelectedRoundId] = useState<string>("");
  const [assignments, setAssignments] = useState<Pick9FormData[]>([]);

  const { data: rounds } = useRounds();
  const { data: players } = usePlayers();
  const { data: existingAssignments, isLoading: isLoadingAssignments } = usePick9Assignments(Number(selectedRoundId));
  const upsertPick9Assignments = useUpsertPick9Assignments();
  const { toast } = useToast();

  // Parse round from URL params if present
  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1] || "");
    const roundParam = params.get("round");
    if (roundParam) {
      setSelectedRoundId(roundParam);
    }
  }, [location]);

  // Initialize assignments when round is selected
  useEffect(() => {
    if (Number(selectedRoundId) && players) {
      if (existingAssignments && existingAssignments.length > 0) {
        // Load existing assignments
        const loadedAssignments: Pick9FormData[] = players.map(p => {
          const existing = existingAssignments.find(a => a.playerId === p.id);
          return {
            playerId: p.id,
            holeRange: (existing?.holeRange as "1-9" | "10-18") || null,
          };
        });
        setAssignments(loadedAssignments);
      } else {
        // Initialize empty assignments for all players
        setAssignments(players.map(p => ({
          playerId: p.id,
          holeRange: null,
        })));
      }
    }
  }, [Number(selectedRoundId), players, existingAssignments]);

  const updateAssignment = (playerId: number, holeRange: "1-9" | "10-18" | null) => {
    setAssignments(assignments.map(a => {
      if (a.playerId === playerId) {
        return { ...a, holeRange };
      }
      return a;
    }));
  };

  const handleSaveAssignments = async () => {
    if (!selectedRoundId) {
      toast({
        title: "Error",
        description: "Please select a round first",
        variant: "destructive",
      });
      return;
    }

    // Validation: ensure all players have a hole range assigned
    const unassignedPlayers = assignments.filter(a => !a.holeRange);
    if (unassignedPlayers.length > 0) {
      toast({
        title: "Error",
        description: `${unassignedPlayers.length} player(s) need a hole range assignment`,
        variant: "destructive",
      });
      return;
    }

    // Validation: ensure front 9 and back 9 are balanced (each team should have one of each)
    const playerTeamMap = new Map<number, number>();
    players?.forEach(p => {
      if (p.team) playerTeamMap.set(p.id, p.team.id);
    });

    const teamHoleRanges = new Map<number, Set<string>>();
    assignments.forEach(a => {
      const teamId = playerTeamMap.get(a.playerId);
      if (teamId && a.holeRange) {
        if (!teamHoleRanges.has(teamId)) {
          teamHoleRanges.set(teamId, new Set());
        }
        teamHoleRanges.get(teamId)!.add(a.holeRange);
      }
    });

    // Check that each team has both front 9 and back 9
    for (const [teamId, ranges] of teamHoleRanges) {
      if (ranges.size !== 2) {
        const team = players?.find(p => p.team?.id === teamId)?.team?.name;
        toast({
          title: "Error",
          description: `${team}: Must have one player on front 9 and one on back 9`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      await upsertPick9Assignments.mutateAsync({
        roundId: Number(selectedRoundId),
        assignments: assignments.map(a => ({
          playerId: a.playerId,
          holeRange: a.holeRange!,
        })),
      });

      toast({
        title: "Success",
        description: "Pick 9 assignments saved successfully",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save assignments",
        variant: "destructive",
      });
    }
  };

  const handleClearAssignments = () => {
    if (!confirm("Are you sure you want to clear all Pick 9 assignments?")) {
      return;
    }

    setAssignments(assignments.map(a => ({
      ...a,
      holeRange: null,
    })));

    toast({
      title: "Cleared",
      description: "All assignments have been cleared",
      variant: "default",
    });
  };

  const selectedRound = rounds?.find(r => r.id === Number(selectedRoundId));
  const isPick9Round = selectedRound?.formatType === 'pick_9';
  const isScrambleRound = selectedRound?.formatType === 'team_scramble';
  const isSupportedRound = isPick9Round || isScrambleRound;

  const front9Count = assignments.filter(a => a.holeRange === "1-9").length;
  const back9Count = assignments.filter(a => a.holeRange === "10-18").length;
  const unassignedCount = assignments.filter(a => !a.holeRange).length;

  // For scramble: current selection (all players same range)
  const scrambleRange = isScrambleRound && assignments.length > 0 && assignments[0].holeRange
    ? assignments[0].holeRange
    : null;

  const handleScrambleRangeSelect = (range: "1-9" | "10-18") => {
    setAssignments(assignments.map(a => ({ ...a, holeRange: range })));
  };

  const handleSaveScrambleAssignments = async () => {
    if (!selectedRoundId || !scrambleRange) {
      toast({
        title: "Error",
        description: "Please select Front 9 or Back 9",
        variant: "destructive",
      });
      return;
    }

    try {
      await upsertPick9Assignments.mutateAsync({
        roundId: Number(selectedRoundId),
        assignments: assignments.map(a => ({
          playerId: a.playerId,
          holeRange: a.holeRange!,
        })),
      });

      toast({
        title: "Success",
        description: "9-hole selection saved successfully",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save assignments",
        variant: "destructive",
      });
    }
  };

  // Group players by team for display
  const playersByTeam = useMemo(() => {
    const grouped = new Map<string, typeof players>();
    players?.forEach(p => {
      const teamName = p.team?.name || "No Team";
      if (!grouped.has(teamName)) {
        grouped.set(teamName, []);
      }
      grouped.get(teamName)!.push(p);
    });
    return grouped;
  }, [players]);

  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Header title="Pick 9 Setup" />

        <main className="flex-1 p-4 pb-24 max-w-2xl mx-auto w-full">
          {/* Round Selection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Select Round</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedRoundId} onValueChange={setSelectedRoundId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a round..." />
                </SelectTrigger>
                <SelectContent>
                  {rounds?.filter(r => r.formatType === 'pick_9' || r.formatType === 'team_scramble').map(round => (
                    <SelectItem key={round.id} value={String(round.id)}>
                      Round {round.roundNumber}: {round.date}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {!isSupportedRound && selectedRoundId && (
            <Card className="mb-6 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
              <CardContent className="pt-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-300">Not a Pick 9 / Scramble Round</p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">This round is not configured for 9-hole selection.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scramble round: simple Front/Back 9 toggle */}
          {selectedRoundId && isScrambleRound && (
            <>
              <Card className="mb-6 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                <CardContent className="pt-6 space-y-2">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Team Scramble - Select 9 Holes</p>
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    All teams will play the same 9 holes. Choose Front 9 or Back 9.
                  </p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <Button
                  onClick={() => handleScrambleRangeSelect("1-9")}
                  variant={scrambleRange === "1-9" ? "default" : "outline"}
                  className={`h-20 text-lg font-bold ${scrambleRange === "1-9" ? "bg-primary text-white" : ""}`}
                >
                  Front 9
                  <br />
                  <span className="text-xs font-normal">Holes 1-9</span>
                </Button>
                <Button
                  onClick={() => handleScrambleRangeSelect("10-18")}
                  variant={scrambleRange === "10-18" ? "default" : "outline"}
                  className={`h-20 text-lg font-bold ${scrambleRange === "10-18" ? "bg-primary text-white" : ""}`}
                >
                  Back 9
                  <br />
                  <span className="text-xs font-normal">Holes 10-18</span>
                </Button>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSaveScrambleAssignments}
                  disabled={!scrambleRange || upsertPick9Assignments.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Selection
                </Button>
              </div>
            </>
          )}

          {selectedRoundId && isPick9Round && (
            <>
              {/* Info */}
              <Card className="mb-6 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                <CardContent className="pt-6 space-y-2">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Assignment Status</p>
                  <div className="flex gap-4 text-xs text-blue-700 dark:text-blue-400">
                    <span>Front 9: <strong>{front9Count}</strong></span>
                    <span>Back 9: <strong>{back9Count}</strong></span>
                    <span>Unassigned: <strong>{unassignedCount}</strong></span>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
                    Each team must have one player on holes 1-9 and one on holes 10-18.
                  </p>
                </CardContent>
              </Card>

              {/* Players by Team */}
              <div className="space-y-6 mb-6">
                {Array.from(playersByTeam.entries()).map(([teamName, teamPlayers]) => (
                  <Card key={teamName} className="border-slate-200 dark:border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{teamName}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {teamPlayers?.map(player => {
                        const assignment = assignments.find(a => a.playerId === player.id);
                        return (
                          <div key={player.id} className="flex items-center gap-3">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{player.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Handicap: {String(player.handicap)}</p>
                            </div>
                            <Select
                              value={assignment?.holeRange || ""}
                              onValueChange={(val) =>
                                updateAssignment(player.id, val as "1-9" | "10-18" | null)
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue placeholder="Select range..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1-9">Front 9 (1-9)</SelectItem>
                                <SelectItem value="10-18">Back 9 (10-18)</SelectItem>
                              </SelectContent>
                            </Select>
                            {assignment?.holeRange && (
                              <Badge variant={assignment.holeRange === "1-9" ? "default" : "secondary"}>
                                {assignment.holeRange}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleSaveAssignments}
                  disabled={unassignedCount > 0 || upsertPick9Assignments.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Assignments
                </Button>
                <Button
                  onClick={handleClearAssignments}
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              </div>
            </>
          )}
        </main>

        <BottomNav />
      </div>
    </PageTransition>
  );
}
