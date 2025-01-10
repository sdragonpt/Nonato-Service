import React, { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase.jsx";
import {
  ArrowLeft,
  Loader2,
  Save,
  AlertCircle,
  Calendar,
  User,
  Printer,
  FileText,
  CheckSquare,
  AlertTriangle,
  Clock,
  FileCheck,
  Users,
  PackageOpen,
  Settings,
  ChevronDown,
} from "lucide-react";

const EditOrder = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    date: "",
    clientId: "",
    equipmentId: "",
    serviceType: "",
    priority: "normal",
  });

  const [checklist, setChecklist] = useState({
    concluido: false,
    retorno: false,
    funcionarios: false,
    documentacao: false,
    producao: false,
    pecas: false,
    resultDescription: "",
  });

  const [clients, setClients] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [filteredEquipments, setFilteredEquipments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Buscar dados em paralelo
        const [orderSnapshot, clientsSnapshot, equipmentsSnapshot] =
          await Promise.all([
            getDoc(doc(db, "servicos", serviceId)),
            getDocs(collection(db, "clientes")),
            getDocs(collection(db, "equipamentos")),
          ]);

        if (!orderSnapshot.exists()) {
          setError("Ordem de serviço não encontrada");
          return;
        }

        const orderData = orderSnapshot.data();

        // Processar dados da ordem
        setFormData({
          date: orderData.date || "",
          clientId: orderData.clientId || "",
          equipmentId: orderData.equipmentId || "",
          serviceType: orderData.serviceType || "",
          priority: orderData.priority || "normal",
        });

        // Processar checklist
        setChecklist({
          concluido: orderData.concluido || false,
          retorno: orderData.retorno || false,
          funcionarios: orderData.funcionarios || false,
          documentacao: orderData.documentacao || false,
          producao: orderData.producao || false,
          pecas: orderData.pecas || false,
          resultDescription: orderData.resultDescription || "",
        });

        // Processar clientes e equipamentos
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

        // Filtrar equipamentos do cliente selecionado
        const filteredEquips = equipmentsData.filter(
          (e) => e.clientId === orderData.clientId
        );
        setFilteredEquipments(filteredEquips);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError("Erro ao carregar dados. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [serviceId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "clientId") {
      const filtered = equipments.filter((e) => e.clientId === value);
      setFilteredEquipments(filtered);
      setFormData((prev) => ({
        ...prev,
        equipmentId: "",
      }));
    }
  };

  const handleChecklistChange = (e) => {
    const { name, type, checked, value } = e.target;
    setChecklist((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Marcar todos os campos como tocados
    const allTouched = Object.keys(formData).reduce(
      (acc, key) => ({
        ...acc,
        [key]: true,
      }),
      {}
    );
    setTouched(allTouched);

    // Validação
    if (!formData.clientId || !formData.equipmentId || !formData.serviceType) {
      setError("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const serviceData = {
        ...formData,
        ...checklist,
        lastUpdated: new Date(),
      };

      await updateDoc(doc(db, "servicos", serviceId), serviceData);
      navigate(-1);
    } catch (err) {
      console.error("Erro ao atualizar serviço:", err);
      setError(
        "Erro ao atualizar ordem de serviço. Por favor, tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 flex items-start max-w-md w-full">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-red-500">{error}</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all hover:scale-105 flex items-center justify-center"
        aria-label="Voltar"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <h2 className="text-2xl font-semibold text-center text-white mb-6">
        Editar Ordem de Serviço
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados principais */}
        <div className="bg-gray-800 p-6 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Data
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                onBlur={() => handleBlur("date")}
                className="w-full p-3 pl-10 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

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
                onBlur={() => handleBlur("clientId")}
                className="w-full p-3 pl-10 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none"
                required
              >
                <option value="">Selecione um Cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
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
                onBlur={() => handleBlur("equipmentId")}
                className="w-full p-3 pl-10 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none"
                required
                disabled={!formData.clientId}
              >
                <option value="">Selecione um Equipamento</option>
                {filteredEquipments.map((equipment) => (
                  <option key={equipment.id} value={equipment.id}>
                    {equipment.brand} - {equipment.model}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Tipo de Serviço
            </label>
            <div className="relative">
              <Settings className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="serviceType"
                value={formData.serviceType}
                onChange={handleChange}
                onBlur={() => handleBlur("serviceType")}
                placeholder="Descreva o tipo de serviço"
                className="w-full p-3 pl-10 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Prioridade
            </label>
            <div className="relative">
              <AlertTriangle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full p-3 pl-10 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none"
              >
                <option value="low">Baixa</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-white mb-4">Checklist</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center space-x-3 text-white cursor-pointer group">
              <input
                type="checkbox"
                name="concluido"
                checked={checklist.concluido}
                onChange={handleChecklistChange}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
              />
              <span className="group-hover:text-blue-400 transition-colors">
                Serviço Concluído
              </span>
            </label>

            <label className="flex items-center space-x-3 text-white cursor-pointer group">
              <input
                type="checkbox"
                name="retorno"
                checked={checklist.retorno}
                onChange={handleChecklistChange}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
              />
              <span className="group-hover:text-blue-400 transition-colors">
                Retorno Necessário
              </span>
            </label>

            <label className="flex items-center space-x-3 text-white cursor-pointer group">
              <input
                type="checkbox"
                name="funcionarios"
                checked={checklist.funcionarios}
                onChange={handleChecklistChange}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
              />
              <span className="group-hover:text-blue-400 transition-colors">
                Instrução dos Funcionários
              </span>
            </label>

            <label className="flex items-center space-x-3 text-white cursor-pointer group">
              <input
                type="checkbox"
                name="documentacao"
                checked={checklist.documentacao}
                onChange={handleChecklistChange}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
              />
              <span className="group-hover:text-blue-400 transition-colors">
                Entrega da Documentação
              </span>
            </label>

            <label className="flex items-center space-x-3 text-white cursor-pointer group">
              <input
                type="checkbox"
                name="producao"
                checked={checklist.producao}
                onChange={handleChecklistChange}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
              />
              <span className="group-hover:text-blue-400 transition-colors">
                Liberação para Produção
              </span>
            </label>

            <label className="flex items-center space-x-3 text-white cursor-pointer group">
              <input
                type="checkbox"
                name="pecas"
                checked={checklist.pecas}
                onChange={handleChecklistChange}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
              />
              <span className="group-hover:text-blue-400 transition-colors">
                Orçamento de Peças
              </span>
            </label>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Descrição / Observações
            </label>
            <textarea
              name="resultDescription"
              value={checklist.resultDescription}
              onChange={handleChecklistChange}
              placeholder="Adicione notas ou observações importantes"
              rows="4"
              className="w-full p-3 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Botão de salvar */}
        <div className="flex justify-end pt-6">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:hover:bg-blue-600 min-w-[200px]"
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
        </div>
      </form>
    </div>
  );
};

export default EditOrder;
