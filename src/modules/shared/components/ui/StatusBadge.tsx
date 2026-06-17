// ui/StatusBadge.tsx — Badge de statut spécialisé (100% Tailwind pur)
import { Badge } from "./Badge";

type StatusType =
| "pending"
| "in_progress"
| "completed"
| "cancelled"
| "active"
| "inactive"
| "delivered"
| "returned"
| "paid"
| "unpaid"
| "partial";

interface StatusBadgeProps {
  status: StatusType | string | undefined;
  className?: string;
}

const statusConfig: Record<string, {
  label: string;
  variant: "default" | "primary" | "success" | "danger" | "warning" | "info" | "purple";
}> = {
  pending: { label: "En attente", variant: "warning" },
  in_progress: { label: "En cours", variant: "primary" },
  completed: { label: "Terminé", variant: "success" },
  cancelled: { label: "Annulé", variant: "danger" },
  active: { label: "Actif", variant: "success" },
  inactive: { label: "Inactif", variant: "default" },
  delivered: { label: "Livré", variant: "success" },
  returned: { label: "Retourné", variant: "danger" },
  paid: { label: "Payé", variant: "success" },
  unpaid: { label: "Non payé", variant: "danger" },
  partial: { label: "Partiel", variant: "warning" },
  en_attente: { label: "En attente", variant: "warning" },
  en_cours: { label: "En cours", variant: "primary" },
  termine: { label: "Terminé", variant: "success" },
  annule: { label: "Annulé", variant: "danger" },
  livre: { label: "Livré", variant: "success" },
  retourne: { label: "Retourné", variant: "danger" },
  paye: { label: "Payé", variant: "success" },
  non_paye: { label: "Non payé", variant: "danger" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = status
  ? statusConfig[status] || { label: status, variant: "default" as const }
  : { label: "-", variant: "default" as const };

  return (
    <Badge variant={config.variant} dot className={className}>
    {config.label}
    </Badge>
  );
}

export default StatusBadge;
