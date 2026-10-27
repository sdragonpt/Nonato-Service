// AddWorkDay.jsx
import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { useNavigate, useParams } from "react-router-dom";
import { useEquipments } from "../../context/EquipmentsContext.jsx";
import {
  Loader2,
  Plus,
  AlertTriangle,
  Calendar,
  Clock,
  Car,
  FileText,
  Coffee,
} from "lucide-react";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import MachineTimeBlocks, {
  emptyMachineBlock,
  sanitizeBlocksForSave,
  totalBlocksDurationMinutes,
} from "./components/MachineTimeBlocks.jsx";
import { toDateKey } from "../../utils/formatDate.js";
import { PageHeader } from "../../components/app";

const AddWorkday = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { ensureEquipments } = useEquipments();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEquipments, setIsLoadingEquipments] = useState(true);
  const [error, setError] = useState(null);
  const [equipmentOptions, setEquipmentOptions] = useState([]);

  const [formData, setFormData] = useState({
    workDate: toDateKey(),
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
  const [machineBlocks, setMachineBlocks] = useState([emptyMachineBlock()]);

  // Carrega as máquinas registadas do cliente desta ordem, para preencher o
  // seletor de máquinas em "Máquinas Trabalhadas"
  useEffect(() => {
    const fetchClientEquipments = async () => {
      try {
        setIsLoadingEquipments(true);
        if (!orderId) return;

        const orderSnap = await getDoc(doc(db, "ordens", orderId));
        if (!orderSnap.exists()) return;

        const orderData = orderSnap.data();
        if (!orderData.clientId || orderData.isUnregisteredClient) return;

        const allEquipments = await ensureEquipments();
        setEquipmentOptions(
          allEquipments.filter((e) => e.clientId === orderData.clientId)
        );
      } catch (err) {
        console.error("Erro ao carregar máquinas do cliente:", err);
      } finally {
        setIsLoadingEquipments(false);
      }
    };

    fetchClientEquipments();
  }, [orderId, ensureEquipments]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!orderId) {
      setError("ID do serviço não encontrado");
      return;
    }

    const cleanBlocks = sanitizeBlocksForSave(machineBlocks);
    if (cleanBlocks.some((b) => !b.startHour || !b.endHour)) {
      setError(
        "Preenche a hora de início e fim em todas as máquinas adicionadas."
      );
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Mantém startHour/endHour ao nível do dia (menor início / maior fim
      // entre as máquinas) por compatibilidade com relatórios/ecrãs antigos
      const starts = cleanBlocks.map((b) => b.startHour).filter(Boolean).sort();
      const ends = cleanBlocks.map((b) => b.endHour).filter(Boolean).sort();

      const workdayData = {
        ...formData,
        machineEntries: cleanBlocks,
        startHour: starts[0] || "",
        endHour: ends[ends.length - 1] || "",
        totalMachineMinutes: totalBlocksDurationMinutes(cleanBlocks),
        orderId,
        createdAt: new Date(),
      };

      await addDoc(collection(db, "workdays"), workdayData);
      navigate(-1);
    } catch (err) {
      console.error("Erro ao adicionar dia:", err);
      setError("Erro ao salvar. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Novo Dia de Trabalho"
        description="Adicione um novo dia de trabalho à ordem de serviço"
        icon={Clock}
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
              disabled={isLoadingEquipments}
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

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Adicionando...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Dia
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default AddWorkday;
