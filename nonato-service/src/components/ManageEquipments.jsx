import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase.jsx";
import { Link, useNavigate } from "react-router-dom";

const ManageEquipments = () => {
  const [equipments, setEquipments] = useState([]);
  const [clients, setClients] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEquipments = async () => {
      const querySnapshot = await getDocs(collection(db, "equipamentos"));
      const equipmentsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEquipments(equipmentsData);
    };

    const fetchClients = async () => {
      const querySnapshot = await getDocs(collection(db, "clientes"));
      const clientsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setClients(clientsData);
    };

    fetchEquipments();
    fetchClients();
  }, []);

  // Função para deletar um equipamento
  const handleDelete = async (equipmentId) => {
    const confirmDelete = window.confirm("Você tem certeza que deseja deletar este equipamento?");
    if (confirmDelete) {
      try {
        await deleteDoc(doc(db, "equipamentos", equipmentId));
        setEquipments(equipments.filter((equipment) => equipment.id !== equipmentId));
        alert("Equipamento deletado com sucesso!");
      } catch (e) {
        console.error("Erro ao deletar o equipamento: ", e);
      }
    }
  };

  // Função para redirecionar à página de edição
  const handleEdit = (equipmentId) => {
    navigate(`/edit-equipment/${equipmentId}`); // Redireciona para a página de edição (defina essa rota)
  };

  const getClientName = (clientId) => {
    const client = clients.find((client) => client.id === clientId);
    return client ? client.name : "Cliente não encontrado";
  };

  return (
    <div className="w-full xl:w-96 mx-auto p-6 bg-gray-800 rounded-lg">
      <h2 className="text-xl mb-4 text-white">Gerenciar Equipamentos</h2>
      <ul>
        {equipments.map((equipment) => (
          <li key={equipment.id} className="mb-4 flex items-center justify-between">
            <div>
              <span className="block text-white">{equipment.name}</span>
              <span className="block text-gray-400">
                Cliente: {getClientName(equipment.clientId)}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              {/* Link para Exibir o equipamento */}
              <Link
                to={`/equipment/${equipment.id}`}
                className="text-blue-500 hover:underline"
              >
                Exibir
              </Link>
              {/* Botão de Editar */}
              <button
                onClick={() => handleEdit(equipment.id)}
                className="text-yellow-500 hover:underline"
              >
                Editar
              </button>
              {/* Botão de Deletar */}
              <button
                onClick={() => handleDelete(equipment.id)}
                className="text-red-500 hover:underline"
              >
                Deletar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ManageEquipments;
