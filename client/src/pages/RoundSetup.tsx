import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useRounds, useRoundHandicaps, useUpdateRoundHandicaps } from "@/hooks/use-tournament";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Settings } from "lucide-react";

export default function RoundSetup() {
  const [location] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1]);
  const roundIdFromUrl = urlParams.get('round');

  const [selectedRoundId, setSelectedRoundId] = useState<string>(roundIdFromUrl || "");
  const { data: rounds } = useRounds();
  const { data: roundHandicaps } = useRoundHandicaps(Number(selectedRoundId));
  const updateHandicaps = useUpdateRoundHandicaps();
  const { toast } = useToast();

  const [handicapValues, setHandicapValues] = useState<Record<number, number>>({});

  // Initialize values when data loads
  useEffect(() => {
    if (roundHandicaps) {
      const initialValues: Record<number, number> = {};
      roundHandicaps.forEach(h => {
        // Only set if courseHandicap is set (not null)
        if (h.courseHandicap !== null && h.courseHandicap !== undefined) {
          initialValues[h.playerId] = h.courseHandicap;
        }
      });
      setHandicapValues(initialValues);
    }
  }, [roundHandicaps]);

  const handleSave = async () => {
    if (!selectedRoundId) return;

    const updates = Object.entries(handicapValues).map(([playerId, courseHandicap]) => ({
      playerId: Number(playerId),
      courseHandicap,
    }));

    try {
      await updateHandicaps.mutateAsync({
        roundId: Number(selectedRoundId),
        handicaps: updates,
      });

      toast({
        title: "Handicaps Saved",
        description: `Updated course handicaps for all players in this round.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save handicaps",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (playerId: number, value: string) => {
    const numValue = parseInt(value) || 0;
    setHandicapValues(prev => ({
      ...prev,
      [playerId]: numValue,
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <Header
        title="Round Setup"
        subtitle="Set Course Handicaps"
      />

      <main className="max-w-2xl mx-auto px-4 space-y-6 py-6">

        {/* Round Selector */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground ml-1">Select Round</Label>
          <Select value={selectedRoundId} onValueChange={setSelectedRoundId}>
            <SelectTrigger className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700">
              <SelectValue placeholder="Choose a round..." />
            </SelectTrigger>
            <SelectContent className="z-[100] bg-white dark:bg-slate-800 dark:border-slate-700">
              {rounds?.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  R{r.roundNumber}: {r.course.name} - {r.date}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Handicap Entry Grid */}
        {selectedRoundId && roundHandicaps && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
              <Settings className="w-4 h-4" />
              <span>Set course handicaps for each player</span>
            </div>

            {roundHandicaps.map(h => (
              <Card key={h.playerId} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-grow">
                      <div className="font-bold text-lg">{h.playerName}</div>
                      <div className="text-sm text-muted-foreground">
                        Handicap Index: {h.baseHandicap}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Label htmlFor={`hcp-${h.playerId}`} className="text-sm font-medium whitespace-nowrap">
                        Course HCP:
                      </Label>
                      <Input
                        id={`hcp-${h.playerId}`}
                        type="number"
                        min="0"
                        max="54"
                        step="1"
                        placeholder="Required"
                        value={handicapValues[h.playerId] ?? ""}
                        onChange={(e) => handleInputChange(h.playerId, e.target.value)}
                        className="w-20 text-center font-bold text-lg"
                      />
                    </div>
                  </div>

                  {/* Show difference from base */}
                  {handicapValues[h.playerId] !== h.baseHandicap && (
                    <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                      {handicapValues[h.playerId] > h.baseHandicap ? '+' : ''}
                      {handicapValues[h.playerId] - h.baseHandicap} from index
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <Button
              onClick={handleSave}
              size="lg"
              className="w-full h-14 text-lg font-bold shadow-xl"
              disabled={updateHandicaps.isPending}
            >
              {updateHandicaps.isPending ? "Saving..." : "Save All Handicaps"}
            </Button>
          </div>
        )}

        {!selectedRoundId && (
          <div className="text-center py-20 text-muted-foreground">
            <Settings className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Select a round to configure course handicaps</p>
          </div>
        )}

      </main>

      <BottomNav />
    </div>
  );
}
