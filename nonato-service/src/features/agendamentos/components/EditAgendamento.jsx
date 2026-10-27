import { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../firebase.jsx";
import { useClients } from "../../../context/ClientsContext.jsx";
import { useEquipments } from "../../../context/EquipmentsContext.jsx";
import { useUsers } from "../../../context/UsersContext.jsx";
import { useNavigate, useParams } from "react-router-dom";
import {
  Calendar,
  Clock,
  FileText,
  Save,
  Loader2,
  AlertTriangle,
  Timer,
  UserCog,
  Printer,
  AlertCircle,
  ClipboardEdit,
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
import { ClientCombobox } from "@/components/shared/ClientCombobox.jsx";

import { isStaffRole } from "../../../config/roles.js";
import {
  checkAgendaConflict,
  DEFAULT_DURATION_MINUTES,
  minutesToTime,
  timeToMinutes,
} from "../utils/agendaConflicts.js";
import { PageHeader, Field, PageLoader } from "../../../components/app";


const EditAgendamento = () => {
  const { agendamentoId } = useParams();
  const navigate = useNavigate();
  const { ensureClients } = useClients();
  const { ensureEquipments } = useEquipments();
  const { ensureUsers } = useUsers();
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

        // Fetch clients/equipments/users from the shared contexts, in parallel
        const [clientsData, equipmentsData, allUsers] = await Promise.all([
          ensureClients(),
          ensureEquipments(),
          ensureUsers(),
        ]);
        setClients(clientsData);
        setEquipments(equipmentsData);
        setStaffUsers(allUsers.filter((u) => isStaffRole(u.role)));

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
      <PageLoader />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Editar Agendamento"
        description="Atualize as informações do agendamento"
        icon={ClipboardEdit}
        back
      />

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date and Time Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Data e Hora</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Field label="Data" icon={Calendar}>
                <Input
                  type="date"
                  value={selectedDates[0]}
                  className="pl-10 bg-background/50 text-muted-foreground cursor-not-allowed"
                  disabled
                />
              </Field>
              <p className="text-sm text-muted-foreground mt-1">
                A data não pode ser alterada após o agendamento
              </p>
            </div>

            <Field label="Hora" icon={Clock}>
              <Input
                type="time"
                name="hora"
                value={formData.hora}
                onChange={handleChange}
                className="pl-10"
                required
              />
            </Field>
          </CardContent>
        </Card>

        {/* Client and Service Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Detalhes do Agendamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Cliente
              </label>
              <ClientCombobox
                clients={clients}
                value={formData.clientId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, clientId: value }))
                }
              />
            </div>

            <Field label="Equipamento" icon={Printer}>
              <Select
                value={formData.equipmentId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, equipmentId: value }))
                }
                disabled={!formData.clientId}
              >
                <SelectTrigger className="w-full pl-10">
                  <SelectValue placeholder="Selecione um equipamento" />
                </SelectTrigger>
                <SelectContent>
                  {filteredEquipments.map((equipment) => (
                    <SelectItem
                      key={equipment.id}
                      value={equipment.id}
                    >
                      {equipment.brand} - {equipment.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Tipo de Serviço" icon={FileText}>
              <Input
                type="text"
                name="tipoServico"
                value={formData.tipoServico}
                onChange={handleChange}
                placeholder="Descreva o tipo de serviço"
                className="pl-10"
                required
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Técnico Responsável" icon={UserCog}>
                <Select
                  value={formData.tecnicoId || "none"}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      tecnicoId: value === "none" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger className="w-full pl-10">
                    <SelectValue placeholder="Por atribuir" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      Por atribuir
                    </SelectItem>
                    {staffUsers.map((user) => (
                      <SelectItem
                        key={user.id}
                        value={user.id}
                      >
                        {user.displayName || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <div>
                <Field label="Duração (minutos)" icon={Timer}>
                  <Input
                    type="number"
                    min="15"
                    step="15"
                    name="duracaoMinutos"
                    value={formData.duracaoMinutos}
                    onChange={handleChange}
                    className="pl-10"
                  />
                </Field>
                {formData.hora && (
                  <p className="text-xs text-muted-foreground mt-1">
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Prioridade e Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Prioridade" icon={AlertCircle}>
              <Select
                value={formData.prioridade}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, prioridade: value }))
                }
              >
                <SelectTrigger className="w-full pl-10">
                  <SelectValue placeholder="Selecione a prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    value="baixa"
                  >
                    Baixa
                  </SelectItem>
                  <SelectItem
                    value="normal"
                  >
                    Normal
                  </SelectItem>
                  <SelectItem
                    value="alta"
                  >
                    Alta
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Status" icon={Clock}>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger className="w-full pl-10">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    value="agendado"
                  >
                    Agendado
                  </SelectItem>
                  <SelectItem
                    value="confirmado"
                  >
                    Confirmado
                  </SelectItem>
                  <SelectItem
                    value="cancelado"
                  >
                    Cancelado
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        {/* Notes Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              name="observacoes"
              value={formData.observacoes}
              onChange={handleChange}
              rows="4"
              placeholder="Adicione observações importantes"
              className="w-full p-3 bg-muted/50 text-foreground rounded-lg border border-border focus:ring-2 focus:ring-ring focus:outline-none resize-none placeholder:text-muted-foreground"
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSaving}
          className="w-full"
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Conflito de horário
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
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
                className="p-3 bg-muted/50 rounded-lg border border-border text-sm"
              >
                <p className="text-foreground font-medium">
                  {c.data} às {c.hora} ({c.duracaoMinutos || DEFAULT_DURATION_MINUTES} min)
                </p>
                <p className="text-muted-foreground">{c.tipoServico || "Sem descrição"}</p>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConflictDialogOpen(false)}
              className="bg-accent"
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
