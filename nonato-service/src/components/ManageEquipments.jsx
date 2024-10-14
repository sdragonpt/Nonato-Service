import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase.jsx";
import { Link } from "react-router-dom";

const ManageEquipments = () => {
  const [equipments, setEquipments] = useState([]); // Mantém um array vazio inicialmente

  useEffect(() => {
    const fetchEquipments = async () => {
      const querySnapshot = await getDocs(collection(db, "equipamentos"));
      const equipmentsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEquipments(equipmentsData); // Atualiza o estado com os dados obtidos
    };

    fetchEquipments();
  }, []);

  return (
    <div className="w-96 mx-auto p-6 bg-gray-800 rounded-lg">
      <h2 className="text-xl mb-4 text-white">Gerenciar Equipamentos</h2>
      <ul>
        {equipments.map((equipment) => (
          <li key={equipment.id} className="mb-4">
            <span>{equipment.name}</span>
            <span className="ml-2 text-gray-400">
              (Cliente: {equipment.clientId}) {/* Exibe o ID do cliente, altere conforme necessário */}
            </span>
            <Link
              to={`/equipment/${equipment.id}`}
              className="ml-4 text-blue-500 hover:underline"
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
