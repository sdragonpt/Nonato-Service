// QuickAddAppointmentDialog.jsx - Marcação rápida a partir de um clique no dia da Agenda
import { useState, useEffect, useMemo, useRef } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../../firebase.jsx";
import { useClients } from "../../../context/ClientsContext.jsx";
import { useEquipments } from "../../../context/EquipmentsContext.jsx";
import { useUsers } from "../../../context/UsersContext.jsx";
import {
  Search,
  Clock,
  FileText,
  Save,
  Loader2,
  AlertTriangle,
  UserCog,
  ChevronDown,
  X,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";

import { isStaffRole } from "../../../config/roles.js";
import {
  checkAgendaConflict,
  DEFAULT_DURATION_MINUTES,
} from "../utils/agendaConflicts.js";

const DURATION_CHIPS = [30, 60, 90, 120];

/**
 * Diálogo compacto para criar um agendamento a partir de um clique num dia
 * do calendário. Pede só o essencial (cliente, hora, serviço, técnico) e
 * esconde o resto (equipamento, duração, prioridade, observações) atrás de
 * "Mais opções" — pensado para ser rápido de preencher no telemóvel.
 */
const QuickAddAppointmentDialog = ({ open, onOpenChange, date, onCreated }) => {
  const { ensureClients } = useClients();
  const { ensureEquipments } = useEquipments();
  const { ensureUsers } = useUsers();
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);

  const [clients, setClients] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);

  const [clientSearch, setClientSearch] = useState("");
  const [clientResultsOpen, setClientResultsOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const searchBoxRef = useRef(null);

  const [showMoreOptions, setShowMoreOptions] = useState(false);

  const [formData, setFormData] = useState({
    hora: "",
    tipoServico: "",
    tecnicoId: "",
    equipmentId: "",
    duracaoMinutos: DEFAULT_DURATION_MINUTES,
    prioridade: "normal",
    observacoes: "",
  });

  // Carrega clientes/equipamentos/técnicos só quando o diálogo abre
  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      try {
        setIsLoadingData(true);
        setError(null);
        const [clientsData, equipmentsData, allUsers] = await Promise.all([
          ensureClients(),
          ensureEquipments(),
          ensureUsers(),
        ]);
        setClients(clientsData);
        setEquipments(equipmentsData);
        setStaffUsers(allUsers.filter((u) => isStaffRole(u.role)));
      } catch (err) {
        console.error("Erro ao carregar dados para marcação rápida:", err);
        setError("Erro ao carregar clientes. Tente novamente.");
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [open]);

  // Fecha a lista de resultados ao clicar fora do campo de pesquisa
  useEffect(() => {
    if (!clientResultsOpen) return;
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setClientResultsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [clientResultsOpen]);

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setClientSearch("");
      setSelectedClient(null);
      setClientResultsOpen(false);
      setShowMoreOptions(false);
      setError(null);
      setConflicts([]);
      setConflictDialogOpen(false);
      setFormData({
        hora: "",
        tipoServico: "",
        tecnicoId: "",
        equipmentId: "",
        duracaoMinutos: DEFAULT_DURATION_MINUTES,
        prioridade: "normal",
        observacoes: "",
      });
    }
  }, [open]);

  const filteredClients = useMemo(() => {
    const term = clientSearch.trim().toLowerCase();
    if (!term) return clients.slice(0, 8);
    return clients
      .filter((c) => c.name?.toLowerCase().includes(term))
      .slice(0, 8);
  }, [clients, clientSearch]);

  const clientEquipments = useMemo(() => {
    if (!selectedClient) return [];
    return equipments.filter((eq) => eq.clientId === selectedClient.id);
  }, [equipments, selectedClient]);

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setClientSearch(client.name || "");
    setClientResultsOpen(false);
    setFormData((prev) => ({ ...prev, equipmentId: "" }));
  };

  const handleClearClient = () => {
    setSelectedClient(null);
    setClientSearch("");
    setFormData((prev) => ({ ...prev, equipmentId: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!selectedClient) {
      setError("Selecione um cliente para o agendamento.");
      return;
    }
    if (!formData.hora) {
      setError("Escolha uma hora para o agendamento.");
      return;
    }

    try {
      setIsSaving(true);

      const foundConflicts = await checkAgendaConflict({
        date,
        hora: formData.hora,
        duracaoMinutos: formData.duracaoMinutos,
        tecnicoId: formData.tecnicoId,
      });

      if (foundConflicts.length > 0) {
        setConflicts(foundConflicts);
        setConflictDialogOpen(true);
        setIsSaving(false);
        return;
      }

      await createAppointment();
    } catch (err) {
      console.error("Erro ao verificar disponibilidade:", err);
      setError("Erro ao verificar disponibilidade. Tente novamente.");
      setIsSaving(false);
    }
  };

  const createAppointment = async () => {
    try {
      setIsSaving(true);
      const tecnico = staffUsers.find((u) => u.id === formData.tecnicoId);

      await addDoc(collection(db, "agendamentos"), {
        data: date,
        hora: formData.hora,
        clientId: selectedClient.id,
        tipoServico: formData.tipoServico,
        observacoes: formData.observacoes,
        status: "agendado",
        prioridade: formData.prioridade,
        equipmentId: formData.equipmentId,
        tecnicoId: formData.tecnicoId,
        tecnicoNome: tecnico?.displayName || "",
        duracaoMinutos:
          parseInt(formData.duracaoMinutos, 10) || DEFAULT_DURATION_MINUTES,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      onCreated?.();
      onOpenChange(false);
    } catch (err) {
      console.error("Erro ao criar agendamento:", err);
      setError("Erro ao salvar agendamento. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const formattedDate = date
    ? new Date(`${date}T00:00:00`).toLocaleDateString("pt-PT", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      })
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-800 border-zinc-700">
        <DialogHeader>
          <DialogTitle className="text-white">Novo Agendamento</DialogTitle>
          <DialogDescription className="text-zinc-400 capitalize">
            {formattedDate}
          </DialogDescription>
        </DialogHeader>

        {isLoadingData ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Cliente - com pesquisa */}
            <div className="relative" ref={searchBoxRef}>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Cliente *
              </label>
              {selectedClient ? (
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700">
                  <span className="text-white text-sm truncate">
                    {selectedClient.name}
                  </span>
                  <button
                    type="button"
                    onClick={handleClearClient}
                    className="text-zinc-400 hover:text-white shrink-0 ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      setClientResultsOpen(true);
                    }}
                    onFocus={() => setClientResultsOpen(true)}
                    placeholder="Pesquisar cliente..."
                    className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                  />
                  {clientResultsOpen && filteredClients.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-lg">
                      {filteredClients.map((client) => (
                        <button
                          type="button"
                          key={client.id}
                          onClick={() => handleSelectClient(client)}
                          className="w-full text-left px-3 py-2 text-sm text-white hover:bg-zinc-700 transition-colors"
                        >
                          {client.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Hora */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Hora *
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  type="time"
                  value={formData.hora}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, hora: e.target.value }))
                  }
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white"
                  required
                />
              </div>
            </div>

            {/* Tipo de Serviço */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Tipo de Serviço
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  value={formData.tipoServico}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      tipoServico: e.target.value,
                    }))
                  }
                  placeholder="Descreva o tipo de serviço"
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>
            </div>

            {/* Técnico */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Técnico Responsável
              </label>
              <Select
                value={formData.tecnicoId || "none"}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    tecnicoId: value === "none" ? "" : value,
                  }))
                }
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white pl-10 relative">
                  <UserCog className="absolute left-3 h-4 w-4 text-zinc-400" />
                  <SelectValue placeholder="Por atribuir" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="none" className="text-white hover:bg-zinc-700">
                    Por atribuir
                  </SelectItem>
                  {staffUsers.map((user) => (
                    <SelectItem
                      key={user.id}
                      value={user.id}
                      className="text-white hover:bg-zinc-700"
                    >
                      {user.displayName || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duração - chips rápidos */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Duração
              </label>
              <div className="flex flex-wrap gap-2">
                {DURATION_CHIPS.map((minutes) => (
                  <button
                    type="button"
                    key={minutes}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        duracaoMinutos: minutes,
                      }))
                    }
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      Number(formData.duracaoMinutos) === minutes
                        ? "bg-green-600 border-green-600 text-white"
                        : "bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-600"
                    }`}
                  >
                    {minutes} min
                  </button>
                ))}
              </div>
            </div>

            {/* Mais opções */}
            <button
              type="button"
              onClick={() => setShowMoreOptions((prev) => !prev)}
              className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  showMoreOptions ? "rotate-180" : ""
                }`}
              />
              Mais opções
            </button>

            {showMoreOptions && (
              <div className="space-y-4 pt-1">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Equipamento
                  </label>
                  <Select
                    value={formData.equipmentId || "none"}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        equipmentId: value === "none" ? "" : value,
                      }))
                    }
                    disabled={!selectedClient}
                  >
                    <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                      <SelectValue placeholder="Selecione um equipamento" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="none" className="text-white hover:bg-zinc-700">
                        Nenhum
                      </SelectItem>
                      {clientEquipments.map((equipment) => (
                        <SelectItem
                          key={equipment.id}
                          value={equipment.id}
                          className="text-white hover:bg-zinc-700"
                        >
                          {equipment.brand} - {equipment.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Prioridade
                  </label>
                  <Select
                    value={formData.prioridade}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, prioridade: value }))
                    }
                  >
                    <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                      <SelectValue placeholder="Selecione a prioridade" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="baixa" className="text-white hover:bg-zinc-700">
                        Baixa
                      </SelectItem>
                      <SelectItem value="normal" className="text-white hover:bg-zinc-700">
                        Normal
                      </SelectItem>
                      <SelectItem value="alta" className="text-white hover:bg-zinc-700">
                        Alta
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Observações
                  </label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        observacoes: e.target.value,
                      }))
                    }
                    rows="3"
                    placeholder="Adicione observações importantes"
                    className="w-full p-3 bg-zinc-900 text-white rounded-lg border border-zinc-700 focus:ring-2 focus:ring-green-500 focus:outline-none resize-none placeholder:text-zinc-500 text-sm"
                  />
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="border-red-500 bg-red-500/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-red-400">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-600"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Criar Agendamento
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>

      {/* Conflito de horário */}
      <Dialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Conflito de horário
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {formData.tecnicoId ? "Este técnico já tem " : "Já existe "}
              {conflicts.length === 1
                ? "um agendamento"
                : `${conflicts.length} agendamentos`}{" "}
              que se sobrepõe ao horário escolhido:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {conflicts.map((c) => (
              <div
                key={c.id}
                className="p-3 bg-zinc-700/50 rounded-lg border border-zinc-600 text-sm"
              >
                <p className="text-white font-medium">
                  {c.data} às {c.hora} (
                  {c.duracaoMinutos || DEFAULT_DURATION_MINUTES} min)
                </p>
                <p className="text-zinc-400">
                  {c.tipoServico || "Sem descrição"}
                </p>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConflictDialogOpen(false)}
              className="border-zinc-700 text-white hover:text-white hover:bg-zinc-700 bg-zinc-600"
            >
              Alterar horário
            </Button>
            <Button
              onClick={async () => {
                setConflictDialogOpen(false);
                await createAppointment();
              }}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Agendar mesmo assim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default QuickAddAppointmentDialog;
