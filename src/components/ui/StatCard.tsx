import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon?: LucideIcon;
  className?: string;
}

export default function StatCard({
  label,
  value,
  change,
  icon: Icon,
  className = "",
}: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <div className={`glass-card p-4 sm:p-5 ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          {label}
        </span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-accent-subtle flex items-center justify-center shrink-0">
            <Icon size={16} className="text-accent" />
          </div>
        )}
      </div>
      <div className="flex items-end gap-3">
        <span className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
          {value}
        </span>
        {change !== undefined && (
          <div
            className={`flex items-center gap-0.5 text-xs font-medium mb-1 ${
              isPositive
                ? "text-success"
                : isNegative
                  ? "text-danger"
                  : "text-text-muted"
            }`}
          >
            {isPositive ? (
              <TrendingUp size={12} />
            ) : isNegative ? (
              <TrendingDown size={12} />
            ) : null}
            <span>{isPositive ? "+" : ""}{change}%</span>
          </div>
        )}
      </div>
    </div>
  );
}