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
  Plus,
  Trash2,
} from "lucide-react";

const AddAgendamento = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
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
      setIsLoading(true);
      setError(null);

      if (isMultipleDates) {
        // Create an appointment for each date
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
        // Create single appointment
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
      setIsLoading(false);
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
        Novo Agendamento
      </h2>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-red-500">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Toggle buttons */}
        <div className="flex justify-center mb-6">
          <div className="bg-gray-700 p-1 rounded-xl inline-flex relative shadow-lg">
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
                  : "text-gray-400 hover:text-gray-200"
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
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Múltiplas
            </button>
          </div>
        </div>

        {/* Datas e Hora */}
        <div className="bg-gray-800 p-6 rounded-lg space-y-4">
          {isMultipleDates ? (
            <>
              {selectedDates.map((date, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Data {index + 1}
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="date"
                        value={date}
                        onChange={(e) =>
                          handleDateChange(index, e.target.value)
                        }
                        className="w-full p-3 pl-10 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                  {selectedDates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDate(index)}
                      className="mt-6 p-2 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addDate}
                className="mt-2 flex items-center text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar outra data
              </button>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Data
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  className="w-full p-3 pl-10 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>
          )}

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

        {/* Rest of the form remains the same */}
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
          disabled={
            isLoading ||
            (!isMultipleDates && !singleDate) ||
            (isMultipleDates && selectedDates.some((date) => !date))
          }
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
              {isMultipleDates
                ? `Criar ${selectedDates.length} Agendamentos`
                : "Criar Agendamento"}
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default AddAgendamento;
