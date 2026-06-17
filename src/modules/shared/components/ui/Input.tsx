// ui/Input.tsx — Input moderne avec labels flottants et états visuels (100% Tailwind pur)
import type { ChangeEvent, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

/* ─── Input ─── */
interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  success?: string;
  icon?: ReactNode;
  iconRight?: ReactNode;
  helpText?: string;
}

export function Input({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  success,
  disabled = false,
  required = false,
  icon = null,
  iconRight = null,
  helpText,
  className = "",
  ...props
}: InputProps) {
  const hasLabel = !!label || !!helpText || !!error;
  const borderColor = error
  ? "border-red-400 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(248,113,113,0.12)]"
  : success
  ? "border-emerald-400 focus:border-emerald-400 focus:shadow-[0_0_0_3px_rgba(52,211,153,0.12)]"
  : "border-white/[0.06] focus:border-amber-400 focus:shadow-[0_0_0_3px_rgba(251,191,36,0.06)]";
  const padding = icon && iconRight
  ? "pl-10 pr-10"
  : icon
  ? "pl-10 pr-3.5"
  : iconRight
  ? "pl-3.5 pr-10"
  : "px-3.5";

  return (
    <div className={hasLabel ? "mb-4" : ""}>
    {label && (
      <label className="mb-1.5 block text-xs font-semibold text-gray-400">
      {label}
      {required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
    )}
    <div className="relative">
    {icon && (
      <div className="pointer-events-none absolute left-3 top-1/2 z-10 flex -translate-y-1/2 text-gray-500">
      {icon}
      </div>
    )}
    <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    disabled={disabled}
    className={`w-full rounded-xl py-2 text-[13px] text-gray-100 outline-none transition-all duration-150 ease-out placeholder:text-gray-600 disabled:cursor-not-allowed disabled:bg-gray-900 ${disabled ? "bg-gray-900" : "bg-[#121218]"} ${borderColor} ${padding} ${className}`}
    {...props}
    />
    {iconRight && (
      <div className="absolute right-3 top-1/2 flex -translate-y-1/2 text-gray-500">
      {iconRight}
      </div>
    )}
    </div>
    {helpText && (
      <div className="mt-1 text-[11px] text-gray-500">{helpText}</div>
    )}
    {error && (
      <div className="mt-1 text-[11px] font-medium text-red-400">{error}</div>
    )}
    </div>
  );
}

/* ─── Select ─── */
interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  label?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ value: string; label: string }>;
  error?: string;
  placeholder?: string;
}

export function Select({
  label,
  value,
  onChange,
  options = [],
  error,
  disabled = false,
  required = false,
  placeholder = "Sélectionner...",
  className = "",
  ...props
}: SelectProps) {
  return (
    <div className="mb-4">
    {label && (
      <label className="mb-1.5 block text-xs font-semibold text-gray-400">
      {label}
      {required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
    )}
    <div className="relative">
    <select
    value={value}
    onChange={onChange}
    disabled={disabled}
    className={`w-full appearance-none rounded-xl py-2 pl-3.5 pr-10 text-[13px] text-gray-100 outline-none transition-all duration-150 ease-out disabled:cursor-not-allowed disabled:bg-gray-900 ${disabled ? "bg-gray-900" : "bg-[#121218]"} ${error ? "border border-red-400 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(248,113,113,0.12)]" : "border border-white/[0.06] focus:border-amber-400 focus:shadow-[0_0_0_3px_rgba(251,191,36,0.06)]"} ${className}`}
    {...props}
    >
    <option value="" disabled className="bg-[#121218] text-gray-500">
    {placeholder}
    </option>
    {options.map((opt) => (
      <option key={opt.value} value={opt.value} className="bg-[#121218] text-gray-100">
      {opt.label}
      </option>
    ))}
    </select>
    {/* Chevron custom */}
    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9" />
    </svg>
    </div>
    </div>
    {error && (
      <div className="mt-1 text-[11px] font-medium text-red-400">{error}</div>
    )}
    </div>
  );
}

export default Input;
