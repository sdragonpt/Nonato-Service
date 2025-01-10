import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase.jsx";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Save,
  AlertCircle,
  Euro,
  Tag,
  FileText,
  Wrench,
} from "lucide-react";

const EditService = () => {
  const navigate = useNavigate();
  const { serviceId } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    value: "",
    type: "base",
    description: "",
  });

  useEffect(() => {
    const fetchService = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const serviceDoc = await getDoc(doc(db, "servicos", serviceId));

        if (serviceDoc.exists()) {
          const serviceData = serviceDoc.data();
          setFormData({
            name: serviceData.name || "",
            value: serviceData.value || "",
            type: serviceData.type || "base",
            description: serviceData.description || "",
          });
        } else {
          setError("Serviço não encontrado");
        }
      } catch (err) {
        console.error("Erro ao buscar serviço:", err);
        setError("Erro ao carregar serviço. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchService();
  }, [serviceId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.value) {
      setError("Nome e valor são obrigatórios");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const numericValue = Math.abs(Number(formData.value)) || 0;

      await updateDoc(doc(db, "servicos", serviceId), {
        ...formData,
        value: numericValue,
        updatedAt: new Date(),
      });

      navigate("/app/manage-services");
    } catch (err) {
      console.error("Erro ao atualizar serviço:", err);
      setError("Erro ao atualizar serviço. Por favor, tente novamente.");
    } finally {
      setIsSaving(false);
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
        Editar Serviço
      </h2>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-red-500">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações Básicas */}
        <div className="bg-gray-800 p-6 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Nome do Serviço
            </label>
            <div className="relative">
              <Wrench className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex: Manutenção Básica"
                className="w-full p-3 pl-10 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Valor
            </label>
            <div className="relative">
              <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                name="value"
                value={formData.value}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full p-3 pl-10 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>
        </div>

        {/* Tipo e Descrição */}
        <div className="bg-gray-800 p-6 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Tipo de Valor
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full p-3 pl-10 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="base">Valor Base</option>
                <option value="hour">Por Hora</option>
                <option value="day">Por Dia</option>
                <option value="km">Por Km</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Descrição
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-gray-400" />
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Descreva o serviço..."
                rows="4"
                className="w-full p-3 pl-10 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Botão Submit */}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
        >
          {isSaving ? (
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
      </form>
    </div>
  );
};

export default EditService;
