import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase.jsx";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Save,
  AlertCircle,
  Tag,
  Wrench,
} from "lucide-react";

const AddService = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "base",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError("Nome é obrigatório");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await addDoc(collection(db, "servicos"), {
        ...formData,
        createdAt: new Date(),
      });

      navigate("/app/manage-services");
    } catch (err) {
      console.error("Erro ao adicionar serviço:", err);
      setError("Erro ao adicionar serviço. Por favor, tente novamente.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all hover:scale-105 flex items-center justify-center"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <h2 className="text-2xl font-semibold text-center text-white mb-6">
        Novo Serviço
      </h2>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-red-500">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
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
                <option value="un">Despesa</option>
                <option value="hour">Por Hora</option>
                <option value="day">Por Dia</option>
                <option value="km">Por Km</option>
              </select>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Criar Serviço
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default AddService;
