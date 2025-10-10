import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
}

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      "bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400",
    secondary:
      "bg-gray-600 hover:bg-gray-700 text-white disabled:bg-gray-400",
    danger: "bg-red-600 hover:bg-red-700 text-white disabled:bg-red-400",
  };

  return (
    <button
      className={cn(
        "px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
