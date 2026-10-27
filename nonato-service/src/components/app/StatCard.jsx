// StatCard / StatGrid — cartões de números (KPIs) no topo das páginas.
// Sólidos (sem blur): aparecem em grelha e repetidos, ver nota em index.css.

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  default: "bg-primary/15 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/15 text-red-400",
  info: "bg-info/15 text-info",
  muted: "bg-muted text-muted-foreground",
  violet: "bg-violet-500/15 text-violet-400",
};

/**
 * @param {string} label
 * @param {React.ReactNode} value
 * @param {React.ComponentType} [icon]
 * @param {"default"|"success"|"warning"|"danger"|"info"|"muted"|"violet"} [tone]
 * @param {React.ReactNode} [hint]     linha pequena por baixo do valor
 * @param {boolean} [loading]
 * @param {boolean} [active]           realce quando o cartão funciona como filtro
 * @param {() => void} [onClick]       torna o cartão clicável (filtro)
 */
export const StatCard = ({ label, value, icon: Icon, tone = "default", hint, loading, active, onClick, className }) => {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "group relative flex items-center justify-between gap-3 overflow-hidden rounded-xl border bg-card p-4 text-left shadow-elev sm:p-5",
        "bg-gradient-to-br from-white/[0.03] to-transparent",
        onClick && "transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        active && "border-primary/60 ring-1 ring-primary/40",
        className
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">
          {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : value}
        </div>
        {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
      {Icon && (
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", TONES[tone] || TONES.default)}>
          <Icon className="h-5 w-5" />
        </div>
      )}
    </Comp>
  );
};

/** Grelha responsiva para StatCards (2 colunas no telemóvel). */
export const StatGrid = ({ cols = 4, children, className }) => (
  <div
    className={cn(
      "grid grid-cols-2 gap-3 sm:gap-4",
      cols === 2 && "lg:grid-cols-2",
      cols === 3 && "lg:grid-cols-3",
      cols === 4 && "lg:grid-cols-4",
      className
    )}
  >
    {children}
  </div>
);
