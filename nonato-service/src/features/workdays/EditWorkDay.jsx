import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { useEquipments } from "../../context/EquipmentsContext.jsx";
import {
  Loader2,
  Save,
  AlertTriangle,
  Calendar,
  Clock,
  Car,
  FileText,
  Coffee,
  Trash2,
  ClipboardEdit,
} from "lucide-react";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MachineTimeBlocks, {
  emptyMachineBlock,
  sanitizeBlocksForSave,
  totalBlocksDurationMinutes,
} from "./components/MachineTimeBlocks.jsx";
import { toDateKey } from "../../utils/formatDate.js";
import { PageHeader } from "../../components/app";

const EditWorkday = () => {
  const { workdayId } = useParams();
  const navigate = useNavigate();
  const { ensureEquipments } = useEquipments();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [equipmentOptions, setEquipmentOptions] = useState([]);
  const [machineBlocks, setMachineBlocks] = useState([emptyMachineBlock()]);

  const [formData, setFormData] = useState({
    workDate: "",
    departureTime: "",
    arrivalTime: "",
    kmDeparture: "",
    kmReturn: "",
    pause: false,
    pauseHours: "",
    returnDepartureTime: "",
    returnArrivalTime: "",
    description: "",
  });

  useEffect(() => {
    const fetchWorkday = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const workdayDoc = await getDoc(doc(db, "workdays", workdayId));

        if (!workdayDoc.exists()) {
          setError("Dia de trabalho não encontrado");
          return;
        }

        const data = workdayDoc.data();
        // If workDate is a Firestore timestamp, convert it
        if (data.workDate?.toDate) {
          data.workDate = toDateKey(data.workDate.toDate());
        }
        setFormData(data);

        // ✅ Migração suave: registos antigos só têm startHour/endHour ao
        // nível do dia (sem máquina associada) — transforma isso num único
        // bloco editável, em vez de perder a informação
        if (Array.isArray(data.machineEntries) && data.machineEntries.length > 0) {
          setMachineBlocks(
            data.machineEntries.map((entry) => ({
              ...emptyMachineBlock(),
              ...entry,
            }))
          );
        } else if (data.startHour || data.endHour) {
          setMachineBlocks([
            {
              ...emptyMachineBlock(),
              startHour: data.startHour || "",
              endHour: data.endHour || "",
            },
          ]);
        } else {
          setMachineBlocks([emptyMachineBlock()]);
        }

        // Carrega as máquinas registadas do cliente da ordem, para o seletor
        if (data.orderId) {
          const orderSnap = await getDoc(doc(db, "ordens", data.orderId));
          if (orderSnap.exists()) {
            const orderData = orderSnap.data();
            if (orderData.clientId && !orderData.isUnregisteredClient) {
              const allEquipments = await ensureEquipments();
              setEquipmentOptions(
                allEquipments.filter((e) => e.clientId === orderData.clientId)
              );
            }
          }
        }
      } catch (err) {
        console.error("Erro ao buscar dados:", err);
        setError("Erro ao carregar dados. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkday();
  }, [workdayId, ensureEquipments]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanBlocks = sanitizeBlocksForSave(machineBlocks);
    if (cleanBlocks.some((b) => !b.startHour || !b.endHour)) {
      setError(
        "Preenche a hora de início e fim em todas as máquinas adicionadas."
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const starts = cleanBlocks.map((b) => b.startHour).filter(Boolean).sort();
      const ends = cleanBlocks.map((b) => b.endHour).filter(Boolean).sort();

      await updateDoc(doc(db, "workdays", workdayId), {
        ...formData,
        machineEntries: cleanBlocks,
        startHour: starts[0] || "",
        endHour: ends[ends.length - 1] || "",
        totalMachineMinutes: totalBlocksDurationMinutes(cleanBlocks),
        lastUpdated: new Date(),
      });

      navigate(-1);
    } catch (err) {
      console.error("Erro ao atualizar:", err);
      setError("Erro ao salvar alterações. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);

      await deleteDoc(doc(db, "workdays", workdayId));
      navigate(-1);
    } catch (err) {
      console.error("Erro ao excluir:", err);
      setError("Erro ao excluir registro. Por favor, tente novamente.");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Editar Dia de Trabalho"
        description="Atualize as informações do dia de trabalho"
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
        {/* Date Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Calendar className="w-5 h-5 mr-2 text-muted-foreground" />
              Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="date"
                name="workDate"
                value={formData.workDate}
                onChange={handleChange}
                className="w-full pl-10 p-3 bg-muted/50 border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Departure Times Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Clock className="w-5 h-5 mr-2 text-muted-foreground" />
              Horários de Ida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Saída
                </label>
                <input
                  type="time"
                  name="departureTime"
                  value={formData.departureTime}
                  onChange={handleChange}
                  className="w-full p-3 bg-muted/50 border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Chegada
                </label>
                <input
                  type="time"
                  name="arrivalTime"
                  value={formData.arrivalTime}
                  onChange={handleChange}
                  className="w-full p-3 bg-muted/50 border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Machines Worked Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Clock className="w-5 h-5 mr-2 text-muted-foreground" />
              Máquinas Trabalhadas
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Regista cada máquina em que trabalhaste e as horas, mesmo que
              tenhas voltado à mesma máquina mais do que uma vez no dia.
            </p>
          </CardHeader>
          <CardContent>
            <MachineTimeBlocks
              blocks={machineBlocks}
              onChange={setMachineBlocks}
              equipmentOptions={equipmentOptions}
            />
          </CardContent>
        </Card>

        {/* Return Times Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Clock className="w-5 h-5 mr-2 text-muted-foreground" />
              Horários de Retorno
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Saída
                </label>
                <input
                  type="time"
                  name="returnDepartureTime"
                  value={formData.returnDepartureTime}
                  onChange={handleChange}
                  className="w-full p-3 bg-muted/50 border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Chegada
                </label>
                <input
                  type="time"
                  name="returnArrivalTime"
                  value={formData.returnArrivalTime}
                  onChange={handleChange}
                  className="w-full p-3 bg-muted/50 border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mileage Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Car className="w-5 h-5 mr-2 text-muted-foreground" />
              Quilometragem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  KM Ida
                </label>
                <Input
                  type="number"
                  name="kmDeparture"
                  value={formData.kmDeparture}
                  onChange={handleChange}
                  placeholder="0"
                 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  KM Volta
                </label>
                <Input
                  type="number"
                  name="kmReturn"
                  value={formData.kmReturn}
                  onChange={handleChange}
                  placeholder="0"
                 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Break Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-lg">
                <Coffee className="w-5 h-5 mr-2 text-muted-foreground" />
                Pausa
              </CardTitle>
              <Switch
                name="pause"
                checked={formData.pause}
                onCheckedChange={(checked) =>
                  handleChange({
                    target: { name: "pause", type: "checkbox", checked },
                  })
                }
              />
            </div>
          </CardHeader>
          {formData.pause && (
            <CardContent>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Duração da Pausa
                </label>
                <Input
                  type="text"
                  name="pauseHours"
                  value={formData.pauseHours}
                  onChange={handleChange}
                  placeholder="00:00"
                  pattern="^(0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$"
                 
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Description Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <FileText className="w-5 h-5 mr-2 text-muted-foreground" />
              Descrição
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Descreva o trabalho realizado..."
              className="min-h-[100px] resize-none"
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-2/3"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>

          <Button
            type="button"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={isDeleting}
            variant="destructive"
            className="w-full sm:w-1/3 bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirmar exclusão</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Tem certeza que deseja excluir este dia de trabalho? Esta ação não
              pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="bg-accent"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditWorkday;
