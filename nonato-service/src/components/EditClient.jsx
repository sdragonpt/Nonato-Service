import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase.jsx";

const EditClient = () => {
  const { clientId } = useParams(); // Obtém o ID do cliente a partir da URL
  const [client, setClient] = useState(null); // Estado para armazenar os dados do cliente
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [nif, setNif] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClient = async () => {
      const clientDoc = doc(db, "clientes", clientId);
      const clientData = await getDoc(clientDoc);
      if (clientData.exists()) {
        const data = clientData.data();
        setClient(data);
        setName(data.name);
        setAddress(data.address);
        setPhone(data.phone);
        setNif(data.nif);
        setPostalCode(data.postalCode);
      } else {
        console.log("Cliente não encontrado");
      }
    };

    fetchClient();
  }, [clientId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const clientRef = doc(db, "clientes", clientId);
      await updateDoc(clientRef, {
        name,
        address,
        phone,
        nif,
        postalCode
      });
      alert("Cliente atualizado com sucesso!");
      navigate("/manage-clients"); // Redireciona para a página de gerenciamento de clientes
    } catch (e) {
      console.error("Erro ao atualizar cliente: ", e);
    }
  };

  return (
    <div className="w-full xl:w-96 mx-auto p-6 bg-gray-800 rounded-lg">
      <h2 className="text-xl mb-4 text-white">Editar Cliente</h2>
      <form onSubmit={handleSubmit}>
        <input 
          type="text" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="Nome do Cliente" 
          required
          className="w-full p-2 mb-4 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input 
          type="text" 
          value={address} 
          onChange={(e) => setAddress(e.target.value)} 
          placeholder="Endereço" 
          required
          className="w-full p-2 mb-4 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input 
          type="tel" 
          value={phone} 
          onChange={(e) => setPhone(e.target.value)} 
          placeholder="Número de Telefone" 
          required
          className="w-full p-2 mb-4 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input 
          type="text" 
          value={nif} 
          onChange={(e) => setNif(e.target.value)} 
          placeholder="NIF" 
          required
          className="w-full p-2 mb-4 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input 
          type="text" 
          value={postalCode} 
          onChange={(e) => setPostalCode(e.target.value)} 
          placeholder="Código Postal" 
          required
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

export default EditClient;
