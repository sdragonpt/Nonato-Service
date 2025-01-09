import React, { useState, useEffect } from "react";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase.jsx";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  User,
  FileText,
  Save,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Printer,
} from "lucide-react";

const AddAgendamento = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [error, setError] = useState(null);
  const [equipments, setEquipments] = useState([]);
  const [filteredEquipments, setFilteredEquipments] = useState([]);

  const [formData, setFormData] = useState({
    data: "",
    hora: "",
    clientId: "",
    tipoServico: "",
    observacoes: "",
    status: "agendado", // agendado, confirmado, cancelado
    prioridade: "normal", // baixa, normal, alta
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Buscar clientes e equipamentos em paralelo
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
      // Resetar equipamento selecionado se não existir para este cliente
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsLoading(true);
      setError(null);

      await addDoc(collection(db, "agendamentos"), {
        ...formData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      navigate("/app/manage-agenda");
    } catch (err) {
      console.error("Erro ao criar agendamento:", err);
      setError("Erro ao salvar agendamento. Por favor, tente novamente.");
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
        Novo Agendamento
      </h2>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-red-500">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Data e Hora */}
        <div className="bg-gray-800 p-6 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Data
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                name="data"
                value={formData.data}
                onChange={handleChange}
                className="w-full p-3 pl-10 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Hora
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="time"
                name="hora"
                value={formData.hora}
                onChange={handleChange}
                className="w-full p-3 pl-10 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>
        </div>

        {/* Cliente e Tipo de Serviço */}
        <div className="bg-gray-800 p-6 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Cliente
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                name="clientId"
                value={formData.clientId}
                onChange={handleChange}
                className="w-full p-3 pl-10 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              >
                <option value="">Selecione um cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Equipamento
            </label>
            <div className="relative">
              <Printer className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                name="equipmentId"
                value={formData.equipmentId}
                onChange={handleChange}
                className="w-full p-3 pl-10 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
                disabled={!formData.clientId}
              >
                <option value="">Selecione um equipamento</option>
                {filteredEquipments.map((equipment) => (
                  <option key={equipment.id} value={equipment.id}>
                    {equipment.brand} - {equipment.model}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Tipo de Serviço
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="tipoServico"
                value={formData.tipoServico}
                onChange={handleChange}
                placeholder="Descreva o tipo de serviço"
                className="w-full p-3 pl-10 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>
        </div>

        {/* Prioridade e Status */}
        <div className="bg-gray-800 p-6 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Prioridade
            </label>
            <select
              name="prioridade"
              value={formData.prioridade}
              onChange={handleChange}
              className="w-full p-3 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="baixa">Baixa</option>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full p-3 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="agendado">Agendado</option>
              <option value="confirmado">Confirmado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>

        {/* Observações */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Observações
          </label>
          <textarea
            name="observacoes"
            value={formData.observacoes}
            onChange={handleChange}
            rows="4"
            placeholder="Adicione observações importantes"
            className="w-full p-3 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
          />
        </div>

        {/* Botão Submit */}
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
              Criar Agendamento
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default AddAgendamento;
