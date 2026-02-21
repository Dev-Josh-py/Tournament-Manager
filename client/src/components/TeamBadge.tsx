import { clsx } from "clsx";

interface TeamBadgeProps {
  color: string;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function TeamBadge({ color, name, size = "md", className }: TeamBadgeProps) {
  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4"
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  return (
    <div className={clsx("flex items-center gap-2", className)}>
      <div
        className={clsx("rounded-full shadow-sm ring-1 ring-black/5 dark:ring-white/10", sizeClasses[size])}
        style={{ backgroundColor: color }}
      />
      <span className={clsx("font-medium truncate", textSizeClasses[size])}>
        {name}
      </span>
    </div>
  );
}
