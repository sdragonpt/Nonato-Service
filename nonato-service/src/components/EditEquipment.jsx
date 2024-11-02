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
  const [equipment, setEquipment] = useState(null); // Estado para armazenar os dados do equipamento
  const [name, setName] = useState("");
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
        setEquipment(data);
        setName(data.name);
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
        name,
        type,
        brand,
        model,
        serialNumber,
        clientId, // Inclui o ID do cliente
      });
      alert("Equipamento atualizado com sucesso!");
      navigate("/manage-equipments"); // Redireciona para a página de gerenciamento de equipamentos
    } catch (e) {
      console.error("Erro ao atualizar equipamento: ", e);
    }
  };

  return (
    <div className="w-full xl:w-96 mx-auto p-6 bg-gray-800 rounded-lg">
      <h2 className="text-xl mb-4 text-white">Editar Equipamento</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do Equipamento"
          required
          className="w-full p-2 mb-4 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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
        />
        <input
          type="text"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="Marca"
          className="w-full p-2 mb-4 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="Modelo"
          className="w-full p-2 mb-4 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          value={serialNumber}
          onChange={(e) => setSerialNumber(e.target.value)}
          placeholder="Número de Série"
          className="w-full p-2 mb-4 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="w-full p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition duration-300"
        >
          Salvar Alterações
        </button>
      </form>
    </div>
  );
};

export default EditEquipment;
