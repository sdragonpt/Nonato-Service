import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase.jsx";
import { Link } from "react-router-dom";

const ManageClients = () => {
  const [clients, setClients] = useState([]); // Inicializa o estado como um array vazio

  useEffect(() => {
    const fetchClients = async () => {
      const querySnapshot = await getDocs(collection(db, "clientes"));
      const clientsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setClients(clientsData); // Atualiza o estado com os dados obtidos
    };

    fetchClients();
  }, []);

  return (
    <div className="w-96 mx-auto p-6 bg-gray-800 rounded-lg">
      <h2 className="text-xl mb-4 text-white">Gerenciar Clientes</h2>
      <ul>
        {clients.map((client) => (
          <li key={client.id} className="mb-4">
            <span>{client.name}</span>
            <Link
              to={`/client/${client.id}`}
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

export default ManageClients;
