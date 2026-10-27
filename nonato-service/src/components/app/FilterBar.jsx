// FilterBar + SearchInput — barra de pesquisa e filtros no topo das listas.

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input.jsx";
import { cn } from "@/lib/utils";

/** Contentor dos filtros: pesquisa à esquerda, selects/botões à direita. */
export const FilterBar = ({ children, footer, className }) => (
  <div className={cn("surface p-3 sm:p-4", className)}>
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">{children}</div>
    {footer && (
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm text-muted-foreground">
        {footer}
      </div>
    )}
  </div>
);

/**
 * Campo de pesquisa com lupa e botão para limpar.
 * @param {string} value
 * @param {(value: string) => void} onChange   recebe o texto (não o evento)
 */
export const SearchInput = ({ value, onChange, placeholder = "Pesquisar…", className, autoFocus }) => (
  <div className={cn("relative w-full lg:max-w-md", className)}>
    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className="pl-9 pr-9"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange("")}
        aria-label="Limpar pesquisa"
        className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    )}
  </div>
);
