import { Header } from "@/components/Header";
import { BottomNav } from "@/components/Navigation";
import { PageTransition } from "@/components/PageTransition";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function Rules() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header title="Rules & Format" subtitle="Tournament Guidelines" />
      
      <PageTransition>
        <main className="max-w-3xl mx-auto px-4 space-y-6">
          
          <Card className="bg-gradient-to-br from-primary to-primary/80 text-white border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <BookOpen className="w-6 h-6 text-accent" />
                <h2 className="text-lg font-bold">General Policy</h2>
              </div>
              <p className="text-sm text-primary-foreground/90 leading-relaxed">
                Play the ball as it lies, unless local rules state otherwise. 
                Pace of play is critical - please keep up with the group in front.
              </p>
            </CardContent>
          </Card>

          <Accordion type="single" collapsible className="w-full space-y-2">
            <AccordionItem value="item-1" className="bg-white border rounded-xl px-2">
              <AccordionTrigger className="hover:no-underline px-2 font-semibold text-slate-800">
                Scoring & Handicaps
              </AccordionTrigger>
              <AccordionContent className="px-2 pb-4 text-slate-600">
                All rounds utilize net scoring based on 75% of course handicap. 
                Maximum score on any hole is Net Double Bogey to maintain pace of play.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="bg-white border rounded-xl px-2">
              <AccordionTrigger className="hover:no-underline px-2 font-semibold text-slate-800">
                Gimme Putts
              </AccordionTrigger>
              <AccordionContent className="px-2 pb-4 text-slate-600">
                "Inside the leather" rule applies for all non-championship matches. 
                For the final round, all putts must be holed out.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="bg-white border rounded-xl px-2">
              <AccordionTrigger className="hover:no-underline px-2 font-semibold text-slate-800">
                Out of Bounds / Lost Ball
              </AccordionTrigger>
              <AccordionContent className="px-2 pb-4 text-slate-600">
                To speed up play, treat all OB and Lost Balls as lateral hazards. 
                Drop within two club lengths of point of entry, add one penalty stroke.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2 text-amber-600 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4" /> Etiquette
                </div>
                <p className="text-xs text-muted-foreground">
                  Repair divots, rake bunkers, and fix ball marks on greens. 
                  Silence mobile phones during play.
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2 text-emerald-600 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" /> Ready Golf
                </div>
                <p className="text-xs text-muted-foreground">
                  Hit when safe and ready. Order of play on tee box is waived 
                  to improve pace.
                </p>
              </CardContent>
            </Card>
          </div>

        </main>
      </PageTransition>

      <BottomNav />
    </div>
  );
}
