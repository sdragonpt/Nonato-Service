import { useState, useEffect } from "react";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "../../../firebase.jsx";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  FileText,
  Save,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Plus,
  Trash2,
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

const AddAgendamento = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [error, setError] = useState(null);
  const [equipments, setEquipments] = useState([]);
  const [filteredEquipments, setFilteredEquipments] = useState([]);
  const [isMultipleDates, setIsMultipleDates] = useState(false);
  const [selectedDates, setSelectedDates] = useState([""]);
  const [singleDate, setSingleDate] = useState("");

  const [formData, setFormData] = useState({
    hora: "",
    clientId: "",
    tipoServico: "",
    observacoes: "",
    status: "agendado",
    prioridade: "normal",
    equipmentId: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [clientsSnapshot, equipmentsSnapshot] = await Promise.all([
          getDocs(collection(db, "clientes")),
          getDocs(collection(db, "equipamentos")),
        ]);

        const clientsData = clientsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setClients(clientsData);

        const equipmentsData = equipmentsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEquipments(equipmentsData);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError("Erro ao carregar dados. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

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

  const handleDateChange = (index, value) => {
    const newDates = [...selectedDates];
    newDates[index] = value;
    setSelectedDates(newDates);
  };

  const addDate = () => {
    setSelectedDates([...selectedDates, ""]);
  };

  const removeDate = (index) => {
    if (selectedDates.length > 1) {
      const newDates = selectedDates.filter((_, i) => i !== index);
      setSelectedDates(newDates);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsSaving(true);
      setError(null);

      if (isMultipleDates) {
        const agendamentosPromises = selectedDates.map((data) =>
          addDoc(collection(db, "agendamentos"), {
            ...formData,
            data,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        );

        await Promise.all(agendamentosPromises);
      } else {
        await addDoc(collection(db, "agendamentos"), {
          ...formData,
          data: singleDate,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      navigate("/app/manage-agenda");
    } catch (err) {
      console.error("Erro ao criar agendamentos:", err);
      setError("Erro ao salvar agendamentos. Por favor, tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
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
          <h1 className="text-2xl font-bold text-white">Novo Agendamento</h1>
          <p className="text-sm text-zinc-400">
            Adicione um novo agendamento ao sistema
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
        {/* Toggle buttons */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Tipo de Agendamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <div className="bg-zinc-900 p-1 rounded-xl inline-flex relative shadow-lg">
                <div
                  className={`absolute top-1 bottom-1 w-[120px] rounded-lg bg-green-600 transition-all duration-300 ease-in-out ${
                    isMultipleDates ? "translate-x-[120px]" : "translate-x-0"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setIsMultipleDates(false)}
                  className={`relative w-[120px] py-2 rounded-lg font-medium transition-colors duration-300 ${
                    !isMultipleDates
                      ? "text-white"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Data Única
                </button>
                <button
                  type="button"
                  onClick={() => setIsMultipleDates(true)}
                  className={`relative w-[120px] py-2 rounded-lg font-medium transition-colors duration-300 ${
                    isMultipleDates
                      ? "text-white"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Múltiplas
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dates and Time Card */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">Data e Hora</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isMultipleDates ? (
              <>
                {selectedDates.map((date, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-zinc-400 mb-1">
                        Data {index + 1}
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" />
                        <Input
                          type="date"
                          value={date}
                          onChange={(e) =>
                            handleDateChange(index, e.target.value)
                          }
                          className="pl-10 bg-zinc-900 border-zinc-700 text-white"
                          required
                        />
                      </div>
                    </div>
                    {selectedDates.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDate(index)}
                        className="mt-6 text-red-400 hover:text-red-300 hover:bg-zinc-700"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addDate}
                  className="w-full border-zinc-700 text-white hover:text-white hover:bg-zinc-700 bg-zinc-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar outra data
                </Button>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Data
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" />
                  <Input
                    type="date"
                    value={singleDate}
                    onChange={(e) => setSingleDate(e.target.value)}
                    className="pl-10 bg-zinc-900 border-zinc-700 text-white"
                    required
                  />
                </div>
              </div>
            )}

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
          disabled={
            isSaving ||
            (!isMultipleDates && !singleDate) ||
            (isMultipleDates && selectedDates.some((date) => !date))
          }
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
              {isMultipleDates
                ? `Criar ${selectedDates.length} Agendamentos`
                : "Criar Agendamento"}
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default AddAgendamento;
