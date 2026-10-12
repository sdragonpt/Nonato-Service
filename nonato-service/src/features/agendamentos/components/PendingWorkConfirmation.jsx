// PendingWorkConfirmation.jsx
// Trabalhos por confirmar: agendamentos cuja hora já passou e que ainda
// ninguém disse se foram realizados ou não (ver utils/workConfirmation.js).
// Mostra um cartão com a lista e abre um pop-up quando há trabalhos novos
// por confirmar. Usado na Agenda e na Dashboard.

import { useEffect, useMemo, useState } from "react";
import { useClients } from "../../../context/ClientsContext.jsx";
import { usePendingWorkConfirmations, confirmWork } from "../utils/workConfirmation.js";
import { AlertCircle, Check, Loader2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Button } from "@/components/ui/button.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";

// Agendamentos para os quais o pop-up já foi mostrado e adiado nesta sessão
// ("Decidir depois") — não volta a abrir por causa deles, só por novos.
const SEEN_KEY = "nonato-work-confirmation-seen";

const loadSeen = () => {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) || "[]"));
  } catch {
    return new Set();
  }
};

const formatWhen = (appointment) => {
  const [y, m, d] = appointment.data.split("-").map(Number);
  const date = new Date(y, m - 1, d).toLocaleDateString("pt-PT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
  return appointment.hora ? `${date} às ${appointment.hora}` : date;
};

const PendingRow = ({ appointment, clientName, busy, onConfirm }) => (
  <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <p className="text-white font-medium truncate">{clientName}</p>
      <p className="text-sm text-zinc-400">
        {formatWhen(appointment)}
        {appointment.tipoServico && ` · ${appointment.tipoServico}`}
        {appointment.tecnicoNome && ` · ${appointment.tecnicoNome}`}
      </p>
    </div>
    <div className="flex gap-2 shrink-0">
      <Button
        size="sm"
        disabled={busy}
        onClick={() => onConfirm(appointment, true)}
        className="border border-green-500/40 bg-green-500/15 text-green-400 hover:bg-green-500/30"
      >
        {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
        Realizado
      </Button>
      <Button
        size="sm"
        disabled={busy}
        onClick={() => onConfirm(appointment, false)}
        className="border border-red-500/40 bg-red-500/15 text-red-400 hover:bg-red-500/30"
      >
        <X className="h-4 w-4 mr-1" />
        Não realizado
      </Button>
    </div>
  </li>
);

const PendingWorkConfirmation = () => {
  const { pending } = usePendingWorkConfirmations();
  const { ensureClients, getClientById } = useClients();
  const [clientsReady, setClientsReady] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (pending.length === 0 || clientsReady) return;
    ensureClients()
      .catch((err) => console.error("Erro ao carregar clientes:", err))
      .finally(() => setClientsReady(true));
  }, [pending.length, clientsReady, ensureClients]);

  // Abre o pop-up quando aparece um trabalho por confirmar que ainda não foi
  // mostrado nesta sessão.
  const pendingIds = useMemo(() => pending.map((a) => a.id).join(","), [pending]);
  useEffect(() => {
    if (pending.length === 0) {
      setDialogOpen(false);
      return;
    }
    const seen = loadSeen();
    if (pending.some((a) => !seen.has(a.id))) setDialogOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingIds]);

  const handleDialogChange = (open) => {
    if (!open) {
      // "Decidir depois": não insistir nestes outra vez nesta sessão.
      try {
        const seen = loadSeen();
        pending.forEach((a) => seen.add(a.id));
        sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
      } catch {
        // sessionStorage indisponível — o pop-up só volta a abrir com trabalhos novos.
      }
    }
    setDialogOpen(open);
  };

  const handleConfirm = async (appointment, realizado) => {
    try {
      setBusyId(appointment.id);
      setError(null);
      await confirmWork(appointment.id, realizado);
      // A lista atualiza-se sozinha (onSnapshot em usePendingWorkConfirmations).
    } catch (err) {
      console.error("Erro ao confirmar trabalho:", err);
      setError("Não foi possível gravar. Tente novamente.");
    } finally {
      setBusyId(null);
    }
  };

  if (pending.length === 0) return null;

  const nameOf = (a) =>
    (a.clientId && getClientById(a.clientId)?.name) || a.newClientName || "Cliente";

  const list = (
    <ul className="divide-y divide-zinc-700">
      {pending.map((a) => (
        <PendingRow
          key={a.id}
          appointment={a}
          clientName={nameOf(a)}
          busy={busyId === a.id}
          onConfirm={handleConfirm}
        />
      ))}
    </ul>
  );

  return (
    <>
      <Card className="bg-zinc-800 border-amber-500/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center text-base">
            <AlertCircle className="h-4 w-4 mr-2 text-amber-400" />
            Trabalhos por confirmar
            <Badge variant="outline" className="ml-auto border-amber-500/40 text-amber-300">
              {pending.length}
            </Badge>
          </CardTitle>
          <p className="text-sm text-zinc-400">
            A hora destes agendamentos já passou. O trabalho foi realizado?
          </p>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-red-400 mb-2">{error}</p>}
          {list}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="bg-zinc-800 border-zinc-700 max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-400" />
              O trabalho foi realizado?
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {pending.length === 1
                ? "Há 1 agendamento cuja hora já passou."
                : `Há ${pending.length} agendamentos cuja hora já passou.`}{" "}
              Confirme se o trabalho foi feito.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {list}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleDialogChange(false)}
              className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-600"
            >
              Decidir depois
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PendingWorkConfirmation;
