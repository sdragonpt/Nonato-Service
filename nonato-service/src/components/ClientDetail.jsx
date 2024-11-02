import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase.jsx";

const ClientDetail = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [services, setServices] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [newPhotoURL, setNewPhotoURL] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [photoChanged, setPhotoChanged] = useState(false); // Estado para rastrear mudanças na foto

  useEffect(() => {
    const fetchClient = async () => {
      const clientDoc = doc(db, "clientes", clientId);
      const clientData = await getDoc(clientDoc);
      if (clientData.exists()) {
        setClient({ id: clientData.id, ...clientData.data() });
        setNewPhotoURL(clientData.data().profilePic); // Carregar a foto atual do cliente
      } else {
        console.log("Cliente não encontrado");
      }
    };

    const fetchServices = async () => {
      const servicesSnapshot = await getDocs(collection(db, "servicos"));
      const servicesData = servicesSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((service) => service.clientId === clientId);
      setServices(servicesData);
    };

    const fetchEquipments = async () => {
      const equipmentsSnapshot = await getDocs(collection(db, "equipamentos"));
      const equipmentsData = equipmentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEquipments(equipmentsData);
    };

    fetchClient();
    fetchServices();
    fetchEquipments();
  }, [clientId]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPhotoURL(reader.result); // Atualiza a nova foto que será exibida
      };
      reader.readAsDataURL(file);
      setImageFile(file);
      setPhotoChanged(true); // Marcar que a foto foi alterada
    }
  };

  const handleSavePhoto = async () => {
    if (imageFile) {
      const clientDocRef = doc(db, "clientes", clientId);
      await updateDoc(clientDocRef, {
        profilePic: newPhotoURL, // Atualiza a foto de perfil no Firestore
      });
      alert("Foto de perfil atualizada com sucesso!");
      setClient((prevClient) => ({
        ...prevClient,
        profilePic: newPhotoURL, // Atualiza a foto do cliente no estado
      }));
      setPhotoChanged(false); // Reseta o estado de alteração da foto
    } else {
      alert("Por favor, selecione uma imagem para salvar.");
    }
  };

  const handleRemovePhoto = async () => {
    const clientDocRef = doc(db, "clientes", clientId);
    await updateDoc(clientDocRef, {
      profilePic: "", // Remove a URL da foto
    });
    setNewPhotoURL("/default-avatar.png"); // Define a imagem padrão
    setImageFile(null); // Limpa o arquivo de imagem
    setPhotoChanged(false); // Restaura o estado da foto
    alert("Foto de perfil removida com sucesso!");
  };

  if (!client) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="w-full max-w-3xl mx-auto rounded-lg">
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition transform hover:scale-105"
        aria-label="Voltar"
      >
        Voltar
      </button>

      <h2 className="text-2xl font-medium mb-2 text-white text-center">
        {client.name}
      </h2>

      <div className="flex flex-col items-center mb-4">
        <label className="relative">
          <img
            src={newPhotoURL || "/nonato.png"} // Usa a nova foto ou a padrão
            alt="Foto de Perfil"
            className="w-24 h-24 rounded-full mb-2 z-0 border-zinc-800 border-2"
          />
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </label>
        <button
          onClick={handleRemovePhoto}
          className="mt-2 w-32 h-10 bg-red-500 text-white rounded-lg"
        >
          Remover Foto
        </button>
        {photoChanged && ( // Mostra os botões apenas se a foto foi alterada
          <>
            <button
              onClick={handleSavePhoto}
              className="mt-2 w-32 h-10 bg-[#9df767] text-white rounded-lg"
            >
              Salvar Foto
            </button>
          </>
        )}
      </div>

      <div className="bg-zinc-800 py-2 px-2 mb-4 rounded-lg">
        <p className="text-gray-300 mb-2">Endereço: {client.address}</p>
        <p className="text-gray-300 mb-2">Código Postal: {client.postalCode}</p>
        <p className="text-gray-300 mb-2">Número de Telefone: {client.phone}</p>
        <p className="text-gray-300">NIF: {client.nif}</p>
      </div>

      <h3 className="text-lg mb-2 text-white">Equipamentos:</h3>
      <div className="space-y-4 mb-32">
        {equipments
          .filter((equipment) => equipment.clientId === clientId)
          .map((equipment) => (
            <div
              key={equipment.id}
              className="flex items-center p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600"
              onClick={() => navigate(`/app/equipment/${equipment.id}`)}
            >
              <img
                src={equipment.equipmentPic || "/nonato.png"}
                alt={equipment.name}
                className="w-12 h-12 rounded-full mr-4"
              />
              <div className="text-white">
                <h4 className="font-semibold">{equipment.brand}</h4>
                <p className="text-gray-400">
                  {equipment.model} - {equipment.type}
                </p>
              </div>
            </div>
          ))}
      </div>

      <div className="fixed bottom-4 left-0 right-0 flex justify-center items-center">
        <p className="absolute bottom-24 text-white mb-2 text-center">
          Clique aqui para adicionar novo equipamento:
        </p>

        <button
          className="w-32 h-16 bg-[#1d2d50] mr-4 text-white text-lg flex items-center justify-center rounded-lg"
          onClick={() => navigate(`/app/services/${clientId}`)}
          aria-label="Serviços do Cliente"
        >
          Serviços
        </button>

        <button
          onClick={() => navigate(`/app/client/${clientId}/add-equipment`)}
          className="h-20 w-20 -mt-8 bg-[#9df767] text-white font-bold text-3xl flex items-center justify-center rounded-full shadow-lg"
          aria-label="Adicionar Equipamento"
        >
          +
        </button>

        <button
          className="w-32 h-16 bg-[#1d2d50] ml-4 text-white text-lg flex items-center justify-center rounded-lg"
          onClick={() => navigate(`/app/edit-client/${clientId}`)}
          aria-label="Editar Cliente"
        >
          Editar
        </button>
      </div>
    </div>
  );
};

export default ClientDetail;
