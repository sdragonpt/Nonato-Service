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

const EditEquipment = () => {
  const { equipmentId } = useParams(); // Obtém o ID do equipamento a partir da URL
  const [type, setType] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [clientId, setClientId] = useState("");
  const [clients, setClients] = useState([]); // Estado para armazenar os clientes
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClients = async () => {
      const querySnapshot = await getDocs(collection(db, "clientes"));
      const clientsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setClients(clientsData);
    };

    const fetchEquipment = async () => {
      const equipmentDoc = doc(db, "equipamentos", equipmentId);
      const equipmentData = await getDoc(equipmentDoc);
      if (equipmentData.exists()) {
        const data = equipmentData.data();
        setType(data.type);
        setBrand(data.brand);
        setModel(data.model);
        setSerialNumber(data.serialNumber);
        setClientId(data.clientId); // Define o ID do cliente
      } else {
        console.log("Equipamento não encontrado");
      }
    };

    fetchClients();
    fetchEquipment();
  }, [equipmentId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const equipmentRef = doc(db, "equipamentos", equipmentId);
      await updateDoc(equipmentRef, {
        type,
        brand,
        model,
        serialNumber,
        clientId, // Inclui o ID do cliente
      });
      alert("Equipamento atualizado com sucesso!");
      navigate(-1); // Volta para a página anterior
    } catch (e) {
      console.error("Erro ao atualizar equipamento: ", e);
    }
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

      <h2 className="text-2xl font-medium mb-2 text-white text-center">
        Editar Equipamento
      </h2>
      <div className="w-full xl:w-96 mx-auto p-6 bg-gray-800 rounded-lg mt-10">
        <form onSubmit={handleSubmit}>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full p-2 mb-4 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Selecione um Cliente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.id} - {client.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="Tipo"
            className="w-full p-2 mb-4 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Marca"
            className="w-full p-2 mb-4 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Modelo"
            className="w-full p-2 mb-4 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="text"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            placeholder="Número de Série"
            className="w-full p-2 mb-4 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            className="w-full p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition duration-300"
          >
            Salvar Alterações
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditEquipment;
