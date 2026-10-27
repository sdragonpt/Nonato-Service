// FormSection / Field / FieldGrid — blocos dos formulários.
// Substituem os helpers locais FieldRow (clientes/equipamentos),
// FieldLabel (ordens/agenda) e Field (cadastro da empresa).

import { Input } from "@/components/ui/input.jsx";
import { cn } from "@/lib/utils";

/**
 * Atalho para o caso mais comum: Field + Input (com ícone opcional).
 * Os restantes props vão para o <Input> (name, value, onChange, type…).
 */
export const InputField = ({ label, icon, error, hint, required, className, inputClassName, ...inputProps }) => (
  <Field label={label} icon={icon} error={error} hint={hint} required={required} htmlFor={inputProps.id} className={className}>
    <Input
      {...inputProps}
      className={cn(icon && "pl-10", error && "border-red-500 focus-visible:ring-red-500/40", inputClassName)}
    />
  </Field>
);

/** Secção de formulário: cartão sólido com título. */
export const FormSection = ({ title, description, icon: Icon, actions, children, className }) => (
  <section className={cn("surface p-4 shadow-elev sm:p-6", className)}>
    {(title || actions) && (
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {actions}
      </div>
    )}
    <div className="space-y-4">{children}</div>
  </section>
);

/**
 * Campo: rótulo + controlo + ajuda/erro. Se `icon` vier, é desenhado dentro do
 * campo à esquerda (o controlo deve ter `className="pl-10"`).
 */
export const Field = ({ label, htmlFor, required, hint, error, icon: Icon, children, className }) => (
  <div className={cn("space-y-1.5", className)}>
    {label && (
      <label htmlFor={htmlFor} className="text-sm font-medium text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
    )}
    <div className="relative">
      {Icon && (
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      )}
      {children}
    </div>
    {error ? (
      <p className="text-xs text-red-400">{error}</p>
    ) : (
      hint && <p className="text-xs text-muted-foreground">{hint}</p>
    )}
  </div>
);

/** Grelha de campos (1 coluna no telemóvel). */
export const FieldGrid = ({ cols = 2, children, className }) => (
  <div
    className={cn(
      "grid grid-cols-1 gap-4",
      cols === 2 && "sm:grid-cols-2",
      cols === 3 && "sm:grid-cols-2 lg:grid-cols-3",
      className
    )}
  >
    {children}
  </div>
);
