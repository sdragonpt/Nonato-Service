import React, { useState, useEffect } from "react";
import { db } from "../firebase"; // Importe sua configuração do Firebase
import { collection, getDocs, addDoc } from "firebase/firestore"; // Função para adicionar e buscar dados
import { useNavigate } from "react-router-dom";

const AddService = () => {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [clientId, setClientId] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [serviceType, setServiceType] = useState(""); // Novo campo para tipo de serviço
  const [clients, setClients] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [filteredEquipments, setFilteredEquipments] = useState([]);
  const [showWorkdayFields, setShowWorkdayFields] = useState(false); // Estado para exibir os campos de dia de trabalho
  const [workday, setWorkday] = useState({
    workDate: "",
    departureTime: "",
    arrivalTime: "",
    kmDeparture: "",
    kmReturn: "",
    pause: false,
    pauseHours: "",
    returnDepartureTime: "", // Mover "returnDepartureTime" para o local correto
    returnArrivalTime: "", // Mover "returnArrivalTime" para o local correto
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

  // Função para adicionar serviço no Firestore
  const handleAddServiceToDb = async (e) => {
    e.preventDefault();

    try {
      // Coleção de serviços no Firestore
      const servicesCollection = collection(db, "servicos");
      await addDoc(servicesCollection, {
        date,
        clientId,
        equipmentId,
        serviceType, // Adicionando o tipo de serviço
        status: "Aberto",
      });
      console.log("Serviço adicionado com sucesso!");

      // Resetar o formulário após a adição
      setDate(new Date().toISOString().split("T")[0]);
      setClientId("");
      setEquipmentId("");
      setServiceType(""); // Limpar o campo de tipo de serviço
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

  const toggleWorkdayFields = () => {
    setShowWorkdayFields(!showWorkdayFields);
  };

  return (
    <div>
      {/* Botão de Voltar no canto superior direito */}
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
                {/* Exibe a marca, o modelo e a foto do equipamento (se houver) */}
                <div className="flex items-center">
                  {/* Se tiver foto, exibe a imagem, caso contrário, exibe um ícone padrão */}
                  {equipment.photoUrl ? (
                    <img
                      src={equipment.photoUrl}
                      alt={`${equipment.brand} ${equipment.model}`}
                      className="w-8 h-8 rounded-full mr-2"
                    />
                  ) : (
                    <span className="w-8 h-8 bg-gray-600 rounded-full mr-2 flex items-center justify-center">
                      <i className="fas fa-camera text-white"></i>{" "}
                      {/* Ícone padrão */}
                    </span>
                  )}
                  <span>
                    {equipment.brand} - {equipment.model}
                  </span>
                </div>
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

          {/* Botão para exibir campos de dia de trabalho */}
          <button
            type="button"
            onClick={toggleWorkdayFields}
            className="w-full px-4 py-2 mb-6 text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition duration-300"
          >
            Adicionar dia de trabalho
          </button>

          {/* Campos de dia de trabalho */}
          {showWorkdayFields && (
            <div>
              <div className="mb-4">
                <h3 className="text-lg text-white">Data</h3>
                <input
                  type="date"
                  name="workDate"
                  value={workday.workDate}
                  onChange={handleWorkdayChange}
                  className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
                />
              </div>

              <div className="mb-4">
                <h3 className="text-lg text-white">Ida</h3>
                <input
                  type="time"
                  name="departureTime"
                  value={workday.departureTime}
                  onChange={handleWorkdayChange}
                  className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
                />
                <input
                  type="time"
                  name="arrivalTime"
                  value={workday.arrivalTime}
                  onChange={handleWorkdayChange}
                  className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
                />
              </div>

              <div className="mb-4">
                <h3 className="text-lg text-white">KM's</h3>
                <input
                  type="number"
                  name="kmDeparture"
                  value={workday.kmDeparture}
                  onChange={handleWorkdayChange}
                  placeholder="Ida"
                  className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
                />
                <input
                  type="number"
                  name="kmReturn"
                  value={workday.kmReturn}
                  onChange={handleWorkdayChange}
                  placeholder="Retorno"
                  className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
                />
              </div>

              <div className="mb-4">
                <h3 className="text-lg text-white">Retorno</h3>
                <input
                  type="time"
                  name="returnDepartureTime"
                  value={workday.returnDepartureTime}
                  onChange={handleWorkdayChange}
                  className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
                />
                <input
                  type="time"
                  name="returnArrivalTime"
                  value={workday.returnArrivalTime}
                  onChange={handleWorkdayChange}
                  className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
                />
              </div>

              {/* Checkbox para Pausa */}
              <div className="mb-4">
                <label className="text-white flex items-center space-x-2 mb-2">
                  <input
                    type="checkbox"
                    name="pause"
                    checked={workday.pause}
                    onChange={handleWorkdayChange}
                    className="w-6 h-6 text-violet-600"
                  />
                  <span>Pausa</span>
                </label>
                {workday.pause && (
                  <input
                    type="text"
                    name="pauseHours"
                    value={workday.pauseHours}
                    onChange={handleWorkdayChange}
                    placeholder="Horas de Pausa"
                    className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
                  />
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full px-4 py-2 bg-green-600 rounded-lg text-white hover:bg-green-700 transition duration-300"
          >
            Adicionar Serviço
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddService;
