import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { clsx } from "clsx";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={clsx(
        "p-2 rounded-lg transition-colors duration-200",
        "hover:bg-slate-100 dark:hover:bg-slate-800",
        "text-slate-600 dark:text-slate-400",
        "focus:outline-none focus:ring-2 focus:ring-primary/50"
      )}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? (
        <Moon className="w-5 h-5" />
      ) : (
        <Sun className="w-5 h-5" />
      )}
    </button>
  );
}
