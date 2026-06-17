// CompanySheet.tsx — 100% Tailwind pur
import { CheckIcon } from "@/modules/shared/components/ui/Icons";
import type { Company } from "@/modules/shared/context/CompanyContext";
import { getCompanyMeta, getLogoSrc } from "./company";

interface CompanySheetProps {
  companies: Company[];
  currentCompany: Company | null;
  onSelect: (company: Company) => void;
  onClose: () => void;
}

export function CompanySheet({
  companies,
  currentCompany,
  onSelect,
  onClose,
}: CompanySheetProps) {
  return (
    <div
    className="fixed inset-0 z-[500] flex items-end justify-center bg-black/40 animate-fade-in"
    onClick={onClose}
    >
    <div
    className="w-full max-w-[480px] animate-fade-up rounded-t-[18px] bg-[#121218] shadow-[0_8px_32px_rgba(0,0,0,0.6)] pb-[env(safe-area-inset-bottom)]"
    onClick={(e) => e.stopPropagation()}
    >
    {/* Handle */}
    <div className="mx-auto mt-3 h-1 w-9 rounded bg-[#2a2a32]" />
    <div className="px-5 pb-2 pt-4 text-[13px] font-semibold text-[#6b6b7b]">
    Choisir une société
    </div>
    {companies.map((company) => {
      const meta = getCompanyMeta(company);
      const isActive = currentCompany?.id === company.id;
      return (
        <button
        key={company.id}
        type="button"
        onClick={() => {
          onSelect(company);
          onClose();
        }}
        className={`flex w-full items-center gap-3.5 border-b border-white/[0.06] px-5 py-3.5 transition-colors ${isActive ? "bg-amber-400/5" : "bg-transparent hover:bg-white/[0.02]"}`}
        >
        <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-white/[0.08] ${meta.tailwindAvatarBg}`}
        >
        <img
        src={getLogoSrc(company)}
        alt={company.name}
        className="h-full w-full object-contain"
        />
        </div>
        <div className="flex-1 text-left">
        <div
        className={`text-sm ${isActive ? "font-bold" : "font-semibold"} text-[#e8e8ec]`}
        >
        {company.name}
        </div>
        <div className="mt-0.5 text-[11px] text-[#6b6b7b]">
        {meta.label}
        </div>
        </div>
        {isActive && (
          <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-amber-400">
          <CheckIcon size={12} strokeWidth={3} />
          </div>
        )}
        </button>
      );
    })}
    <div className="h-3" />
    </div>
    </div>
  );
}

export default CompanySheet;
