// src/modules/shared/components/ui/Icon.tsx
interface IconProps {
  d: string;
  size?: number;
  className?: string;
}

export const Icon = ({ d, size = 16, className = "" }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d={d} />
  </svg>
);

export default Icon;
