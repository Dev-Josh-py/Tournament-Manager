import { Header } from "@/components/Header";
import { BottomNav } from "@/components/Navigation";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent } from "@/components/ui/card";
import { Beer, ShieldAlert, ListChecks, BadgeDollarSign, Target } from "lucide-react";

export default function Rules() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header title="Rules & Fines" subtitle="Tour Guidelines" />

      <PageTransition>
        <main className="max-w-3xl mx-auto px-4 space-y-4 pb-8">

          {/* Yellow Card */}
          <Card className="border-l-4 border-l-yellow-400 shadow-sm bg-white">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🟡</span>
                <div>
                  <p className="font-bold text-slate-900">Yellow Card</p>
                  <p className="text-xs text-slate-500">Half a drink</p>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <ListChecks className="w-3.5 h-3.5" /> Set list for each match
                </p>
                <ul className="space-y-1.5">
                  {[
                    "Last 3-putt",
                    "Last bunker",
                    "Last penalty",
                    "Last blackout (0 pts)",
                  ].map(item => (
                    <li key={item} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className="text-yellow-500 flex-shrink-0">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <Beer className="w-3.5 h-3.5" /> Give out fines
                </p>
                <ul className="space-y-1.5">
                  {[
                    "Last birdie",
                    "Closest to the pin (×4 par 3s)",
                  ].map(item => (
                    <li key={item} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className="text-yellow-500 flex-shrink-0">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Miscellaneous fines</p>
                <ul className="space-y-1.5">
                  {[
                    "Bad behaviour",
                    "Tomfoolery",
                    "Bad sportsmanship",
                    "Being on your phone during fines meeting",
                    "\"You're not that guy\" moments",
                    "Others approved by fines master",
                  ].map(item => (
                    <li key={item} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className="text-yellow-500 flex-shrink-0">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Red Card */}
          <Card className="border-l-4 border-l-red-500 shadow-sm bg-white">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔴</span>
                <div>
                  <p className="font-bold text-slate-900">Red Card</p>
                  <p className="text-xs text-slate-500">Down your drink</p>
                </div>
              </div>

              <ul className="space-y-1.5">
                {[
                  "Dog license",
                  "Physical altercations",
                  "Cheating",
                  "Iron covers",
                  "Being a Poes",
                ].map(item => (
                  <li key={item} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="text-red-500 flex-shrink-0">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Unaccepted Fines Policy */}
          <Card className="border-l-4 border-l-slate-400 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <BadgeDollarSign className="w-4 h-4 text-slate-600" />
                <p className="font-bold text-slate-800 text-sm">Unaccepted Fines</p>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Any fine not accepted (refusing to drink) that is approved by the fines master
                results in a payment of <span className="font-bold text-slate-900">R50</span> per offence.
                This money goes into a pot to buy more drinks for everyone else.
              </p>
            </CardContent>
          </Card>

          {/* Fines Master Note */}
          <Card className="border-none bg-amber-50 shadow-sm">
            <CardContent className="p-3">
              <p className="text-xs text-amber-800 text-center font-medium">
                All fines are at the discretion of the <span className="font-bold">Fines Master</span>. Their decision is final.
              </p>
            </CardContent>
          </Card>

        </main>
      </PageTransition>

      <BottomNav />
    </div>
  );
}
