import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  actions?: ReactNode;
  icon?: unknown;
  className?: string;
}

export default function PageHeader({
  title,
  subtitle,
  description,
  actions,
  className = "",
}: PageHeaderProps) {
  const sub = subtitle || description;
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 ${className}`}>
      <div className="animate-fade-in">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
          {title}
        </h1>
        {sub && (
          <p className="mt-1 text-sm text-text-secondary">{sub}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}