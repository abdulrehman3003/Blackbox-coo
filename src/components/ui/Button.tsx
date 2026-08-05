import { type ComponentProps, forwardRef } from "react";
import { Loader2, type LucideIcon } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends Omit<ComponentProps<"button">, "ref"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: LucideIcon;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-black font-medium shadow-[0_0_20px_rgba(158,255,0,0.15)] hover:bg-accent-hover hover:shadow-[0_0_30px_rgba(158,255,0,0.25)] active:scale-[0.97]",
  secondary:
    "bg-surface border border-border text-text-primary hover:bg-surface-hover hover:border-border-hover active:scale-[0.97]",
  ghost:
    "text-text-secondary hover:text-text-primary hover:bg-surface-hover active:scale-[0.97]",
  danger:
    "bg-danger/10 border border-danger/30 text-danger hover:bg-danger/20 active:scale-[0.97]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-base gap-2.5 rounded-xl",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "secondary",
      size = "md",
      loading = false,
      icon: Icon,
      children,
      disabled,
      className = "",
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center font-medium transition-all duration-150 ease-out cursor-pointer
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          ${className}`}
        {...props}
      >
        {loading ? (
          <Loader2 size={size === "sm" ? 14 : size === "md" ? 16 : 18} className="animate-spin" />
        ) : Icon ? (
          <Icon size={size === "sm" ? 14 : size === "md" ? 16 : 18} />
        ) : null}
        {children && <span>{children}</span>}
      </button>
    );
  },
);

Button.displayName = "Button";
export default Button;