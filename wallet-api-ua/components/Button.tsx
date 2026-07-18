import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "accent";
}

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      "bg-text text-bg hover:opacity-90 disabled:bg-faint disabled:text-muted",
    secondary:
      "bg-surface border border-border-custom text-text hover:bg-bg disabled:opacity-50",
    danger: "bg-danger text-surface hover:opacity-90 disabled:opacity-50",
    accent: "bg-surface border border-accent/20 text-accent hover:border-accent/40 disabled:opacity-50",
  };

  return (
    <button
      className={cn(
        "px-6 py-3 rounded-soft font-body font-semibold tracking-wide transition-all spring-bounce flex items-center justify-center gap-2 disabled:cursor-not-allowed select-none outline-none focus:ring-2 focus:ring-focus",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
