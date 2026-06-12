"use client";

import { useCompany } from "../../context/CompanyContext";

interface NavItem {
  key: string;
  icon: string;
  label: string;
}

// Navigation pour Aterinay Service (livraison)
const serviceNavItems: NavItem[] = [
  { key: "dashboard", icon: "📊", label: "Accueil" },
  { key: "livraison", icon: "📦", label: "Livraison" },
  { key: "historique", icon: "📋", label: "Historique" },
  { key: "gerant", icon: "🧑‍💼", label: "Gérant" },
  { key: "recap", icon: "📈", label: "Récap" },
  { key: "agents", icon: "👥", label: "Agents" },
  { key: "recuperation", icon: "📦", label: "Récupération" },
];

// Navigation pour Pomanay (commerce avec dépenses)
const pomanayNavItems: NavItem[] = [
  { key: "dashboard", icon: "📊", label: "Accueil" },
  { key: "ventes", icon: "💰", label: "Ventes" },
  { key: "achats", icon: "📥", label: "Achats" },
  { key: "stock", icon: "📦", label: "Stock" },
  { key: "packs", icon: "🎁", label: "Packs" },
  { key: "inventaire", icon: "📋", label: "Inventaire" },
  { key: "depenses", icon: "💸", label: "Dépenses" },
  { key: "rapports", icon: "📈", label: "Rapports" },
];

// Navigation pour Zazatiana (commerce sans dépenses)
const zazatianaNavItems: NavItem[] = [
  { key: "dashboard", icon: "📊", label: "Accueil" },
  { key: "ventes", icon: "💰", label: "Ventes" },
  { key: "achats", icon: "📥", label: "Achats" },
  { key: "stock", icon: "📦", label: "Stock" },
  { key: "packs", icon: "🎁", label: "Packs" },
  { key: "inventaire", icon: "📋", label: "Inventaire" },
  { key: "depenses", icon: "💰", label: "Dépenses" },
  { key: "rapports", icon: "📈", label: "Rapports" },
];

interface SidebarProps {
  page: string;
  onNavigate: (key: string) => void;
  enCours: number;
}

export const Sidebar = ({ page, onNavigate, enCours }: SidebarProps) => {
  const { currentCompany } = useCompany();

  const getNavItems = (): NavItem[] => {
    if (!currentCompany) return [];
    if (currentCompany.type === "service") return serviceNavItems;
    if (currentCompany.slug === "pomanay") return pomanayNavItems;
    if (currentCompany.slug === "zazatiana") return zazatianaNavItems;
    return [];
  };

  const navItems = getNavItems();

  if (!currentCompany || navItems.length === 0) return null;

  return (
    <aside
      style={{
        width: "var(--sidebar-w)",
        background: "var(--card)",
        borderRight: "1px solid var(--border)",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: "var(--header-h)",
        height: "calc(100vh - var(--header-h))",
        overflowY: "auto",
      }}
    >
      {/* En-tête avec le nom de la société */}
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid var(--border)",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {currentCompany.type === "service"
            ? "🚚 LIVRAISON"
            : currentCompany.slug === "pomanay"
              ? "📱 BOUTIQUE"
              : "👶 BOUTIQUE"}
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#f1f5f9",
            marginTop: 4,
          }}
        >
          {currentCompany.name}
        </div>
      </div>

      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          padding: "8px 12px",
          flex: 1,
        }}
      >
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              borderRadius: 10,
              border: "none",
              background: page === item.key ? "var(--accent-dim)" : "transparent",
              color: page === item.key ? "var(--accent)" : "var(--text2)",
              fontSize: 13,
              fontWeight: page === item.key ? 600 : 400,
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (page !== item.key) {
                (e.currentTarget as HTMLElement).style.background = "var(--bg-tertiary)";
                (e.currentTarget as HTMLElement).style.color = "var(--text)";
              }
            }}
            onMouseLeave={(e) => {
              if (page !== item.key) {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.color = "var(--text2)";
              }
            }}
          >
            <span style={{ fontSize: 16, width: 24, textAlign: "center" }}>{item.icon}</span>
            <span>{item.label}</span>
            {item.key === "historique" && enCours > 0 && (
              <span
                style={{
                  marginLeft: "auto",
                  background: "#f59e0b",
                  color: "#000",
                  padding: "2px 8px",
                  fontSize: 10,
                  borderRadius: 20,
                  fontWeight: 600,
                }}
              >
                {enCours}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--border)",
          fontSize: 10,
          color: "var(--muted)",
        }}
      >
        🔒 Données sécurisées
      </div>
    </aside>
  );
};
