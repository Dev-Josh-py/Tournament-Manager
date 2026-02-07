import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useRounds, usePlayers, useRoundGroupings, useUpsertGroupings, useDeleteGroupings } from "@/hooks/use-tournament";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/Navigation";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Plus, Trash2, Save, RotateCcw } from "lucide-react";

interface GroupFormData {
  groupNumber: number;
  groupName: string;
  playerIds: number[];
}

export default function GroupingSetup() {
  const [location] = useLocation();
  const [selectedRoundId, setSelectedRoundId] = useState<string>("");
  const [groups, setGroups] = useState<GroupFormData[]>([]);
  const [nextGroupNumber, setNextGroupNumber] = useState<number>(1);

  const { data: rounds } = useRounds();
  const { data: players } = usePlayers();
  const { data: existingGroupings, isLoading: isLoadingGroupings } = useRoundGroupings(Number(selectedRoundId));
  const upsertGroupings = useUpsertGroupings();
  const deleteGroupings = useDeleteGroupings();
  const { toast } = useToast();

  // Parse round from URL params if present
  React.useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1] || "");
    const roundParam = params.get("round");
    if (roundParam) {
      setSelectedRoundId(roundParam);
    }
  }, [location]);

  // Load existing groupings when round is selected
  React.useEffect(() => {
    if (Number(selectedRoundId) && existingGroupings) {
      const loadedGroups: GroupFormData[] = existingGroupings.map(g => ({
        groupNumber: g.groupNumber,
        groupName: g.groupName || "",
        playerIds: g.players.map(p => p.playerId),
      }));
      setGroups(loadedGroups);
      setNextGroupNumber((loadedGroups.length > 0 ? Math.max(...loadedGroups.map(g => g.groupNumber)) : 0) + 1);
    }
  }, [existingGroupings, selectedRoundId]);

  const allAssignedPlayerIds = useMemo(() => {
    return groups.flatMap(g => g.playerIds);
  }, [groups]);

  const unassignedPlayers = useMemo(() => {
    if (!players) return [];
    return players.filter(p => !allAssignedPlayerIds.includes(p.id));
  }, [players, allAssignedPlayerIds]);

  const addGroup = () => {
    setGroups([...groups, {
      groupNumber: nextGroupNumber,
      groupName: "",
      playerIds: [],
    }]);
    setNextGroupNumber(nextGroupNumber + 1);
  };

  const removeGroup = (groupNumber: number) => {
    setGroups(groups.filter(g => g.groupNumber !== groupNumber));
  };

  const addPlayerToGroup = (groupNumber: number, playerId: number) => {
    setGroups(groups.map(g => {
      if (g.groupNumber === groupNumber) {
        return { ...g, playerIds: [...g.playerIds, playerId] };
      }
      return g;
    }));
  };

  const removePlayerFromGroup = (groupNumber: number, playerId: number) => {
    setGroups(groups.map(g => {
      if (g.groupNumber === groupNumber) {
        return { ...g, playerIds: g.playerIds.filter(id => id !== playerId) };
      }
      return g;
    }));
  };

  const handleSaveGroupings = async () => {
    if (!selectedRoundId) {
      toast({
        title: "Error",
        description: "Please select a round first",
        variant: "destructive",
      });
      return;
    }

    // Validation: ensure group numbers are sequential
    const groupNumbers = groups.map(g => g.groupNumber).sort((a, b) => a - b);
    for (let i = 0; i < groupNumbers.length; i++) {
      if (groupNumbers[i] !== i + 1) {
        toast({
          title: "Error",
          description: "Group numbers must be sequential starting from 1",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      await upsertGroupings.mutateAsync({
        roundId: Number(selectedRoundId),
        groupings: groups.map(g => ({
          groupNumber: g.groupNumber,
          groupName: g.groupName || undefined,
          playerIds: g.playerIds,
        })),
      });

      toast({
        title: "Success",
        description: "Groupings saved successfully",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save groupings",
        variant: "destructive",
      });
    }
  };

  const handleClearGroupings = async () => {
    if (!selectedRoundId) return;

    if (!confirm("Are you sure you want to clear all groupings for this round?")) {
      return;
    }

    try {
      await deleteGroupings.mutateAsync(Number(selectedRoundId));
      setGroups([]);
      setNextGroupNumber(1);

      toast({
        title: "Success",
        description: "Groupings cleared",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to clear groupings",
        variant: "destructive",
      });
    }
  };

  const getPlayerName = (playerId: number) => {
    return players?.find(p => p.id === playerId)?.name || "Unknown";
  };

  const getPlayerTeamColor = (playerId: number) => {
    const player = players?.find(p => p.id === playerId);
    return player?.team?.color || "#999";
  };

  return (
    <PageTransition>
      <Header />
      <main className="flex-1 overflow-auto pb-20">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Configure Groupings</h1>
            <p className="text-slate-600">Create player groupings for this round to enable group scoring mode.</p>
          </div>

          {/* Round Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Select Round</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedRoundId} onValueChange={setSelectedRoundId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a round" />
                </SelectTrigger>
                <SelectContent>
                  {rounds?.map(round => (
                    <SelectItem key={round.id} value={String(round.id)}>
                      Round {round.roundNumber}: {round.date} - {round.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedRoundId && (
            <>
              {/* Unassigned Players */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span>Available Players</span>
                    {unassignedPlayers.length === 0 && (
                      <Badge variant="default">All assigned</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {unassignedPlayers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {unassignedPlayers.map(player => (
                        <div
                          key={player.id}
                          className="flex items-center justify-between p-3 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 transition"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: getPlayerTeamColor(player.id) }}
                            />
                            <div>
                              <div className="font-medium">{player.name}</div>
                              <div className="text-xs text-slate-600">{player.team?.name}</div>
                            </div>
                          </div>
                          <div className="text-xs bg-white px-2 py-1 rounded">
                            HCP: {player.handicap}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      All players assigned to groups
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Groups */}
              <div className="space-y-4">
                {groups.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8">
                        <p className="text-slate-500 mb-4">No groups created yet</p>
                        <Button onClick={addGroup} variant="outline">
                          <Plus className="w-4 h-4 mr-2" />
                          Create First Group
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  groups.map(group => (
                    <Card key={group.groupNumber}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <div className="flex-1">
                          <CardTitle className="text-lg">
                            Group {group.groupNumber}
                            <Badge variant="secondary" className="ml-2">
                              {group.playerIds.length} player{group.playerIds.length !== 1 ? 's' : ''}
                            </Badge>
                          </CardTitle>
                          <input
                            type="text"
                            placeholder="Optional group name"
                            value={group.groupName}
                            onChange={(e) => {
                              setGroups(groups.map(g =>
                                g.groupNumber === group.groupNumber
                                  ? { ...g, groupName: e.target.value }
                                  : g
                              ));
                            }}
                            className="mt-2 w-full px-2 py-1 border border-slate-300 rounded text-sm"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeGroup(group.groupNumber)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Players in this group */}
                        {group.playerIds.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-semibold text-slate-600">Players in this group:</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {group.playerIds.map(playerId => (
                                <div
                                  key={playerId}
                                  className="flex items-center justify-between p-3 rounded bg-blue-50 border border-blue-200"
                                >
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: getPlayerTeamColor(playerId) }}
                                    />
                                    <span className="font-medium">{getPlayerName(playerId)}</span>
                                  </div>
                                  <button
                                    onClick={() => removePlayerFromGroup(group.groupNumber, playerId)}
                                    className="text-red-600 hover:text-red-700 text-sm"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Available players to add */}
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-slate-600">Add player:</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {unassignedPlayers.map(player => (
                              <button
                                key={player.id}
                                onClick={() => addPlayerToGroup(group.groupNumber, player.id)}
                                className="flex items-center gap-3 p-3 rounded border border-slate-200 bg-white hover:bg-slate-50 transition text-left"
                              >
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: getPlayerTeamColor(player.id) }}
                                />
                                <div className="flex-1">
                                  <div className="text-sm font-medium">{player.name}</div>
                                  <div className="text-xs text-slate-500">{player.team?.name}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                          {unassignedPlayers.length === 0 && (
                            <div className="text-sm text-slate-500 py-2">No unassigned players</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 sticky bottom-20 bg-white p-4 rounded border">
                <Button onClick={addGroup} variant="outline" className="flex-1">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Group
                </Button>
                <Button
                  onClick={handleSaveGroupings}
                  disabled={groups.length === 0 || upsertGroupings.isPending}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Groupings
                </Button>
                <Button
                  onClick={handleClearGroupings}
                  variant="destructive"
                  disabled={groups.length === 0 || deleteGroupings.isPending}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
      <BottomNav />
    </PageTransition>
  );
}
