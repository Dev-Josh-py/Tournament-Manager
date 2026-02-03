import { Link, useLocation } from "wouter";
import { Trophy, Users, Calendar, ClipboardEdit, BarChart3, BookOpen } from "lucide-react";
import { clsx } from "clsx";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Trophy, label: "Teams" },
    { href: "/individual", icon: Users, label: "Individual" },
    { href: "/schedule", icon: Calendar, label: "Schedule" },
    { href: "/scoring", icon: ClipboardEdit, label: "Scoring" },
    { href: "/scorecard", icon: BarChart3, label: "Scorecard" },
    { href: "/rules", icon: BookOpen, label: "Rules" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-border z-50 safe-area-bottom pb-1">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className="w-full h-full flex flex-col items-center justify-center gap-1 group">
              <div 
                className={clsx(
                  "p-1.5 rounded-full transition-all duration-200",
                  isActive 
                    ? "bg-primary/10 text-primary scale-110" 
                    : "text-muted-foreground group-hover:text-primary group-hover:bg-primary/5"
                )}
              >
                <item.icon className="w-5 h-5" />
              </div>
              <span 
                className={clsx(
                  "text-[10px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
