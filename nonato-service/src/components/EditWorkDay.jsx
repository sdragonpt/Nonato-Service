import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Save,
  AlertCircle,
  Calendar,
  Clock,
  Car,
  FileText,
  Coffee,
  Trash2,
} from "lucide-react";

const EditWorkday = () => {
  const { workdayId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

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

        setFormData(workdayDoc.data());
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

  const handleUpdate = async (e) => {
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
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm("Tem certeza que deseja excluir este dia de trabalho?")
    ) {
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);

      await deleteDoc(doc(db, "workdays", workdayId));
      navigate(-1);
    } catch (err) {
      console.error("Erro ao excluir:", err);
      setError("Erro ao excluir registro. Por favor, tente novamente.");
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all hover:scale-105 flex items-center justify-center"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <h2 className="text-2xl font-semibold text-center text-white mb-6">
        Editar Dia de Trabalho
      </h2>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-red-500">{error}</p>
        </div>
      )}

      <form onSubmit={handleUpdate} className="space-y-6">
        {/* Data */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center mb-4">
            <Calendar className="w-5 h-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-white">Data</h3>
          </div>
          <input
            type="date"
            name="workDate"
            value={formData.workDate}
            onChange={handleChange}
            className="w-full p-3 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            required
          />
        </div>

        {/* Horários de Ida */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center mb-4">
            <Clock className="w-5 h-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-white">Horários de Ida</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Saída</label>
              <input
                type="time"
                name="departureTime"
                value={formData.departureTime}
                onChange={handleChange}
                className="w-full p-3 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Chegada
              </label>
              <input
                type="time"
                name="arrivalTime"
                value={formData.arrivalTime}
                onChange={handleChange}
                className="w-full p-3 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Horário do Serviço */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center mb-4">
            <Clock className="w-5 h-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-white">
              Horário do Serviço
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Início</label>
              <input
                type="time"
                name="startHour"
                value={formData.startHour}
                onChange={handleChange}
                className="w-full p-3 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Fim</label>
              <input
                type="time"
                name="endHour"
                value={formData.endHour}
                onChange={handleChange}
                className="w-full p-3 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Horários de Retorno */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center mb-4">
            <Clock className="w-5 h-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-white">
              Horários de Retorno
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Saída</label>
              <input
                type="time"
                name="returnDepartureTime"
                value={formData.returnDepartureTime}
                onChange={handleChange}
                className="w-full p-3 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Chegada
              </label>
              <input
                type="time"
                name="returnArrivalTime"
                value={formData.returnArrivalTime}
                onChange={handleChange}
                className="w-full p-3 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Quilometragem */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center mb-4">
            <Car className="w-5 h-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-white">Quilometragem</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">KM Ida</label>
              <input
                type="number"
                name="kmDeparture"
                value={formData.kmDeparture}
                onChange={handleChange}
                className="w-full p-3 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                KM Volta
              </label>
              <input
                type="number"
                name="kmReturn"
                value={formData.kmReturn}
                onChange={handleChange}
                className="w-full p-3 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Pausa */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Coffee className="w-5 h-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-white">Pausa</h3>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="pause"
                checked={formData.pause}
                onChange={handleChange}
                className="sr-only"
              />
              <div
                className={`relative w-10 h-6 rounded-full transition-colors ${
                  formData.pause ? "bg-blue-500" : "bg-gray-600"
                }`}
              >
                <div
                  className={`absolute w-4 h-4 rounded-full bg-white top-1 transition-transform ${
                    formData.pause ? "left-5" : "left-1"
                  }`}
                />
              </div>
            </label>
          </div>

          {formData.pause && (
            <div className="mt-4">
              <label className="block text-sm text-gray-400 mb-1">
                Duração da Pausa
              </label>
              <input
                type="text"
                name="pauseHours"
                value={formData.pauseHours}
                onChange={handleChange}
                placeholder="00:00"
                pattern="^(0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$"
                className="w-full p-3 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Descrição */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center mb-4">
            <FileText className="w-5 h-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-white">Descrição</h3>
          </div>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Descreva o trabalho realizado..."
            rows="4"
            className="w-full p-3 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
          />
        </div>

        {/* Botões de ação */}
        <div className="flex flex-col space-y-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Salvar Alterações
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full p-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="w-5 h-5 mr-2" />
                Excluir Dia de Trabalho
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditWorkday;
