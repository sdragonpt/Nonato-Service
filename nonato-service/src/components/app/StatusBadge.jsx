// StatusBadge — etiqueta de estado com cor vinda do mapa central
// (src/config/statusStyles.js).

import { Badge } from "@/components/ui/badge.jsx";
import { getStatusStyle } from "../../config/statusStyles.js";

/**
 * @param {string} domain   "agenda" | "order" | "priority" | "financial" | …
 * @param {string} status
 * @param {React.ComponentType} [icon]
 * @param {React.ReactNode} [children]  substitui o texto por defeito
 */
const StatusBadge = ({ domain, status, icon: Icon, children, className }) => {
  const { label, tone } = getStatusStyle(domain, status);
  return (
    <Badge variant={tone} className={className}>
      {Icon && <Icon className="mr-1 h-3 w-3" />}
      {children ?? label}
    </Badge>
  );
};

export default StatusBadge;
