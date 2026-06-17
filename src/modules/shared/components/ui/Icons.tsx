import type { ReactNode, SVGProps } from "react";

/* ─── Base SVG wrapper ─── */
interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
  strokeWidth?: number;
}

function BaseIcon({
  size = 16,
  strokeWidth = 2,
  className = "",
  children,
  ...props
}: IconProps & { children: ReactNode }) {
  return (
    <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
    >
    {children}
    </svg>
  );
}

/* ─── Generic Icon (used by livraison pages) ─── */
interface IconComponentProps extends IconProps {
  d: string;
}

export function Icon({ d, ...props }: IconComponentProps) {
  return (
    <BaseIcon {...props}>
    <path d={d} />
    </BaseIcon>
  );
}

/* ─── StatusIcon (polymorphe) ─── */
const statusIconPaths: Record<string, string> = {
  clock: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2",
  check: "M20 6L9 17l-5-5",
  "rotate-left": "M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 1015.24 4.76L23 9",
  xmark: "M18 6L6 18M6 6l12 12",
};

interface StatusIconProps {
  status?: string;
  name?: string;
  size?: number;
  className?: string;
}

export function StatusIcon({ status, name, size = 16, className }: StatusIconProps) {
  if (name) {
    const d = statusIconPaths[name];
    if (!d) return null;
    return <Icon d={d} size={size} className={className} />;
  }

  const colorMap: Record<string, string> = {
    livre: "text-emerald-500",
    en_cours: "text-amber-500",
    annule: "text-red-500",
    default: "text-slate-500",
  };
  return (
    <span
    className={`inline-block w-2 h-2 rounded-full ${
      colorMap[status || "default"] || colorMap.default
    }`}
    />
  );
}

/* ─── Theme icons ─── */
export const MoonIcon = (props: IconProps) => (
  <BaseIcon {...props}>
  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </BaseIcon>
);

export const SunIcon = (props: IconProps) => (
  <BaseIcon {...props} strokeWidth={props.strokeWidth ?? 2}>
  <circle cx="12" cy="12" r="5" />
  <line x1="12" y1="1" x2="12" y2="3" />
  <line x1="12" y1="21" x2="12" y2="23" />
  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
  <line x1="1" y1="12" x2="3" y2="12" />
  <line x1="21" y1="12" x2="23" y2="12" />
  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </BaseIcon>
);

export const LogoutIcon = (props: IconProps) => (
  <BaseIcon size={props.size ?? 14} {...props}>
  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
  <polyline points="16 17 21 12 16 7" />
  <line x1="21" y1="12" x2="9" y2="12" />
  </BaseIcon>
);

export const ChevronDownIcon = (props: IconProps) => (
  <BaseIcon size={props.size ?? 12} {...props}>
  <polyline points="6 9 12 15 18 9" />
  </BaseIcon>
);

export const MenuIcon = (props: IconProps) => (
  <BaseIcon size={props.size ?? 22} strokeWidth={2} {...props}>
  <line x1="3" y1="6" x2="21" y2="6" />
  <line x1="3" y1="12" x2="21" y2="12" />
  <line x1="3" y1="18" x2="21" y2="18" />
  </BaseIcon>
);

export const LockIcon = (props: IconProps) => (
  <BaseIcon size={props.size ?? 14} {...props}>
  <rect x="3" y="11" width="18" height="11" rx="2" />
  <path d="M7 11V7a5 5 0 0110 0v4" />
  </BaseIcon>
);

export const CheckIcon = (props: IconProps) => (
  <BaseIcon size={props.size ?? 12} strokeWidth={3} {...props}>
  <polyline points="20 6 9 17 4 12" />
  </BaseIcon>
);

export const CloseIcon = (props: IconProps) => (
  <BaseIcon size={props.size ?? 18} {...props}>
  <line x1="18" y1="6" x2="6" y2="18" />
  <line x1="6" y1="6" x2="18" y2="18" />
  </BaseIcon>
);

/* ─── Navigation icons ─── */
export type NavIconKey =
| "grid"
| "truck"
| "clock"
| "user"
| "chart"
| "users"
| "refresh"
| "cash"
| "cart"
| "box"
| "package"
| "list"
| "wallet"
| "document";

export const NavIcons: Record<NavIconKey, (props?: IconProps) => ReactNode> = {
  grid: (props) => (
    <BaseIcon size={props?.size ?? 16} strokeWidth={1.8} {...props}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </BaseIcon>
  ),
  truck: (props) => (
    <BaseIcon size={props?.size ?? 16} strokeWidth={1.8} {...props}>
    <path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3" />
    <rect x="9" y="11" width="14" height="10" rx="2" />
    <circle cx="12" cy="21" r="1.5" fill="currentColor" />
    <circle cx="20" cy="21" r="1.5" fill="currentColor" />
    </BaseIcon>
  ),
  clock: (props) => (
    <BaseIcon size={props?.size ?? 16} strokeWidth={1.8} {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
    </BaseIcon>
  ),
  user: (props) => (
    <BaseIcon size={props?.size ?? 16} strokeWidth={1.8} {...props}>
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
    </BaseIcon>
  ),
  chart: (props) => (
    <BaseIcon size={props?.size ?? 16} strokeWidth={1.8} {...props}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
    </BaseIcon>
  ),
  users: (props) => (
    <BaseIcon size={props?.size ?? 16} strokeWidth={1.8} {...props}>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
    </BaseIcon>
  ),
  refresh: (props) => (
    <BaseIcon size={props?.size ?? 16} strokeWidth={1.8} {...props}>
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 10.49-3.74" />
    </BaseIcon>
  ),
  cash: (props) => (
    <BaseIcon size={props?.size ?? 16} strokeWidth={1.8} {...props}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
    </BaseIcon>
  ),
  cart: (props) => (
    <BaseIcon size={props?.size ?? 16} strokeWidth={1.8} {...props}>
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 01-8 0" />
    </BaseIcon>
  ),
  box: (props) => (
    <BaseIcon size={props?.size ?? 16} strokeWidth={1.8} {...props}>
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
    <path d="M3.3 7L12 12l8.7-5" />
    <path d="M12 22V12" />
    </BaseIcon>
  ),
  package: (props) => (
    <BaseIcon size={props?.size ?? 16} strokeWidth={1.8} {...props}>
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
    </BaseIcon>
  ),
  list: (props) => (
    <BaseIcon size={props?.size ?? 16} strokeWidth={1.8} {...props}>
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
    </BaseIcon>
  ),
  wallet: (props) => (
    <BaseIcon size={props?.size ?? 16} strokeWidth={1.8} {...props}>
    <rect x="1" y="4" width="22" height="16" rx="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
    </BaseIcon>
  ),
  document: (props) => (
    <BaseIcon size={props?.size ?? 16} strokeWidth={1.8} {...props}>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
    </BaseIcon>
  ),
};

export default BaseIcon;
