import { Link } from "wouter";
import { useRounds, useRoundHandicaps, usePlayers, useRoundGroupings, useMatchPairings, usePick9Assignments } from "@/hooks/use-tournament";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/Navigation";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Info, Settings, Users, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { clsx } from "clsx";

function HandicapStatusIndicator({ roundId }: { roundId: number }) {
  const { data: handicaps } = useRoundHandicaps(roundId);
  const { data: players } = usePlayers();

  // Check if all players have been assigned a course handicap for this round
  const allPlayersHaveHandicaps =
    handicaps &&
    players &&
    handicaps.length === players.length &&
    handicaps.length > 0 &&
    handicaps.every(h => h.courseHandicap !== null && h.courseHandicap !== undefined);

  return (
    <div className="flex items-center gap-1">
      {allPlayersHaveHandicaps ? (
        <>
          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-xs text-green-600 dark:text-green-400 font-medium">HCP Set</span>
        </>
      ) : (
        <>
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">HCP Pending</span>
        </>
      )}
    </div>
  );
}

function GroupingsStatusIndicator({ roundId }: { roundId: number }) {
  const { data: groupings } = useRoundGroupings(roundId);

  const groupingsConfigured = groupings && groupings.length > 0;

  return (
    <div className="flex items-center gap-1">
      {groupingsConfigured ? (
        <>
          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-xs text-green-600 dark:text-green-400 font-medium">Groups Set</span>
        </>
      ) : (
        <>
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Groups Pending</span>
        </>
      )}
    </div>
  );
}

function MatchesStatusIndicator({ roundId }: { roundId: number }) {
  const { data: pairings } = useMatchPairings(roundId);

  const matchesConfigured = pairings && pairings.length > 0;

  return (
    <div className="flex items-center gap-1">
      {matchesConfigured ? (
        <>
          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-xs text-green-600 dark:text-green-400 font-medium">Matches Set</span>
        </>
      ) : (
        <>
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Matches Pending</span>
        </>
      )}
    </div>
  );
}

function Pick9StatusIndicator({ roundId }: { roundId: number }) {
  const { data: assignments } = usePick9Assignments(roundId);
  const { data: players } = usePlayers();

  const allAssigned = assignments && players && assignments.length === players.length && assignments.length > 0;

  return (
    <div className="flex items-center gap-1">
      {allAssigned ? (
        <>
          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-xs text-green-600 dark:text-green-400 font-medium">Pick 9 Set</span>
        </>
      ) : (
        <>
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Pick 9 Pending</span>
        </>
      )}
    </div>
  );
}

export default function Schedule() {
  const { data: rounds, isLoading } = useRounds();

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

  const formatTypeName = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header title="Tournament Schedule" subtitle="Course & Format Details" />
      
      <PageTransition>
        <main className="max-w-3xl mx-auto px-4 space-y-6">
          {isLoading ? (
            [1, 2, 3].map(i => <div key={i} className="h-40 bg-white dark:bg-slate-800 rounded-xl animate-pulse" />)
          ) : (
            rounds?.map((round, index) => (
              <Card key={round.id} className="overflow-hidden border-border/50 shadow-md">
                <div className="h-2 bg-primary/20 w-full" />
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono text-xs uppercase tracking-wider mb-2">
                        Round {round.roundNumber}
                      </Badge>
                      <HandicapStatusIndicator roundId={round.id} />
                      {round.formatType === 'individual_match_play' && (
                        <MatchesStatusIndicator roundId={round.id} />
                      )}
                      {round.formatType !== 'individual_match_play' && round.formatType !== 'individual_net' && round.formatType !== 'individual_stableford' && round.formatType !== 'pick_9' && round.formatType !== 'team_scramble' && (
                        <GroupingsStatusIndicator roundId={round.id} />
                      )}
                      {(round.formatType === 'pick_9' || round.formatType === 'team_scramble') && (
                        <Pick9StatusIndicator roundId={round.id} />
                      )}
                    </div>
                    {round.isCompleted ? (
                      <Badge className="bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600">Completed</Badge>
                    ) : (
                      <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">Upcoming</Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl font-display flex items-center justify-between">
                    {round.course.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{round.date}</span>
                  </div>
                  {round.teeTime && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>Tee Times: {round.teeTime}</span>
                    </div>
                  )}
                  
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 border border-slate-100 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground uppercase">Format</span>
                      <Badge className={clsx("text-[10px]", getFormatBadgeColor(round.formatType))}>
                        {formatTypeName(round.formatType)}
                      </Badge>
                    </div>
                    <div className="flex gap-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                      <p>{round.description}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mt-4 md:flex-row">
                    <Link href={`/round-setup?round=${round.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Settings className="w-4 h-4 mr-2" />
                        Set Course Handicaps
                      </Button>
                    </Link>
                    {round.formatType === 'individual_match_play' ? (
                      <Link href={`/match-pairing-setup?round=${round.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Users className="w-4 h-4 mr-2" />
                          Configure Matches
                        </Button>
                      </Link>
                    ) : round.formatType === 'pick_9' || round.formatType === 'team_scramble' ? (
                      <Link href={`/pick9-setup?round=${round.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Users className="w-4 h-4 mr-2" />
                          {round.formatType === 'team_scramble' ? 'Select 9 Holes' : 'Assign Pick 9'}
                        </Button>
                      </Link>
                    ) : round.formatType === 'individual_stableford' ? (
                      <Link href={`/grouping-setup?round=${round.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Users className="w-4 h-4 mr-2" />
                          Configure Groupings
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/grouping-setup?round=${round.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Users className="w-4 h-4 mr-2" />
                          Configure Groupings
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          
          <div className="text-center p-8">
            <p className="text-xs text-muted-foreground italic">
              * Tee times are subject to change based on weather conditions.
            </p>
          </div>
        </main>
      </PageTransition>

      <BottomNav />
    </div>
  );
}
