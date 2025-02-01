import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Save,
  AlertTriangle,
  Calendar,
  Clock,
  Car,
  FileText,
  Coffee,
  Trash2,
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

const EditWorkday = () => {
  const { workdayId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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
    startHour: "",
    endHour: "",
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
          data.workDate = data.workDate.toDate().toISOString().split("T")[0];
        }
        setFormData(data);
      } catch (err) {
        console.error("Erro ao buscar dados:", err);
        setError("Erro ao carregar dados. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkday();
  }, [workdayId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);

      await updateDoc(doc(db, "workdays", workdayId), {
        ...formData,
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
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Editar Dia de Trabalho
          </h1>
          <p className="text-sm text-zinc-400">
            Atualize as informações do dia de trabalho
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

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-2/3 bg-green-600 hover:bg-green-700"
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
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar exclusão</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem certeza que deseja excluir este dia de trabalho? Esta ação não
              pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-zinc-700 text-white hover:text-white hover:bg-zinc-700 bg-zinc-600"
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
