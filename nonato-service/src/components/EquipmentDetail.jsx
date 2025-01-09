import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase.jsx";
import {
  ArrowLeft,
  Camera,
  Loader2,
  Trash2,
  Edit2,
  Plus,
  Wrench,
  UserCircle,
  Package,
  Barcode,
  Tag,
  Shapes,
} from "lucide-react";

const EquipmentDetail = () => {
  const { equipmentId } = useParams();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState(null);
  const [clientName, setClientName] = useState("");
  const [newPhotoURL, setNewPhotoURL] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [photoChanged, setPhotoChanged] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const equipmentDoc = doc(db, "equipamentos", equipmentId);
        const equipmentData = await getDoc(equipmentDoc);

        if (!equipmentData.exists()) {
          setError("Equipamento não encontrado");
          return;
        }

        const equipmentInfo = { id: equipmentData.id, ...equipmentData.data() };
        setEquipment(equipmentInfo);
        setNewPhotoURL(equipmentInfo.equipmentPic || "/nonato.png");

        // Buscar nome do cliente
        const clientDoc = doc(db, "clientes", equipmentInfo.clientId);
        const clientData = await getDoc(clientDoc);

        if (clientData.exists()) {
          setClientName(clientData.data().name);
        } else {
          setError("Cliente associado não encontrado");
        }
      } catch (err) {
        console.error("Erro ao buscar equipamento:", err);
        setError("Erro ao carregar dados do equipamento");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEquipment();
  }, [equipmentId]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        // 2MB limit
        alert("A imagem deve ter menos de 2MB");
        return;
      }

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
    if (!imageFile) {
      alert("Por favor, selecione uma imagem para salvar.");
      return;
    }

    try {
      setPhotoLoading(true);
      const equipmentDocRef = doc(db, "equipamentos", equipmentId);
      await updateDoc(equipmentDocRef, {
        equipmentPic: newPhotoURL,
      });

      setEquipment((prev) => ({
        ...prev,
        equipmentPic: newPhotoURL,
      }));
      setPhotoChanged(false);
      alert("Foto do equipamento atualizada com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar foto:", err);
      alert("Erro ao salvar foto. Por favor, tente novamente.");
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm("Tem certeza que deseja remover a foto?")) {
      return;
    }

    try {
      setPhotoLoading(true);
      const equipmentDocRef = doc(db, "equipamentos", equipmentId);
      await updateDoc(equipmentDocRef, {
        equipmentPic: "",
      });

      setNewPhotoURL("/nonato.png");
      setImageFile(null);
      setPhotoChanged(false);
      alert("Foto do equipamento removida com sucesso!");
    } catch (err) {
      console.error("Erro ao remover foto:", err);
      alert("Erro ao remover foto. Por favor, tente novamente.");
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleDeleteEquipment = async () => {
    if (
      !window.confirm(
        "Tem certeza que deseja apagar este equipamento? Esta ação não pode ser desfeita."
      )
    ) {
      return;
    }

    try {
      setDeleteLoading(true);
      const equipmentDocRef = doc(db, "equipamentos", equipmentId);
      await deleteDoc(equipmentDocRef);
      navigate(`/app/client/${equipment.clientId}`);
    } catch (err) {
      console.error("Erro ao apagar equipamento:", err);
      alert("Erro ao apagar equipamento. Por favor, tente novamente.");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </button>
      </div>
    );
  }

  if (!equipment) return null;

  return (
    <div className="w-full max-w-3xl mx-auto rounded-lg p-4">
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all hover:scale-105 flex items-center justify-center"
        aria-label="Voltar"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <h2 className="text-2xl font-medium mb-6 text-white text-center">
        {equipment.type}
      </h2>

      <div className="flex flex-col items-center mb-6">
        <label className="relative cursor-pointer group">
          <div className="relative">
            <img
              src={newPhotoURL}
              alt="Foto do Equipamento"
              className="w-24 h-24 rounded-full mb-2 border-zinc-800 border-2 object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-8 h-8 text-white" />
            </div>
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
        </label>

        <div className="flex flex-wrap justify-center gap-2 mt-4">
          <button
            onClick={handleRemovePhoto}
            disabled={photoLoading}
            className="flex items-center px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {photoLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Remover Foto
          </button>

          <button
            onClick={handleDeleteEquipment}
            disabled={deleteLoading}
            className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {deleteLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Apagar Equipamento
          </button>
        </div>

        {photoChanged && (
          <button
            onClick={handleSavePhoto}
            disabled={photoLoading}
            className="mt-4 flex items-center px-6 py-2 bg-[#9df767] hover:bg-[#8be656] text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {photoLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Camera className="w-4 h-4 mr-2" />
            )}
            Salvar Foto
          </button>
        )}
      </div>

      <div className="bg-zinc-800 p-4 mb-6 rounded-lg space-y-3">
        <button
          onClick={() => navigate(`/app/client/${equipment.clientId}`)}
          className="w-full flex items-center text-gray-300 hover:text-white transition-colors"
        >
          <UserCircle className="w-5 h-5 mr-3" />
          <span className="font-medium mr-2">Cliente:</span>
          <span className="text-blue-400 hover:underline">{clientName}</span>
        </button>

        <div className="flex items-center text-gray-300">
          <Shapes className="w-5 h-5 mr-3" />
          <span className="font-medium mr-2">Tipo:</span>
          {equipment.type}
        </div>

        <div className="flex items-center text-gray-300">
          <Package className="w-5 h-5 mr-3" />
          <span className="font-medium mr-2">Marca:</span>
          {equipment.brand}
        </div>

        <div className="flex items-center text-gray-300">
          <Tag className="w-5 h-5 mr-3" />
          <span className="font-medium mr-2">Modelo:</span>
          {equipment.model}
        </div>

        <div className="flex items-center text-gray-300">
          <Barcode className="w-5 h-5 mr-3" />
          <span className="font-medium mr-2">Nº Série:</span>
          {equipment.serialNumber}
        </div>
      </div>

      <div className="fixed bottom-4 left-0 right-0 flex justify-center items-center gap-4 md:left-64">
        <button
          className="h-16 px-6 bg-[#1d2d50] hover:bg-[#283b6a] text-white font-bold flex items-center justify-center rounded-full transition-colors"
          onClick={() => navigate(`/app/edit-equipment/${equipmentId}`)}
        >
          <Edit2 className="w-5 h-5 mr-2" />
          Editar
        </button>
      </div>
    </div>
  );
};

export default EquipmentDetail;
