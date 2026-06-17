// ui/Button.tsx — Bouton moderne et élégant (100% Tailwind pur)
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "success" | "danger" | "warning" | "secondary" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

const variantMap: Record<ButtonVariant, string> = {
  primary:
  "bg-amber-400 text-gray-950 border-transparent shadow-[0_2px_8px_rgba(251,191,36,0.25)] hover:bg-amber-300 hover:shadow-[0_4px_16px_rgba(251,191,36,0.35)] active:bg-amber-500",
  success:
  "bg-emerald-400 text-gray-950 border-transparent shadow-[0_2px_8px_rgba(52,211,153,0.25)] hover:bg-emerald-500 hover:shadow-[0_4px_16px_rgba(52,211,153,0.35)] active:bg-emerald-600",
  danger:
  "bg-red-400 text-white border-transparent shadow-[0_2px_8px_rgba(248,113,113,0.25)] hover:bg-red-500 hover:shadow-[0_4px_16px_rgba(248,113,113,0.35)] active:bg-red-600",
  warning:
  "bg-yellow-400 text-gray-950 border-transparent shadow-[0_2px_8px_rgba(251,191,36,0.25)] hover:bg-yellow-500 hover:shadow-[0_4px_16px_rgba(251,191,36,0.35)] active:bg-yellow-600",
  secondary:
  "bg-gray-900 text-gray-200 border-white/[0.03] hover:bg-gray-800 hover:border-white/5 active:bg-gray-950",
  ghost:
  "bg-transparent text-gray-400 border-transparent hover:bg-gray-900 hover:text-gray-200 active:bg-gray-950",
  outline:
  "bg-transparent text-amber-400 border-[1.5px] border-white/[0.03] hover:border-amber-400 hover:bg-amber-400/5 active:bg-amber-400/10",
};

const sizeMap: Record<ButtonSize, string> = {
  sm: "h-8 px-3 py-1.5 text-xs rounded-lg gap-1.5",
  md: "h-[38px] px-4 py-2 text-[13px] rounded-[10px] gap-1.5",
  lg: "h-11 px-5 py-2.5 text-sm rounded-xl gap-2",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  icon = null,
  iconRight = null,
  fullWidth = false,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
    type={type}
    disabled={disabled || loading}
    className={`inline-flex items-center justify-center whitespace-nowrap font-semibold transition-all duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50 ${variantMap[variant]} ${sizeMap[size]} ${fullWidth ? "w-full" : "w-auto"} ${className}`}
    {...props}
    >
    {loading ? (
      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
    ) : (
      icon
    )}
    {children}
    {iconRight}
    </button>
  );
}

export default Button;
