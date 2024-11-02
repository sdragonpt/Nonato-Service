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
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const EquipmentDetail = () => {
  const { equipmentId } = useParams();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState(null);
  const [clientName, setClientName] = useState("");
  const [newPhotoURL, setNewPhotoURL] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [photoChanged, setPhotoChanged] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const equipmentDoc = doc(db, "equipamentos", equipmentId);
        const equipmentData = await getDoc(equipmentDoc);
        if (equipmentData.exists()) {
          setEquipment({ id: equipmentData.id, ...equipmentData.data() });

          // Fetch client name using clientId from equipment data
          const clientDoc = doc(db, "clientes", equipmentData.data().clientId);
          const clientData = await getDoc(clientDoc);
          if (clientData.exists()) {
            setClientName(clientData.data().name);
          } else {
            console.log("Cliente não encontrado");
          }

          setNewPhotoURL(equipmentData.data().equipmentPic || "/nonato.png");
        } else {
          console.log("Equipamento não encontrado");
        }
      } catch (error) {
        console.error("Erro ao buscar equipamento:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEquipment();
  }, [equipmentId]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPhotoURL(reader.result);
      };
      reader.readAsDataURL(file);
      setImageFile(file);
      setPhotoChanged(true);
    }
  };

  const handleSavePhoto = async () => {
    if (imageFile) {
      const equipmentDocRef = doc(db, "equipamentos", equipmentId);
      await updateDoc(equipmentDocRef, {
        equipmentPic: newPhotoURL,
      });

      alert("Foto do equipamento atualizada com sucesso!");
      setEquipment((prevEquipment) => ({
        ...prevEquipment,
        equipmentPic: newPhotoURL,
      }));
      setPhotoChanged(false);
    } else {
      alert("Por favor, selecione uma imagem para salvar.");
    }
  };

  const handleRemovePhoto = async () => {
    const equipmentDocRef = doc(db, "equipamentos", equipmentId);
    await updateDoc(equipmentDocRef, {
      equipmentPic: "",
    });
    setNewPhotoURL("/nonato.png");
    setImageFile(null);
    setPhotoChanged(false);
    alert("Foto do equipamento removida com sucesso!");
  };

  if (loading) {
    return (
      <div className="w-full xl:w-96 mx-auto p-6 bg-gray-800 rounded-lg text-white">
        Carregando...
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="w-full xl:w-96 mx-auto p-6 bg-gray-800 rounded-lg text-white">
        Equipamento não encontrado.
      </div>
    );
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
        {equipment.name}
      </h2>

      <div className="flex flex-col items-center mb-4">
        <label className="relative">
          <img
            src={newPhotoURL || "/nonato.png"} // Usa a nova foto ou a padrão
            alt="Foto do Equipamento"
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
        {photoChanged && (
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
        <p className="text-gray-300 mb-2">Cliente: {clientName}</p>
        <p className="text-gray-300 mb-2">Marca: {equipment.brand}</p>
        <p className="text-gray-300 mb-2">Modelo: {equipment.model}</p>
        <p className="text-gray-300 mb-2">
          Número de Série: {equipment.serialNumber}
        </p>
        <p className="text-gray-300">Tipo: {equipment.type}</p>
      </div>

      <div className="fixed bottom-4 left-0 right-0 flex justify-center items-center">
        <button
          className="w-32 h-16 bg-[#1d2d50] mr-4 text-white text-lg flex items-center justify-center rounded-lg"
          onClick={() => navigate(`/app/services/${equipmentId}`)}
          aria-label="Serviços do Equipamento"
        >
          Serviços
        </button>

        <button
          onClick={() =>
            navigate(`/app/client/${equipment.clientId}/add-equipment`)
          }
          className="h-20 w-20 -mt-8 bg-[#9df767] text-white font-bold text-3xl flex items-center justify-center rounded-full shadow-lg"
          aria-label="Adicionar Equipamento"
        >
          +
        </button>

        <button
          className="w-32 h-16 bg-[#1d2d50] ml-4 text-white text-lg flex items-center justify-center rounded-lg"
          onClick={() => navigate(`/app/edit-equipment/${equipmentId}`)}
          aria-label="Editar Equipamento"
        >
          Editar
        </button>
      </div>
    </div>
  );
};

export default EquipmentDetail;
