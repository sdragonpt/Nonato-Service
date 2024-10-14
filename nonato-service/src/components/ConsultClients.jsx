import React, { useEffect, useState } from 'react';
import { collection, getDocs } from "firebase/firestore";
import { db } from '../firebase.jsx'; // Importe o Firestore que configuramos

const ConsultClients = () => {
  const [clients, setClients] = useState([]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "clientes"));
        const clientsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setClients(clientsData);
      } catch (e) {
        console.error("Erro ao buscar clientes: ", e);
      }
    };

    fetchClients();
  }, []);

  return (
    <div className="w-96 mx-auto p-6 bg-gray-800 rounded-lg">
      <h2 className="text-xl mb-4 text-white">Clientes</h2>
      <ul className="text-white">
        {clients.length > 0 ? (
          clients.map(client => (
            <li key={client.id} className="mb-2">
              {client.id} - {client.name}
            </li>
          ))
        ) : (
          <li>Nenhum cliente encontrado.</li>
        )}
      </ul>
    </div>
  );
};

export default ConsultClients;
