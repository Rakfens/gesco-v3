// src/modules/shared/components/layout/CompanySheet.tsx
import type { Company } from "@/modules/shared/context/CompanyContext";
import { CheckIcon } from "@/modules/shared/components/ui";
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
    className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
    onClick={onClose}
    >
    <div
    className="w-full sm:w-[420px] sm:rounded-2xl rounded-t-2xl bg-[var(--bg-card)] border border-[var(--border-default)] shadow-[var(--shadow-lg)] animate-fade-up overflow-hidden"
    style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    onClick={(e) => e.stopPropagation()}
    >
    {/* Handle (mobile only) */}
    <div className="sm:hidden mx-auto mt-3 h-1 w-10 rounded-full bg-[var(--border-active)]" />

    {/* Header */}
    <div className="px-6 pt-5 pb-3">
    <h2 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">
    Choisir une société
    </h2>
    </div>

    {/* List */}
    <div className="px-3 pb-4 space-y-1">
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
        className={`group flex w-full items-center gap-4 rounded-xl px-4 py-3.5 transition-all duration-200 ${
          isActive
          ? "bg-[var(--gold)]/8 border border-[var(--gold)]/20 shadow-[var(--shadow-gold)]"
          : "bg-transparent border border-transparent hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-subtle)]"
        }`}
        >
        {/* Logo */}
        <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border ${
          isActive ? "border-[var(--gold)]/30" : "border-[var(--border-default)]"
        } bg-[var(--bg-primary)] transition-colors duration-200`}
        >
        <img
        src={getLogoSrc(company)}
        alt={company.name}
        className="h-full w-full object-contain p-1"
        />
        </div>

        {/* Info */}
        <div className="flex-1 text-left min-w-0">
        <div
        className={`text-[15px] truncate ${
          isActive ? "font-bold text-[var(--gold)]" : "font-semibold text-[var(--text-primary)]"
        }`}
        >
        {company.name}
        </div>
        <div className="mt-0.5 text-[12px] text-[var(--text-muted)]">
        {meta.label}
        </div>
        </div>

        {/* Active indicator */}
        {isActive ? (
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--gold)] text-[var(--bg-primary)] shadow-[var(--shadow-gold)]">
          <CheckIcon size={12} />
          </div>
        ) : (
          <div className="h-5 w-5 shrink-0 rounded-full border-2 border-[var(--border-active)] group-hover:border-[var(--text-muted)] transition-colors duration-200" />
        )}
        </button>
      );
    })}
    </div>
    </div>
    </div>
  );
}

export default CompanySheet;
