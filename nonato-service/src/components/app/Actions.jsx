// Fab (botões flutuantes no telemóvel) e LoadMoreButton.

import { ArrowDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { cn } from "@/lib/utils";

/**
 * Botões redondos flutuantes, só no telemóvel (no desktop as mesmas ações
 * aparecem no PageHeader). O último da lista é o principal (verde).
 * @param {{ icon: React.ComponentType, label: string, onClick: () => void }[]} actions
 */
export const Fab = ({ actions = [], className }) => (
  <div
    className={cn(
      "fixed right-4 z-40 flex flex-col items-end gap-3 sm:hidden",
      "bottom-[calc(1.25rem+var(--safe-bottom))]",
      className
    )}
  >
    {actions.map(({ icon: Icon, label, onClick }, i) => {
      const primary = i === actions.length - 1;
      return (
        <Button
          key={label}
          type="button"
          size="icon"
          aria-label={label}
          title={label}
          onClick={onClick}
          variant={primary ? "default" : "glass"}
          className={cn("rounded-full", primary ? "h-14 w-14 shadow-glow" : "h-11 w-11")}
        >
          <Icon className={primary ? "!size-6" : "!size-5"} />
        </Button>
      );
    })}
  </div>
);

export const LoadMoreButton = ({ onClick, loading, label = "Carregar mais", className }) => (
  <div className={cn("flex justify-center", className)}>
    <Button variant="outline" onClick={onClick} disabled={loading} className="gap-2 rounded-full px-6">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDown className="h-4 w-4" />}
      {label}
    </Button>
  </div>
);
