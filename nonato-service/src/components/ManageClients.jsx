import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase.jsx";
import { useNavigate } from "react-router-dom";

const ManageClients = () => {
  const [clients, setClients] = useState([]);
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
    fetchClients();
  }, []);

  const handleDelete = async (clientId) => {
    try {
      await deleteDoc(doc(db, "clientes", clientId));
      setClients(clients.filter((client) => client.id !== clientId));
    } catch (error) {
      console.error("Erro ao deletar cliente:", error);
    }
  };

  const handleEdit = (clientId) => {
    navigate(`/edit-client/${clientId}`);
  };

  return (
    <div className="w-full max-w-3xl mx-auto rounded-lg">
      <h2 className="text-2xl font-semibold text-center text-white mb-6">
        Clientes
      </h2>
      <div className="space-y-4">
        {clients.map((client) => (
          <div
            key={client.id}
            onClick={() => navigate(`/app/client/${client.id}`)}
            className="flex items-center p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600"
          >
            <img
              src={client.photoURL || "/default-avatar.png"}
              alt={client.name}
              className="w-12 h-12 rounded-full mr-4"
            />
            <div className="text-white">
              <h3 className="font-semibold">{client.name}</h3>
              <p className="text-gray-400">{client.phone || "Sem telefone"}</p>
              <p className="text-gray-400">
                {client.address || "Sem endereço"}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Botões na parte inferior da página, estilo conforme a imagem */}
      <div className="fixed bottom-4 left-0 right-0 flex justify-center items-center">
        {/* Botão retangular à esquerda */}
        <button
          className="w-32 h-16 bg-[#1d2d50] mr-4 text-white text-lg flex items-center justify-center rounded-lg"
          onClick={() => navigate("/app/manage-equipments")}
          aria-label="Equipamentos"
        >
          
        </button>

        {/* Botão redondo central para adicionar cliente */}
        <button
          onClick={() => navigate("/app/add-client")}
          className="h-20 w-20 -mt-8 bg-[#9df767] text-white text-3xl flex items-center justify-center rounded-full shadow-lg"
          aria-label="Adicionar Cliente"
        >
          +
        </button>

        {/* Botão retangular à direita */}
        <button
          className="w-32 h-16 bg-[#1d2d50] ml-4 text-white text-lg flex items-center justify-center rounded-lg"
          onClick={() => navigate("/app/manage-equipments")}
          aria-label="Equipamentos"
        >
          Equipamentos
        </button>
      </div>
    </div>
  );
};

export default ManageClients;
