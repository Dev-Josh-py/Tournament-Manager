import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useRounds, usePlayers, useMatchPairings, useUpsertMatchPairings, useDeleteMatchPairings } from "@/hooks/use-tournament";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/Navigation";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Plus, Trash2, Save, RotateCcw } from "lucide-react";

interface MatchFormData {
  matchNumber: number;
  player1Id: number | null;
  player2Id: number | null;
}

export default function MatchPairingSetup() {
  const [location] = useLocation();
  const [selectedRoundId, setSelectedRoundId] = useState<string>("");
  const [matches, setMatches] = useState<MatchFormData[]>([]);
  const [nextMatchNumber, setNextMatchNumber] = useState<number>(1);

  const { data: rounds } = useRounds();
  const { data: players } = usePlayers();
  const { data: existingPairings, isLoading: isLoadingPairings } = useMatchPairings(Number(selectedRoundId));
  const upsertMatchPairings = useUpsertMatchPairings();
  const deleteMatchPairings = useDeleteMatchPairings();
  const { toast } = useToast();

  // Parse round from URL params if present
  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1] || "");
    const roundParam = params.get("round");
    if (roundParam) {
      setSelectedRoundId(roundParam);
    }
  }, [location]);

  // Load existing pairings when round is selected
  useEffect(() => {
    if (Number(selectedRoundId) && existingPairings) {
      const loadedMatches: MatchFormData[] = existingPairings.map(p => ({
        matchNumber: p.matchNumber,
        player1Id: p.player1Id,
        player2Id: p.player2Id,
      }));
      setMatches(loadedMatches);
      setNextMatchNumber((loadedMatches.length > 0 ? Math.max(...loadedMatches.map(m => m.matchNumber)) : 0) + 1);
    }
  }, [existingPairings, selectedRoundId]);

  const allAssignedPlayerIds = useMemo(() => {
    return matches.flatMap(m => [m.player1Id, m.player2Id]).filter((id): id is number => id !== null);
  }, [matches]);

  const unassignedPlayers = useMemo(() => {
    if (!players) return [];
    return players.filter(p => !allAssignedPlayerIds.includes(p.id));
  }, [players, allAssignedPlayerIds]);

  const addMatch = () => {
    setMatches([...matches, {
      matchNumber: nextMatchNumber,
      player1Id: null,
      player2Id: null,
    }]);
    setNextMatchNumber(nextMatchNumber + 1);
  };

  const removeMatch = (matchNumber: number) => {
    setMatches(matches.filter(m => m.matchNumber !== matchNumber));
  };

  const updateMatch = (matchNumber: number, player1Id: number | null, player2Id: number | null) => {
    setMatches(matches.map(m => {
      if (m.matchNumber === matchNumber) {
        return { ...m, player1Id, player2Id };
      }
      return m;
    }));
  };

  const handleSaveMatchPairings = async () => {
    if (!selectedRoundId) {
      toast({
        title: "Error",
        description: "Please select a round first",
        variant: "destructive",
      });
      return;
    }

    // Validation: ensure all matches have both players assigned
    const incompleteMatches = matches.filter(m => !m.player1Id || !m.player2Id);
    if (incompleteMatches.length > 0) {
      toast({
        title: "Error",
        description: "All matches must have both players assigned",
        variant: "destructive",
      });
      return;
    }

    // Validation: ensure match numbers are sequential
    const matchNumbers = matches.map(m => m.matchNumber).sort((a, b) => a - b);
    for (let i = 0; i < matchNumbers.length; i++) {
      if (matchNumbers[i] !== i + 1) {
        toast({
          title: "Error",
          description: "Match numbers must be sequential starting from 1",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      await upsertMatchPairings.mutateAsync({
        roundId: Number(selectedRoundId),
        pairings: matches.map(m => ({
          matchNumber: m.matchNumber,
          player1Id: m.player1Id!,
          player2Id: m.player2Id!,
        })),
      });

      toast({
        title: "Success",
        description: "Match pairings saved successfully",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save match pairings",
        variant: "destructive",
      });
    }
  };

  const handleClearMatchPairings = async () => {
    if (!selectedRoundId) return;

    if (!confirm("Are you sure you want to clear all match pairings for this round?")) {
      return;
    }

    try {
      await deleteMatchPairings.mutateAsync(Number(selectedRoundId));

      setMatches([]);
      setNextMatchNumber(1);

      toast({
        title: "Success",
        description: "Match pairings cleared",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to clear match pairings",
        variant: "destructive",
      });
    }
  };

  const selectedRound = rounds?.find(r => r.id === Number(selectedRoundId));
  const isMatchPlayRound = selectedRound?.formatType === 'individual_match_play';

  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Header title="Match Pairing Setup" />

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
                  {rounds?.filter(r => r.formatType === 'individual_match_play').map(round => (
                    <SelectItem key={round.id} value={String(round.id)}>
                      Round {round.roundNumber}: {round.date}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {!isMatchPlayRound && selectedRoundId && (
            <Card className="mb-6 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
              <CardContent className="pt-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">Not a Match Play Round</p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-200 mt-1">This round is not configured as a match play round.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedRoundId && isMatchPlayRound && (
            <>
              {/* Info */}
              <Card className="mb-6 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                <CardContent className="pt-6">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    Create match pairings for {matches.length > 0 ? `${Math.ceil(6 / 2)}` : '3'} matches (2 players per match).
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-200 mt-2">
                    Unassigned players: {unassignedPlayers.length}
                  </p>
                </CardContent>
              </Card>

              {/* Matches */}
              <div className="space-y-4 mb-6">
                {matches.map((match) => (
                  <Card key={match.matchNumber} className="border-slate-200 dark:border-slate-700">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Match {match.matchNumber}</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMatch(match.matchNumber)}
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Player 1 */}
                      <div>
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Player 1</label>
                        <Select
                          value={String(match.player1Id || "")}
                          onValueChange={(val) => updateMatch(match.matchNumber, val ? Number(val) : null, match.player2Id)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select player..." />
                          </SelectTrigger>
                          <SelectContent>
                            {players?.map(player => (
                              <SelectItem key={player.id} value={String(player.id)}>
                                {player.name} {player.team ? `(${player.team.name})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {match.player1Id && (
                          <div className="mt-2">
                            <Badge variant="secondary">
                              {players?.find(p => p.id === match.player1Id)?.name}
                            </Badge>
                            {match.player1Id && match.player2Id === match.player1Id && (
                              <Badge variant="destructive" className="ml-2">Duplicate</Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Player 2 */}
                      <div>
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Player 2</label>
                        <Select
                          value={String(match.player2Id || "")}
                          onValueChange={(val) => updateMatch(match.matchNumber, match.player1Id, val ? Number(val) : null)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select player..." />
                          </SelectTrigger>
                          <SelectContent>
                            {players?.map(player => (
                              <SelectItem key={player.id} value={String(player.id)}>
                                {player.name} {player.team ? `(${player.team.name})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {match.player2Id && (
                          <div className="mt-2">
                            <Badge variant="secondary">
                              {players?.find(p => p.id === match.player2Id)?.name}
                            </Badge>
                            {match.player1Id && match.player2Id === match.player1Id && (
                              <Badge variant="destructive" className="ml-2">Duplicate</Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Add Match Button */}
              <Button
                onClick={addMatch}
                variant="outline"
                className="w-full mb-6"
                disabled={matches.length >= 3}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Match {matches.length < 3 ? `(${3 - matches.length} remaining)` : "(Maximum reached)"}
              </Button>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleSaveMatchPairings}
                  disabled={matches.length === 0 || upsertMatchPairings.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Pairings
                </Button>
                <Button
                  onClick={handleClearMatchPairings}
                  variant="outline"
                  disabled={matches.length === 0 || deleteMatchPairings.isPending}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
