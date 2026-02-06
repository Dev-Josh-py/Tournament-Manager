import { Link } from "wouter";
import { ThemeToggle } from "./ThemeToggle";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Menu, BookOpen, Settings } from "lucide-react";

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

          {/* Menu Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <Menu className="w-6 h-6 text-slate-700 dark:text-slate-200" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <Link href="/rules">
                <DropdownMenuItem className="cursor-pointer">
                  <BookOpen className="w-4 h-4 mr-2" />
                  <span>Rules & Format</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <Link href="/">
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  <span>Home</span>
                </DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>

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
