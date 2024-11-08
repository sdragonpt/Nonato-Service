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

const EditService = () => {
  const { serviceId } = useParams();
  const [date, setDate] = useState("");
  const [clientId, setClientId] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [clients, setClients] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [filteredEquipments, setFilteredEquipments] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const orderDoc = doc(db, "servicos", serviceId);
        const orderData = await getDoc(orderDoc);
        if (orderData.exists()) {
          const order = orderData.data();
          console.log("Dados da ordem de serviço:", order); // Para verificar os dados carregados
          setDate(order.date || "");
          setClientId(order.clientId || "");
          setEquipmentId(order.equipmentId || "");
          setServiceType(order.serviceType || "");
        } else {
          console.log("Ordem de serviço não encontrada");
        }
      } catch (error) {
        console.error("Erro ao buscar ordem de serviço:", error);
      }
    };

    const fetchClients = async () => {
      const clientsSnapshot = await getDocs(collection(db, "clientes"));
      setClients(
        clientsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    };

    const fetchEquipments = async () => {
      const equipmentsSnapshot = await getDocs(collection(db, "equipamentos"));
      setEquipments(
        equipmentsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    };

    fetchOrder();
    fetchClients();
    fetchEquipments();
  }, [serviceId]);

  useEffect(() => {
    setFilteredEquipments(equipments.filter((e) => e.clientId === clientId));
  }, [clientId, equipments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const serviceRef = doc(db, "servicos", serviceId);
      await updateDoc(serviceRef, {
        date,
        clientId,
        equipmentId,
        serviceType,
      });
      alert("Ordem atualizada com sucesso!");
      navigate(-1);
    } catch (e) {
      console.error("Erro ao atualizar ordem:", e);
    }
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
        Editar Ordem de Serviço
      </h2>
      <div className="w-full xl:w-96 mx-auto p-6 bg-gray-800 rounded-lg mt-10">
        <form onSubmit={handleSubmit}>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
          />
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
          >
            <option value="">Selecione um Cliente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <select
            value={equipmentId}
            onChange={(e) => setEquipmentId(e.target.value)}
            className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
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
            onChange={(e) => setServiceType(e.target.value)}
            placeholder="Tipo de Serviço"
            className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
          />
          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300"
          >
            Atualizar Serviço
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditService;
