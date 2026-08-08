import { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "../../../firebase.jsx";
import { useClients } from "../../../context/ClientsContext.jsx";
import { useNavigate, useParams } from "react-router-dom";
import {
  Calendar,
  Clock,
  FileText,
  Save,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Timer,
  UserCog,
} from "lucide-react";

// UI Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";

import { isStaffRole } from "../../../config/roles.js";
import {
  checkAgendaConflict,
  DEFAULT_DURATION_MINUTES,
  minutesToTime,
  timeToMinutes,
} from "../utils/agendaConflicts.js";

const EditAgendamento = () => {
  const { agendamentoId } = useParams();
  const navigate = useNavigate();
  const { ensureClients } = useClients();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDateLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [error, setError] = useState(null);
  const [equipments, setEquipments] = useState([]);
  const [filteredEquipments, setFilteredEquipments] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [selectedDates, setSelectedDates] = useState([""]);
  const [, setOriginalAgendamento] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    hora: "",
    clientId: "",
    tipoServico: "",
    observacoes: "",
    status: "",
    prioridade: "",
    equipmentId: "",
    tecnicoId: "",
    duracaoMinutos: DEFAULT_DURATION_MINUTES,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch current appointment data
        const agendamentoDoc = await getDoc(
          doc(db, "agendamentos", agendamentoId)
        );

        if (!agendamentoDoc.exists()) {
          setError("Agendamento não encontrado");
          return;
        }

        const agendamentoData = agendamentoDoc.data();
        setOriginalAgendamento(agendamentoData);
        setSelectedDates([agendamentoData.data]);

        // Fetch clients (shared ClientsContext), equipment and staff users in parallel
        const [clientsData, equipmentsSnapshot, usersSnapshot] = await Promise.all([
          ensureClients(),
          getDocs(collection(db, "equipamentos")),
          getDocs(collection(db, "users")),
        ]);
        setClients(clientsData);

        const equipmentsData = equipmentsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEquipments(equipmentsData);

        const usersData = usersSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((u) => isStaffRole(u.role));
        setStaffUsers(usersData);

        // Set form data with existing data
        setFormData({
          hora: agendamentoData.hora,
          clientId: agendamentoData.clientId,
          tipoServico: agendamentoData.tipoServico,
          observacoes: agendamentoData.observacoes,
          status: agendamentoData.status,
          prioridade: agendamentoData.prioridade,
          equipmentId: agendamentoData.equipmentId,
          tecnicoId: agendamentoData.tecnicoId || "",
          duracaoMinutos: agendamentoData.duracaoMinutos || DEFAULT_DURATION_MINUTES,
        });

        // Filter equipment for selected client
        if (agendamentoData.clientId) {
          const filtered = equipmentsData.filter(
            (eq) => eq.clientId === agendamentoData.clientId
          );
          setFilteredEquipments(filtered);
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError("Erro ao carregar dados. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [agendamentoId]);

  useEffect(() => {
    if (formData.clientId) {
      const filtered = equipments.filter(
        (eq) => eq.clientId === formData.clientId
      );
      setFilteredEquipments(filtered);
      if (!filtered.find((eq) => eq.id === formData.equipmentId)) {
        setFormData((prev) => ({ ...prev, equipmentId: "" }));
      }
    } else {
      setFilteredEquipments([]);
    }
  }, [formData.clientId, equipments]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Removed date manipulation functions as they're no longer needed
  // The date is now read-only and can't be modified

  const saveAgendamento = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const tecnico = staffUsers.find((u) => u.id === formData.tecnicoId);

      const agendamentoRef = doc(db, "agendamentos", agendamentoId);
      await updateDoc(agendamentoRef, {
        ...formData,
        duracaoMinutos: parseInt(formData.duracaoMinutos, 10) || DEFAULT_DURATION_MINUTES,
        tecnicoNome: tecnico?.displayName || "",
        updatedAt: new Date(),
      });

      navigate(-1);
    } catch (err) {
      console.error("Erro ao atualizar:", err);
      setError("Erro ao salvar alterações. Por favor, tente novamente.");
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.clientId) {
      setError("Selecione um cliente para o agendamento.");
      return;
    }

    try {
      setIsSaving(true);
      const foundConflicts = await checkAgendaConflict({
        date: selectedDates[0],
        hora: formData.hora,
        duracaoMinutos: formData.duracaoMinutos,
        tecnicoId: formData.tecnicoId,
        excludeId: agendamentoId,
      });

      if (foundConflicts.length > 0) {
        setConflicts(foundConflicts);
        setConflictDialogOpen(true);
        setIsSaving(false);
        return;
      }

      await saveAgendamento();
    } catch (err) {
      console.error("Erro ao verificar conflitos:", err);
      setError("Erro ao verificar disponibilidade. Tente novamente.");
      setIsSaving(false);
    }
  };

  if (isLoading || isSaving || isDateLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Editar Agendamento</h1>
          <p className="text-sm text-zinc-400">
            Atualize as informações do agendamento
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-10 w-10 rounded-full border-zinc-700 text-white hover:bg-green-700 bg-green-600"
        >
          <ArrowLeft className="h-4 w-4 text-white" />
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date and Time Card */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">Data e Hora</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Data
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" />
                <Input
                  type="date"
                  value={selectedDates[0]}
                  className="pl-10 bg-zinc-900/50 border-zinc-700 text-zinc-400 cursor-not-allowed"
                  disabled
                />
              </div>
              <p className="text-sm text-zinc-500 mt-1">
                A data não pode ser alterada após o agendamento
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Hora
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" />
                <Input
                  type="time"
                  name="hora"
                  value={formData.hora}
                  onChange={handleChange}
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client and Service Details Card */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Detalhes do Agendamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Cliente
              </label>
              <Select
                value={formData.clientId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, clientId: value }))
                }
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {clients.map((client) => (
                    <SelectItem
                      key={client.id}
                      value={client.id}
                      className="text-white hover:bg-zinc-700"
                    >
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Equipamento
              </label>
              <Select
                value={formData.equipmentId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, equipmentId: value }))
                }
                disabled={!formData.clientId}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                  <SelectValue placeholder="Selecione um equipamento" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {filteredEquipments.map((equipment) => (
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
                Tipo de Serviço
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" />
                <Input
                  type="text"
                  name="tipoServico"
                  value={formData.tipoServico}
                  onChange={handleChange}
                  placeholder="Descreva o tipo de serviço"
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Duração (minutos)
                </label>
                <div className="relative">
                  <Timer className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" />
                  <Input
                    type="number"
                    min="15"
                    step="15"
                    name="duracaoMinutos"
                    value={formData.duracaoMinutos}
                    onChange={handleChange}
                    className="pl-10 bg-zinc-900 border-zinc-700 text-white"
                  />
                </div>
                {formData.hora && (
                  <p className="text-xs text-zinc-500 mt-1">
                    Termina às{" "}
                    {minutesToTime(
                      timeToMinutes(formData.hora) +
                        (parseInt(formData.duracaoMinutos, 10) || DEFAULT_DURATION_MINUTES)
                    )}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Priority and Status Card */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Prioridade e Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  <SelectItem
                    value="baixa"
                    className="text-white hover:bg-zinc-700"
                  >
                    Baixa
                  </SelectItem>
                  <SelectItem
                    value="normal"
                    className="text-white hover:bg-zinc-700"
                  >
                    Normal
                  </SelectItem>
                  <SelectItem
                    value="alta"
                    className="text-white hover:bg-zinc-700"
                  >
                    Alta
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Status
              </label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem
                    value="agendado"
                    className="text-white hover:bg-zinc-700"
                  >
                    Agendado
                  </SelectItem>
                  <SelectItem
                    value="confirmado"
                    className="text-white hover:bg-zinc-700"
                  >
                    Confirmado
                  </SelectItem>
                  <SelectItem
                    value="cancelado"
                    className="text-white hover:bg-zinc-700"
                  >
                    Cancelado
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notes Card */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              name="observacoes"
              value={formData.observacoes}
              onChange={handleChange}
              rows="4"
              placeholder="Adicione observações importantes"
              className="w-full p-3 bg-zinc-900 text-white rounded-lg border border-zinc-700 focus:ring-2 focus:ring-green-500 focus:outline-none resize-none placeholder:text-zinc-500"
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSaving}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar{" "}
              {selectedDates.length > 1
                ? `${selectedDates.length} Agendamentos`
                : "Agendamento"}
            </>
          )}
        </Button>
      </form>

      {/* Conflito de Horário */}
      <Dialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Conflito de horário
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {formData.tecnicoId
                ? "Este técnico já tem "
                : "Já existe "}
              {conflicts.length === 1 ? "um agendamento" : `${conflicts.length} agendamentos`}{" "}
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
                  {c.data} às {c.hora} ({c.duracaoMinutos || DEFAULT_DURATION_MINUTES} min)
                </p>
                <p className="text-zinc-400">{c.tipoServico || "Sem descrição"}</p>
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
                await saveAgendamento();
              }}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Guardar mesmo assim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditAgendamento;
