import { usePlayers } from "@/hooks/use-tournament";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/Navigation";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { clsx } from "clsx";

export default function Players() {
  const { data: players, isLoading } = usePlayers();

  // Group players by team
  const playersByTeam = players ? players.reduce((acc, player) => {
    const teamName = player.team?.name || "Unassigned";
    if (!acc[teamName]) {
      acc[teamName] = [];
    }
    acc[teamName].push(player);
    return acc;
  }, {} as Record<string, typeof players>) : {};

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <Header
        title="Players"
        subtitle="Team Rosters"
      />

      <PageTransition>
        <main className="max-w-2xl mx-auto px-4 space-y-6 py-6">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading players...
            </div>
          ) : players && players.length > 0 ? (
            Object.entries(playersByTeam).map(([teamName, teamPlayers]) => (
              <div key={teamName} className="space-y-3">
                <h2 className="text-lg font-bold text-foreground">{teamName}</h2>
                <div className="grid gap-3">
                  {teamPlayers.map((player) => (
                    <Link key={player.id} href={`/player/${player.id}`}>
                      <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            {/* Team Color Badge */}
                            <div
                              className="w-10 h-10 rounded-full shadow-sm flex-shrink-0"
                              style={{ backgroundColor: player.team?.color || "#888" }}
                            />

                            {/* Player Info */}
                            <div className="flex-grow">
                              <h3 className="font-bold text-lg">{player.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {player.team?.name || "Unassigned"}
                              </p>
                            </div>

                            {/* Handicap */}
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground font-medium mb-1">
                                Handicap Index
                              </div>
                              <div className="text-2xl font-bold text-primary">
                                {player.handicap}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">👥</span>
              </div>
              <p>No players available</p>
            </div>
          )}
        </main>
      </PageTransition>

      <BottomNav />
    </div>
  );
}
