import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface GlassCardProps {
  title?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}

const paddings = {
  sm: "p-3",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-6",
};

export default function GlassCard({
  title,
  icon: Icon,
  action,
  children,
  className = "",
  padding = "md",
}: GlassCardProps) {
  return (
    <div className={`glass-card ${paddings[padding]} ${className}`}>
      {(title || Icon || action) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="w-8 h-8 rounded-lg bg-accent-subtle flex items-center justify-center">
                <Icon size={16} className="text-accent" />
              </div>
            )}
            {title && <h3 className="text-sm font-medium text-text-primary">{title}</h3>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}