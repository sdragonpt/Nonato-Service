// ClientFinancialStatus.jsx - Componente para mostrar e gerenciar status financeiro

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase.jsx";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Settings,
  Euro,
} from "lucide-react";

const ClientFinancialStatus = ({ client, onStatusUpdate }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState(client.financialStatus || "ok");
  const [isUpdating, setIsUpdating] = useState(false);

  // ✅ CONFIGURAÇÃO DE STATUS
  const statusConfig = {
    ok: {
      label: "Ok",
      color: "bg-green-500/10 text-green-500 border-green-500/30",
      icon: CheckCircle,
      description: "Cliente em dia com pagamentos",
    },
    pending: {
      label: "Pendente",
      color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
      icon: Clock,
      description: "Aguardando pagamento (menos de 1 mês)",
    },
    debtor: {
      label: "Devedor",
      color: "bg-red-500/10 text-red-500 border-red-500/30",
      icon: AlertTriangle,
      description: "Em atraso há mais de 1 mês",
    },
  };

  const currentStatus = statusConfig[client.financialStatus || "ok"];
  const StatusIcon = currentStatus.icon;

  // ✅ FUNÇÃO PARA ATUALIZAR STATUS
  const handleStatusUpdate = async () => {
    try {
      setIsUpdating(true);

      const statusUpdate = {
        financialStatus: newStatus,
        lastStatusUpdate: new Date(),
        statusHistory: [
          ...(client.statusHistory || []),
          {
            previousStatus: client.financialStatus,
            newStatus: newStatus,
            timestamp: new Date(),
            reason: "Manual update",
          },
        ],
      };

      await updateDoc(doc(db, "clientes", client.id), statusUpdate);

      if (onStatusUpdate) {
        onStatusUpdate({ ...client, ...statusUpdate });
      }

      setIsDialogOpen(false);
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      {/* Badge de Status */}
      <div className="flex items-center gap-2">
        <Badge className={`${currentStatus.color} flex items-center gap-1`}>
          <StatusIcon className="h-3 w-3" />
          {currentStatus.label}
        </Badge>

        {client.pendingAmount > 0 && (
          <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/30">
            <Euro className="h-3 w-3 mr-1" />
            {client.pendingAmount.toFixed(2)}€
          </Badge>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsDialogOpen(true)}
          className="h-6 w-6 p-0 hover:bg-zinc-700"
        >
          <Settings className="h-3 w-3" />
        </Button>
      </div>

      {/* Dialog para alterar status */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700 text-white">
          <DialogHeader>
            <DialogTitle>Alterar Status Financeiro</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Cliente: {client.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-400 mb-2 block">
                Novo Status
              </label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem
                      key={key}
                      value={key}
                      className="text-white hover:bg-zinc-700"
                    >
                      <div className="flex items-center gap-2">
                        <config.icon className="h-4 w-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-zinc-700/50 rounded-lg">
              <p className="text-sm text-zinc-300">
                {statusConfig[newStatus].description}
              </p>
            </div>

            {/* Histórico de mudanças */}
            {client.statusHistory?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-zinc-300 mb-2">
                  Histórico
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {client.statusHistory.slice(-3).map((change, index) => (
                    <div
                      key={index}
                      className="text-xs text-zinc-400 p-2 bg-zinc-700/30 rounded"
                    >
                      {statusConfig[change.previousStatus]?.label ||
                        change.previousStatus}{" "}
                      →{" "}
                      {statusConfig[change.newStatus]?.label ||
                        change.newStatus}
                      <span className="block">
                        {new Date(
                          change.timestamp.toDate?.() || change.timestamp
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="border-zinc-700 text-white hover:bg-zinc-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleStatusUpdate}
              disabled={isUpdating || newStatus === client.financialStatus}
              className="bg-green-600 hover:bg-green-700"
            >
              {isUpdating ? "Atualizando..." : "Atualizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ClientFinancialStatus;
