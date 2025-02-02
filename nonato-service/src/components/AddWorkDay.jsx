// AddWorkDay.jsx
import { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
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

const AddWorkday = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    workDate: new Date().toISOString().split("T")[0],
    departureTime: "",
    arrivalTime: "",
    kmDeparture: "",
    kmReturn: "",
    pause: false,
    pauseHours: "",
    returnDepartureTime: "",
    returnArrivalTime: "",
    startHour: "",
    endHour: "",
    description: "",
  });

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

    try {
      setIsLoading(true);
      setError(null);

      const workdayData = {
        ...formData,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Novo Dia de Trabalho
          </h1>
          <p className="text-sm text-zinc-400">
            Adicione um novo dia de trabalho à ordem de serviço
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
        {/* Date Card */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="flex items-center text-lg text-white">
              <Calendar className="w-5 h-5 mr-2 text-zinc-400" />
              Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="date"
                name="workDate"
                value={formData.workDate}
                onChange={handleChange}
                className="w-full pl-10 p-3 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Departure Times Card */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="flex items-center text-lg text-white">
              <Clock className="w-5 h-5 mr-2 text-zinc-400" />
              Horários de Ida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">
                  Saída
                </label>
                <input
                  type="time"
                  name="departureTime"
                  value={formData.departureTime}
                  onChange={handleChange}
                  className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">
                  Chegada
                </label>
                <input
                  type="time"
                  name="arrivalTime"
                  value={formData.arrivalTime}
                  onChange={handleChange}
                  className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service Hours Card */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="flex items-center text-lg text-white">
              <Clock className="w-5 h-5 mr-2 text-zinc-400" />
              Horário do Serviço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">
                  Início
                </label>
                <input
                  type="time"
                  name="startHour"
                  value={formData.startHour}
                  onChange={handleChange}
                  className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Fim</label>
                <input
                  type="time"
                  name="endHour"
                  value={formData.endHour}
                  onChange={handleChange}
                  className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Return Times Card */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="flex items-center text-lg text-white">
              <Clock className="w-5 h-5 mr-2 text-zinc-400" />
              Horários de Retorno
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">
                  Saída
                </label>
                <input
                  type="time"
                  name="returnDepartureTime"
                  value={formData.returnDepartureTime}
                  onChange={handleChange}
                  className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">
                  Chegada
                </label>
                <input
                  type="time"
                  name="returnArrivalTime"
                  value={formData.returnArrivalTime}
                  onChange={handleChange}
                  className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mileage Card */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="flex items-center text-lg text-white">
              <Car className="w-5 h-5 mr-2 text-zinc-400" />
              Quilometragem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">
                  KM Ida
                </label>
                <Input
                  type="number"
                  name="kmDeparture"
                  value={formData.kmDeparture}
                  onChange={handleChange}
                  placeholder="0"
                  className="bg-zinc-900 border-zinc-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">
                  KM Volta
                </label>
                <Input
                  type="number"
                  name="kmReturn"
                  value={formData.kmReturn}
                  onChange={handleChange}
                  placeholder="0"
                  className="bg-zinc-900 border-zinc-700 text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Break Card */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-lg text-white">
                <Coffee className="w-5 h-5 mr-2 text-zinc-400" />
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
                <label className="text-sm font-medium text-zinc-400">
                  Duração da Pausa
                </label>
                <Input
                  type="text"
                  name="pauseHours"
                  value={formData.pauseHours}
                  onChange={handleChange}
                  placeholder="00:00"
                  pattern="^(0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$"
                  className="bg-zinc-900 border-zinc-700 text-white"
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Description Card */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="flex items-center text-lg text-white">
              <FileText className="w-5 h-5 mr-2 text-zinc-400" />
              Descrição
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Descreva o trabalho realizado..."
              className="min-h-[100px] bg-zinc-900 border-zinc-700 text-white resize-none"
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-green-600 hover:bg-green-700"
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
