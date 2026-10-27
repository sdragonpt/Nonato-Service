// ConfirmDialog + useConfirm — confirmação única para toda a app.
// Substitui os window.confirm e os diálogos de "Tem certeza?" feitos à mão.
//
//   const confirm = useConfirm();
//   if (!(await confirm({ title: "Apagar cliente?", description: "…", destructive: true }))) return;

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";

/** Diálogo de confirmação controlado (para quem precisa de estado próprio, ex.: "a apagar…"). */
export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  loading = false,
  onConfirm,
}) => (
  <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {destructive && (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/15 text-red-400">
              <AlertTriangle className="h-4 w-4" />
            </span>
          )}
          {title}
        </DialogTitle>
        {description && <DialogDescription className="pt-1">{description}</DialogDescription>}
      </DialogHeader>
      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={destructive ? "destructive" : "default"} onClick={onConfirm} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {confirmLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const ConfirmContext = createContext(null);

/** Montado uma vez no shell; dá acesso a useConfirm() em qualquer página. */
export const ConfirmProvider = ({ children }) => {
  const [state, setState] = useState(null); // { title, description, confirmLabel, destructive }
  const resolver = useRef(null);

  const confirm = useCallback((options) => {
    setState({ confirmLabel: "Confirmar", ...options });
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (result) => {
    resolver.current?.(result);
    resolver.current = null;
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={Boolean(state)}
        onOpenChange={(open) => !open && close(false)}
        title={state?.title}
        description={state?.description}
        confirmLabel={state?.confirmLabel}
        cancelLabel={state?.cancelLabel}
        destructive={state?.destructive}
        onConfirm={() => close(true)}
      />
    </ConfirmContext.Provider>
  );
};

/** Devolve confirm(options) → Promise<boolean>. Sem provider, cai no window.confirm. */
export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  return ctx || ((options) => Promise.resolve(window.confirm(options?.title || "Confirmar?")));
};
