// CompanySwitcher.tsx — Sélecteur de société (100% Tailwind pur)
import { useEffect, useRef, useState } from "react";
import type { Company } from "@/modules/shared/types";
import { useCompany } from "../../context/CompanyContext";

function getCompanyColorClasses(slug?: string) {
  if (slug === "pomanay") return "bg-emerald-500 hover:bg-emerald-600";
  if (slug === "zazatiana") return "bg-pink-500 hover:bg-pink-600";
  return "bg-blue-500 hover:bg-blue-600";
}

function getCompanyDotColor(slug?: string) {
  if (slug === "pomanay") return "bg-emerald-500";
  if (slug === "zazatiana") return "bg-pink-500";
  return "bg-blue-500";
}

function getCompanyDotBorderColor(slug?: string) {
  if (slug === "pomanay") return "border-emerald-500";
  if (slug === "zazatiana") return "border-pink-500";
  return "border-blue-500";
}

function getCompanyInitials(slug?: string) {
  if (slug === "pomanay") return "POM";
  if (slug === "zazatiana") return "ZAZ";
  return "LIV";
}

function getCompanyTextColor(slug?: string) {
  if (slug === "pomanay") return "text-emerald-500";
  if (slug === "zazatiana") return "text-pink-500";
  return "text-blue-500";
}

export function CompanySwitcher() {
  const { currentCompany, companies, switchCompany } = useCompany();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!companies || companies.length <= 1) {
    return null;
  }

  const handleSelectCompany = (company: Company) => {
    if (company.id !== currentCompany?.id) {
      switchCompany(company);
    }
    setIsOpen(false);
  };

  const currentColor = getCompanyColorClasses(currentCompany?.slug);

  return (
    <div ref={dropdownRef} className="relative">
    <button
    type="button"
    onClick={() => setIsOpen(!isOpen)}
    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium text-white transition-opacity duration-200 hover:opacity-90 ${currentColor}`}
    >
    <span className="text-sm">☰</span>
    <span>{currentCompany?.name || "Société"}</span>
    <span className="text-xs">{isOpen ? "▲" : "▼"}</span>
    </button>

    {isOpen && (
      <div className="absolute left-0 top-full z-[1000] mt-1 min-w-[220px] overflow-hidden rounded-lg border border-white/[0.06] bg-[#121218] shadow-[0_4px_12px_rgba(0,0,0,0.15)] animate-fade-up">
      {companies.map((company: Company) => {
        const isActive = currentCompany?.id === company.id;
        const dotColor = getCompanyDotColor(company.slug);
        const dotBorderColor = getCompanyDotBorderColor(company.slug);
        const initials = getCompanyInitials(company.slug);
        const textColor = getCompanyTextColor(company.slug);

        return (
          <button
          key={company.id}
          type="button"
          onClick={() => handleSelectCompany(company)}
          className={`flex w-full items-center gap-2.5 border-l-[3px] px-3.5 py-2.5 text-left transition-colors ${isActive ? `${dotBorderColor} bg-[#08080c] font-semibold text-[#e8e8ec]` : "border-l-transparent bg-transparent font-normal text-[#a0a0b0] hover:bg-[#08080c]"}`}
          >
          <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[9px] font-bold text-white ${dotColor}`}
          >
          {initials}
          </span>
          <div className="flex-1">
          <div className={`text-[13px] ${isActive ? "font-semibold" : "font-normal"}`}>
          {company.name}
          </div>
          <div className="text-[10px] text-[#6b6b7b]">
          {company.type === "service" ? "Service livraison" : "Boutique"}
          </div>
          </div>
          {isActive && (
            <span className={`text-sm ${textColor}`}>
            ✓
            </span>
          )}
          </button>
        );
      })}
      </div>
    )}
    </div>
  );
}

export default CompanySwitcher;
