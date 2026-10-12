// PendingWorkConfirmation.jsx
// Serviços por confirmar: agendamentos de dias que já passaram e para os
// quais ainda ninguém disse se o SERVIÇO foi mesmo realizado (isto é à parte
// do estado da marcação — ver utils/workConfirmation.js). Mostra um cartão
// com a lista e abre um pop-up quando há serviços novos por confirmar.
// Usado na Agenda e na Dashboard.

import { useEffect, useMemo, useState } from "react";
import { useClients } from "../../../context/ClientsContext.jsx";
import { useEquipments } from "../../../context/EquipmentsContext.jsx";
import { usePendingServiceConfirmations, confirmService } from "../utils/workConfirmation.js";
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

const yearOf = (appointment) => Number(appointment.data.split("-")[0]);

const formatWhen = (appointment) => {
  const [y, m, d] = appointment.data.split("-").map(Number);
  const date = new Date(y, m - 1, d).toLocaleDateString("pt-PT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
  return appointment.hora ? `${date} às ${appointment.hora}` : date;
};

// Várias marcações para o mesmo cliente, dia, hora e técnico são normais
// (ex.: três máquinas no mesmo cliente). Não são tratadas como erro: só se
// numeram ("2 de 3") e se mostra o equipamento/observações para as distinguir.
const groupKey = (a) =>
  [a.clientId || a.newClientName || "", a.data, a.hora || "", a.tecnicoId || ""].join("|");

const PendingRow = ({ appointment, clientName, equipmentName, position, busy, onConfirm }) => {
  const year = yearOf(appointment);
  const otherYear = year !== new Date().getFullYear();
  return (
    <li className="py-3 space-y-2">
      {/* O nome nunca empurra os botões: corta com "…" (nome completo ao passar o rato). */}
      <div className="min-w-0">
        <p className="text-white font-medium truncate" title={clientName}>
          {clientName}
        </p>
        <p className="text-sm text-zinc-400 break-words">
          {formatWhen(appointment)}
          {otherYear && (
            <span className="ml-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-xs font-semibold text-amber-300">
              ano {year} — confirme a data
            </span>
          )}
          {appointment.tipoServico && ` · ${appointment.tipoServico}`}
          {appointment.tecnicoNome && ` · ${appointment.tecnicoNome}`}
        </p>
        {(position || equipmentName || appointment.observacoes) && (
          <p className="text-xs text-zinc-500 break-words">
            {position && (
              <span className="mr-1 rounded bg-zinc-700 px-1.5 py-0.5 font-semibold text-zinc-200">
                {position.index} de {position.total}
              </span>
            )}
            {[equipmentName, appointment.observacoes].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
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
};

const PendingWorkConfirmation = () => {
  const { pending } = usePendingServiceConfirmations();
  const { ensureClients, getClientById } = useClients();
  const { ensureEquipments, getEquipmentById } = useEquipments();
  const [equipmentsReady, setEquipmentsReady] = useState(false);
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

  // Equipamentos: só se carregam se alguma marcação por confirmar tiver um.
  const needsEquipments = pending.some((a) => a.equipmentId);
  useEffect(() => {
    if (!needsEquipments || equipmentsReady) return;
    ensureEquipments()
      .catch((err) => console.error("Erro ao carregar equipamentos:", err))
      .finally(() => setEquipmentsReady(true));
  }, [needsEquipments, equipmentsReady, ensureEquipments]);

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
      await confirmService(appointment.id, realizado);
      // A lista atualiza-se sozinha (ver confirmService).
    } catch (err) {
      console.error("Erro ao confirmar trabalho:", err);
      setError("Não foi possível gravar. Tente novamente.");
    } finally {
      setBusyId(null);
    }
  };

  if (pending.length === 0) return null;

  // Numera as marcações que partilham cliente, dia, hora e técnico ("2 de 3").
  const totals = new Map();
  pending.forEach((a) => totals.set(groupKey(a), (totals.get(groupKey(a)) || 0) + 1));
  const counters = new Map();
  const positionOf = (a) => {
    const key = groupKey(a);
    if (totals.get(key) < 2) return null;
    counters.set(key, (counters.get(key) || 0) + 1);
    return { index: counters.get(key), total: totals.get(key) };
  };

  const equipmentNameOf = (a) => {
    const eq = a.equipmentId && equipmentsReady ? getEquipmentById(a.equipmentId) : null;
    return eq ? [eq.brand, eq.model].filter(Boolean).join(" ") : "";
  };

  const nameOf = (a) =>
    (a.clientId && getClientById(a.clientId)?.name) || a.newClientName || "Cliente";

  const list = (
    <ul className="min-w-0 divide-y divide-zinc-700">
      {pending.map((a) => (
        <PendingRow
          key={a.id}
          appointment={a}
          clientName={nameOf(a)}
          equipmentName={equipmentNameOf(a)}
          position={positionOf(a)}
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
            Serviços por confirmar
            <Badge variant="outline" className="ml-auto border-amber-500/40 text-amber-300">
              {pending.length}
            </Badge>
          </CardTitle>
          <p className="text-sm text-zinc-400">
            Estes agendamentos são de dias que já passaram. O serviço foi mesmo realizado?
          </p>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-red-400 mb-2">{error}</p>}
          {list}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="bg-zinc-800 border-zinc-700 max-w-xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-400" />
              O serviço foi realizado?
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {pending.length === 1
                ? "Há 1 agendamento de um dia que já passou."
                : `Há ${pending.length} agendamentos de dias que já passaram.`}{" "}
              Indique se o serviço foi mesmo feito. A marcação não muda de estado.
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
