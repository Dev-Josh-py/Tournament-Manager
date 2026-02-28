import { Header } from "@/components/Header";
import { BottomNav } from "@/components/Navigation";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Beer, BadgeDollarSign, ListChecks, Trophy, Calendar, Users, Zap } from "lucide-react";

const rounds = [
  {
    number: 1,
    course: "Oubaai GC",
    date: "Sat 21 Feb",
    format: "Individual Match Play",
    tag: "match_play",
    description: "1v1 Stableford match play across 3 pairings. Each hole is won by the player with higher Stableford points. Most holes won takes the match.",
    points: "Winner 8 pts, Loser 3 pts (per match)",
  },
  {
    number: 2,
    course: "Fancourt Outeniqua",
    date: "Sun 22 Feb (AM)",
    format: "Better Ball Stableford",
    tag: "team",
    description: "Best Stableford score from either teammate counts on each hole. Team total = sum of the better scores across 18 holes.",
    points: "1st 12 pts, 2nd 9 pts, 3rd 6 pts",
  },
  {
    number: 3,
    course: "Fancourt Montagu",
    date: "Sun 22 Feb (PM)",
    format: "Better Ball Stableford",
    tag: "team",
    description: "Same format as Round 2 — best Stableford score from either teammate on each hole.",
    points: "1st 12 pts, 2nd 9 pts, 3rd 6 pts",
  },
  {
    number: 4,
    course: "George GC",
    date: "Mon 23 Feb (AM)",
    format: "Pick 9 Stableford",
    tag: "team",
    description: "Each player is assigned either holes 1-9 or 10-18. Better Ball Stableford from each player's assigned 9 holes combine for the team score.",
    points: "1st 14 pts, 2nd 10 pts, 3rd 7 pts",
  },
  {
    number: 5,
    course: "Knysna Golf Club",
    date: "Mon 23 Feb (PM)",
    format: "Team Scramble (9 Holes)",
    tag: "team",
    description: "One gross score per team per hole over 9 holes. Starting score adjustments are applied per team. Lowest adjusted score wins.",
    points: "1st 15 pts, 2nd 11 pts, 3rd 8 pts",
  },
  {
    number: 6,
    course: "Kingswood Golf Estate",
    date: "Tue 24 Feb",
    format: "Combined Stableford",
    tag: "team",
    description: "Both teammates' Stableford points are added together on every hole. Team total = combined sum across 18 holes.",
    points: "1st 18 pts, 2nd 12 pts, 3rd 9 pts",
  },
];

const tagColor: Record<string, string> = {
  match_play: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  team: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  individual: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
};

const tagLabel: Record<string, string> = {
  match_play: "Match Play",
  team: "Team",
  individual: "Individual",
};

export default function Rules() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <Header title="Rules & Format" subtitle="Tour Guidelines" />

      <PageTransition>
        <main className="max-w-3xl mx-auto px-4">
          <Tabs defaultValue="format" className="w-full">
            <TabsList className="w-full grid grid-cols-2 mb-6 bg-slate-200 dark:bg-slate-800 p-1">
              <TabsTrigger value="format">Rounds & Scoring</TabsTrigger>
              <TabsTrigger value="fines">Fines</TabsTrigger>
            </TabsList>

            {/* ── Rounds & Scoring Tab ─────────────────────── */}
            <TabsContent value="format" className="space-y-4">

              {/* How It Works */}
              <Card className="border-0 shadow-sm bg-white dark:bg-slate-900">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <p className="font-bold text-sm text-slate-900 dark:text-slate-100">How It Works</p>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    3 teams of 2 compete across 6 rounds over 4 days. Each round awards team points based on finishing position. The team with the most points at the end wins the tour.
                  </p>
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      All formats use <span className="font-semibold">Stableford scoring</span> off course handicap.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Stableford Explainer */}
              <Card className="border-0 shadow-sm bg-white dark:bg-slate-900">
                <CardContent className="p-4 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Stableford Points</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                    {[
                      ["Double Eagle or better", "5 pts"],
                      ["Eagle", "4 pts"],
                      ["Birdie", "3 pts"],
                      ["Par", "2 pts"],
                      ["Bogey", "1 pt"],
                      ["Double Bogey+", "0 pts"],
                    ].map(([label, pts]) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">{label}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{pts}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 pt-1">
                    Scores are calculated against net par (gross score adjusted for handicap strokes received on each hole based on stroke index).
                  </p>
                </CardContent>
              </Card>

              {/* Round Cards */}
              {rounds.map(r => (
                <Card key={r.number} className="border-0 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300">
                          {r.number}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{r.course}</p>
                          <p className="text-[11px] text-slate-500">{r.date}</p>
                        </div>
                      </div>
                      <Badge className={`text-[10px] font-semibold px-2 py-0.5 border-0 ${tagColor[r.tag]}`}>
                        {tagLabel[r.tag]}
                      </Badge>
                    </div>

                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{r.format}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{r.description}</p>

                    <div className="flex items-center gap-1.5 pt-1">
                      <Trophy className="w-3 h-3 text-amber-500" />
                      <p className="text-xs font-semibold text-slate-500">{r.points}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* ── Fines Tab ────────────────────────────────── */}
            <TabsContent value="fines" className="space-y-4">

              {/* Yellow Card */}
              <Card className="border-l-4 border-l-yellow-400 shadow-sm bg-white dark:bg-slate-900">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🟡</span>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">Yellow Card</p>
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
                        <li key={item} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
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
                        "Closest to the pin (x4 par 3s)",
                      ].map(item => (
                        <li key={item} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
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
                        <li key={item} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                          <span className="text-yellow-500 flex-shrink-0">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Red Card */}
              <Card className="border-l-4 border-l-red-500 shadow-sm bg-white dark:bg-slate-900">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔴</span>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">Red Card</p>
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
                      <li key={item} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                        <span className="text-red-500 flex-shrink-0">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Unaccepted Fines Policy */}
              <Card className="border-l-4 border-l-slate-400 shadow-sm bg-white dark:bg-slate-900">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BadgeDollarSign className="w-4 h-4 text-slate-600" />
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">Unaccepted Fines</p>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Any fine not accepted (refusing to drink) that is approved by the fines master
                    results in a payment of <span className="font-bold text-slate-900 dark:text-slate-100">R50</span> per offence.
                    This money goes into a pot to buy more drinks for everyone else.
                  </p>
                </CardContent>
              </Card>

              {/* Fines Master Note */}
              <Card className="border-none bg-amber-50 dark:bg-amber-950/30 shadow-sm">
                <CardContent className="p-3">
                  <p className="text-xs text-amber-800 dark:text-amber-300 text-center font-medium">
                    All fines are at the discretion of the <span className="font-bold">Fines Master</span>. Their decision is final.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </main>
      </PageTransition>

      <BottomNav />
    </div>
  );
}
