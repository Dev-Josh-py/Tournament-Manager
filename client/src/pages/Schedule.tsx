import { Link } from "wouter";
import { useRounds } from "@/hooks/use-tournament";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/Navigation";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Info, Settings } from "lucide-react";
import { format } from "date-fns";
import { clsx } from "clsx";

export default function Schedule() {
  const { data: rounds, isLoading } = useRounds();

  const getFormatBadgeColor = (formatType: string) => {
    switch (formatType) {
      case "individual_net": return "bg-blue-100 text-blue-800 border-blue-200";
      case "better_ball": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "combined_stableford": return "bg-purple-100 text-purple-800 border-purple-200";
      case "championship": return "bg-amber-100 text-amber-800 border-amber-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
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
            [1, 2, 3].map(i => <div key={i} className="h-40 bg-white rounded-xl animate-pulse" />)
          ) : (
            rounds?.map((round, index) => (
              <Card key={round.id} className="overflow-hidden border-border/50 shadow-md">
                <div className="h-2 bg-primary/20 w-full" />
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="font-mono text-xs uppercase tracking-wider mb-2">
                      Round {round.roundNumber}
                    </Badge>
                    {round.isCompleted ? (
                      <Badge className="bg-slate-200 text-slate-600 hover:bg-slate-300">Completed</Badge>
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
                  
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground uppercase">Format</span>
                      <Badge className={clsx("text-[10px]", getFormatBadgeColor(round.formatType))}>
                        {formatTypeName(round.formatType)}
                      </Badge>
                    </div>
                    <div className="flex gap-2 text-sm text-slate-700 leading-relaxed">
                      <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                      <p>{round.description}</p>
                    </div>
                  </div>

                  <Link href={`/round-setup?round=${round.id}`} className="block mt-4">
                    <Button variant="outline" size="sm" className="w-full">
                      <Settings className="w-4 h-4 mr-2" />
                      Set Course Handicaps
                    </Button>
                  </Link>
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
