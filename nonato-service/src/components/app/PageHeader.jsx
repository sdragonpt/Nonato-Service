// PageHeader — cabeçalho único de todas as páginas do backoffice.
// Título + descrição, ícone opcional num quadrado verde, botão de voltar
// opcional e ações à direita (que passam para baixo no telemóvel).

import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { cn } from "@/lib/utils";

/**
 * @param {string} title
 * @param {React.ReactNode} [description]
 * @param {React.ComponentType} [icon]   ícone lucide
 * @param {React.ReactNode} [actions]    botões à direita
 * @param {boolean|string} [back]        true = voltar atrás; string = ir para esse caminho
 * @param {React.ReactNode} [badge]      selo ao lado do título (ex.: estado)
 * @param {React.ReactNode} [leading]    no lugar do ícone (ex.: foto com upload)
 */
const PageHeader = ({ title, description, icon: Icon, actions, back, badge, leading, children, className }) => {
  const navigate = useNavigate();

  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {back && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Voltar"
            onClick={() => (typeof back === "string" ? navigate(back) : navigate(-1))}
            className="shrink-0 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        {leading}
        {!leading && Icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-inset ring-primary/20">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
            {badge}
          </div>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      {children}
    </div>
  );
};

export default PageHeader;
