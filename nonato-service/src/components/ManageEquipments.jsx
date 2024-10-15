import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase.jsx";
import { Link } from "react-router-dom";

const ManageEquipments = () => {
  const [equipments, setEquipments] = useState([]);
  const [clients, setClients] = useState([]);

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

  const getClientName = (clientId) => {
    const client = clients.find((client) => client.id === clientId);
    return client ? client.name : "Cliente não encontrado";
  };

  return (
    <div className="w-96 mx-auto p-6 bg-gray-800 rounded-lg">
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
            <Link
              to={`/equipment/${equipment.id}`}
              className="text-blue-500 hover:underline"
            >
              Exibir
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ManageEquipments;
