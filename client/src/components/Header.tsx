import { Link } from "wouter";
import { ThemeToggle } from "./ThemeToggle";

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-display text-primary dark:text-emerald-400 tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {/* Simple Brand/Logo Placeholder */}
          <Link href="/">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-primary/20">
              GT
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
