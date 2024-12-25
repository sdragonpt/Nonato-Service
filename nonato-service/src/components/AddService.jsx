import React, { useState, useEffect } from "react";
import { db } from "../firebase"; // Importe sua configuração do Firebase
import {
  collection,
  getDocs,
  setDoc,
  doc,
  getDoc,
  increment,
} from "firebase/firestore"; // Incluímos funções necessárias para o incremento
import { useNavigate } from "react-router-dom";

const AddService = () => {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [clientId, setClientId] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [serviceType, setServiceType] = useState(""); // Novo campo para tipo de serviço
  const [clients, setClients] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [filteredEquipments, setFilteredEquipments] = useState([]);
  const [workday, setWorkday] = useState({
    concluido: false,
    retorno: false,
    funcionarios: false,
    documentacao: false,
    producao: false,
    pecas: false,
    resultDescriptiom: "",
  });

  const navigate = useNavigate();

  // Buscar clientes e equipamentos
  useEffect(() => {
    const fetchClients = async () => {
      const querySnapshot = await getDocs(collection(db, "clientes"));
      const clientsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setClients(clientsData);
    };

    const fetchEquipments = async () => {
      const querySnapshot = await getDocs(collection(db, "equipamentos"));
      const equipmentsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEquipments(equipmentsData);
      setFilteredEquipments(equipmentsData);
    };

    fetchClients();
    fetchEquipments();
  }, []);

  const handleClientChange = (e) => {
    const selectedClientId = e.target.value;
    setClientId(selectedClientId);
    setEquipmentId("");

    if (selectedClientId) {
      const filtered = equipments.filter(
        (equipment) => equipment.clientId === selectedClientId
      );
      setFilteredEquipments(filtered);
    } else {
      setFilteredEquipments(equipments);
    }
  };

  const handleEquipmentChange = (e) => {
    setEquipmentId(e.target.value);
  };

  const handleServiceTypeChange = (e) => {
    setServiceType(e.target.value);
  };

  // Função para obter o próximo ID de serviço
  const getNextServiceId = async () => {
    const counterRef = doc(db, "counters", "servicesCounter");
    const counterSnapshot = await getDoc(counterRef);

    if (counterSnapshot.exists()) {
      const currentCounter = counterSnapshot.data().count;
      await setDoc(counterRef, { count: increment(1) }, { merge: true });
      return currentCounter + 1;
    } else {
      await setDoc(counterRef, { count: 1 });
      return 1;
    }
  };

  // Função para adicionar serviço no Firestore
  const handleAddServiceToDb = async (e) => {
    e.preventDefault();

    try {
      // Obter o próximo ID único
      const newServiceId = await getNextServiceId();

      // Adicionar o serviço na coleção
      const servicesCollection = collection(db, "servicos");
      await setDoc(doc(servicesCollection, newServiceId.toString()), {
        date,
        clientId,
        equipmentId,
        serviceType,
        status: "Aberto",
      });

      console.log("Serviço adicionado com sucesso!");

      // Resetar o formulário após a adição
      setDate(new Date().toISOString().split("T")[0]);
      setClientId("");
      setEquipmentId("");
      setServiceType("");
    } catch (error) {
      console.error("Erro ao adicionar serviço:", error);
    }
  };

  const handleWorkdayChange = (e) => {
    const { name, value, type, checked } = e.target;
    setWorkday((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition transform hover:scale-105"
        aria-label="Voltar"
      >
        Voltar
      </button>

      <h2 className="text-2xl text-center text-white mb-4">
        Nova Ordem de Serviço
      </h2>
      <div className="w-full xl:w-96 mx-auto p-6 bg-gray-800 rounded-lg mt-10">
        <form onSubmit={handleAddServiceToDb}>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
            required
          />
          <select
            value={clientId}
            onChange={handleClientChange}
            className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
            required
          >
            <option value="">Selecione um Cliente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.id} - {client.name}
              </option>
            ))}
          </select>
          <select
            value={equipmentId}
            onChange={handleEquipmentChange}
            className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
            required
          >
            <option value="">Selecione um Equipamento</option>
            {filteredEquipments.map((equipment) => (
              <option key={equipment.id} value={equipment.id}>
                {equipment.brand} - {equipment.model}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={serviceType}
            onChange={handleServiceTypeChange}
            placeholder="Tipo de Serviço"
            className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
            required
          />

          <div className="mb-4">
            <div className="flex flex-wrap items-center mb-2">
              <div className="pr-4 py-4">
                <input
                  type="checkbox"
                  name="concluido"
                  checked={workday.concluido}
                  onChange={handleWorkdayChange}
                  className="mr-2 h-6 w-6"
                />
                <label htmlFor="pause" className="text-white">
                  Serviço Concluído
                </label>
              </div>
              <div className="pr-4 py-4">
                <input
                  type="checkbox"
                  name="retorno"
                  checked={workday.retorno}
                  onChange={handleWorkdayChange}
                  className="mr-2 h-6 w-6"
                />
                <label htmlFor="pause" className="text-white">
                  Retorno Necessário
                </label>
              </div>
              <div className="pr-4 py-4">
                <input
                  type="checkbox"
                  name="funcionarios"
                  checked={workday.funcionarios}
                  onChange={handleWorkdayChange}
                  className="mr-2 h-6 w-6"
                />
                <label htmlFor="pause" className="text-white">
                  Instrução dos Funcionários
                </label>
              </div>
              <div className="pr-4 py-4">
                <input
                  type="checkbox"
                  name="documentacao"
                  checked={workday.documentacao}
                  onChange={handleWorkdayChange}
                  className="mr-2 h-6 w-6"
                />
                <label htmlFor="pause" className="text-white">
                  Entrega da Documentação
                </label>
              </div>
              <div className="pr-4 py-4">
                <input
                  type="checkbox"
                  name="producao"
                  checked={workday.producao}
                  onChange={handleWorkdayChange}
                  className="mr-2 h-6 w-6"
                />
                <label htmlFor="pause" className="text-white">
                  Liberação para Produção
                </label>
              </div>
              <div className="pr-4 py-4">
                <input
                  type="checkbox"
                  name="pecas"
                  checked={workday.pecas}
                  onChange={handleWorkdayChange}
                  className="mr-2 h-6 w-6"
                />
                <label htmlFor="pause" className="text-white">
                  Envio de Orçamento de Peças
                </label>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-lg text-white">Notas</h3>
            <textarea
              type="description"
              name="resultDescription"
              value={workday.resultDescription}
              onChange={handleWorkdayChange}
              placeholder="Notas sobre o Resultado do Trabalho"
              rows="4" // Define o número de linhas visíveis
              className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition duration-300"
          >
            Adicionar Serviço
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddService;
