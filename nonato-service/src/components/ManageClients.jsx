import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore"; // Adiciona o deleteDoc para deletar
import { db } from "../firebase.jsx";
import { Link, useNavigate } from "react-router-dom";

const ManageClients = () => {
  const [clients, setClients] = useState([]); // Inicializa o estado como um array vazio
  const navigate = useNavigate(); // Para redirecionar ao editar

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

  // Função para deletar cliente
  const handleDelete = async (clientId) => {
    try {
      await deleteDoc(doc(db, "clientes", clientId));
      setClients(clients.filter((client) => client.id !== clientId)); // Remove do estado local
    } catch (error) {
      console.error("Erro ao deletar cliente:", error);
    }
  };

  // Função para editar cliente
  const handleEdit = (clientId) => {
    navigate(`/edit-client/${clientId}`); // Redireciona para a página de edição (definir rota de edição)
  };

  return (
    <div className="w-full xl:w-96 mx-auto p-6 bg-gray-800 rounded-lg">
      <h2 className="text-xl mb-4 text-white">Gerenciar Clientes</h2>
      <ul>
        {clients.map((client) => (
          <li
            key={client.id}
            className="mb-4 flex items-center justify-between"
          >
            <span>{client.name}</span>
            <div className="flex items-center">
              <Link
                to={`/client/${client.id}`}
                className="ml-4 text-blue-500 hover:underline"
              >
                Exibir
              </Link>
              <button
                onClick={() => handleEdit(client.id)}
                className="ml-4 text-green-500 hover:underline"
              >
                Editar
              </button>
              <button
                onClick={() => handleDelete(client.id)}
                className="ml-4 text-red-500 hover:underline"
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

export default ManageClients;
