import React, { useEffect, useState } from 'react';
import { collection, getDocs } from "firebase/firestore";
import { db } from '../firebase.jsx'; // Importe o Firestore que configuramos

const ConsultEquipments = () => {
  const [equipments, setEquipments] = useState([]);

  useEffect(() => {
    const fetchEquipments = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "equipamentos"));
        const equipmentsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setEquipments(equipmentsData);
      } catch (e) {
        console.error("Erro ao buscar equipamentos: ", e);
      }
    };

    fetchEquipments();
  }, []);

  return (
    <div className="w-full xl:w-96 mx-auto p-6 bg-gray-800 rounded-lg">
      <h2 className="text-xl mb-4 text-white">Equipamentos</h2>
      <ul className="text-white">
        {equipments.length > 0 ? (
          equipments.map(equipment => (
            <li key={equipment.id} className="mb-2">
              {equipment.id} - {equipment.name}
            </li>
          ))
        ) : (
          <li>Nenhum equipamento encontrado.</li>
        )}
      </ul>
    </div>
  );
};

export default ConsultEquipments;
