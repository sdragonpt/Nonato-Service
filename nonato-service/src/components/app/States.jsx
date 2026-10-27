// Estados de página: vazio, a carregar e esqueletos.

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Lista vazia / sem resultados. */
export const EmptyState = ({ icon: Icon, title, description, action, className }) => (
  <div className={cn("surface flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
    {Icon && (
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" />
      </div>
    )}
    <p className="text-base font-medium">{title}</p>
    {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

/** Página inteira a carregar. */
export const PageLoader = ({ label }) => (
  <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
    {label && <p className="text-sm">{label}</p>}
  </div>
);

export const Skeleton = ({ className }) => <div className={cn("animate-pulse rounded-lg bg-muted", className)} />;

/** Esqueleto de uma grelha de cartões enquanto a lista carrega. */
export const CardGridSkeleton = ({ count = 6, className }) => (
  <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3", className)}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="surface space-y-3 p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
        <Skeleton className="h-3 w-full" />
      </div>
    ))}
  </div>
);
