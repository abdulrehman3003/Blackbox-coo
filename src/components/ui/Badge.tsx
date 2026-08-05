import type { ReactNode } from "react";

type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const dotColors: Record<BadgeVariant, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-accent",
  neutral: "bg-text-muted",
};

const bgColors: Record<BadgeVariant, string> = {
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  danger: "bg-danger/10 text-danger border-danger/20",
  info: "bg-accent-subtle text-accent border-accent/20",
  neutral: "bg-surface text-text-secondary border-border",
};

export default function Badge({
  variant = "neutral",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full border ${bgColors[variant]} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />
      {children}
    </span>
  );
}