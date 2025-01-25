import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase.jsx";
import {
  ArrowLeft,
  Camera,
  Loader2,
  Trash2,
  Edit,
  Plus,
  Package,
  Barcode,
  Tag,
  Shapes,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

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
        setError("A imagem deve ter menos de 2MB");
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
      setError("Por favor, selecione uma imagem para salvar.");
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
    } catch (err) {
      console.error("Erro ao salvar foto:", err);
      setError("Erro ao salvar foto. Por favor, tente novamente.");
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm("Tem certeza que deseja remover a foto?")) return;

    try {
      setPhotoLoading(true);
      const equipmentDocRef = doc(db, "equipamentos", equipmentId);
      await updateDoc(equipmentDocRef, {
        equipmentPic: "",
      });

      setNewPhotoURL("/nonato.png");
      setImageFile(null);
      setPhotoChanged(false);
    } catch (err) {
      console.error("Erro ao remover foto:", err);
      setError("Erro ao remover foto. Por favor, tente novamente.");
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleDeleteEquipment = async () => {
    if (
      !window.confirm(
        "Tem certeza que deseja apagar este equipamento? Esta ação não pode ser desfeita."
      )
    )
      return;

    try {
      setDeleteLoading(true);
      await deleteDoc(doc(db, "equipamentos", equipmentId));
      navigate(`/app/client/${equipment.clientId}`);
    } catch (err) {
      console.error("Erro ao apagar equipamento:", err);
      setError("Erro ao apagar equipamento. Por favor, tente novamente.");
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
        <Alert
          variant="destructive"
          className="mb-6 border-red-500 bg-red-500/10"
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
        <Button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
      </div>
    );
  }

  if (!equipment) return null;

  return (
    <div className="container max-w-4xl mx-auto px-4 py-4 md:py-8">
      <nav className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div className="hidden md:block">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-400 hover:text-blue-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar
          </button>
        </div>
        <div className="md:hidden fixed top-4 right-4 z-50">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center bg-gray-700 text-white p-3 rounded-full hover:bg-gray-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
        <div className="flex w-full md:w-auto gap-2">
          <button
            onClick={() => navigate(`/app/edit-equipment/${equipmentId}`)}
            className="flex-1 md:flex-none bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center justify-center hover:bg-blue-600"
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </button>
        </div>
      </nav>

      <div className="bg-zinc-800 rounded-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row items-center text-center md:text-left gap-4">
          <div className="relative group">
            <img
              src={newPhotoURL}
              alt={equipment.type}
              className="w-24 h-24 md:w-20 md:h-20 rounded-full object-cover border-2 border-gray-700"
            />
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="w-6 h-6 text-white" />
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">{equipment.type}</h2>
            <p className="text-gray-400">
              {equipment.brand} {equipment.model}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="flex items-center text-gray-300">
            <Package className="w-5 h-5 mr-3 shrink-0 text-gray-400" />
            <span>{equipment.brand || "Marca não definida"}</span>
          </div>
          <div className="flex items-center text-gray-300">
            <Shapes className="w-5 h-5 mr-3 shrink-0 text-gray-400" />
            <span>{equipment.type || "Tipo não definido"}</span>
          </div>
          <div className="flex items-center text-gray-300">
            <Tag className="w-5 h-5 mr-3 shrink-0 text-gray-400" />
            <span>{equipment.model || "Modelo não definido"}</span>
          </div>
          <div className="flex items-center text-gray-300">
            <Barcode className="w-5 h-5 mr-3 shrink-0 text-gray-400" />
            <span>{equipment.serialNumber || "Nº Série não definido"}</span>
          </div>
        </div>
      </div>

      <div className="fixed bottom-6 right-6 flex flex-col items-end gap-4 z-50">
        <div className="flex gap-2">
          <button
            onClick={handleDeleteEquipment}
            disabled={deleteLoading}
            className="bg-red-500 p-3 md:p-3 rounded-full shadow-lg hover:bg-red-600 hover:scale-105 transition-all text-white"
            title="Apagar Equipamento"
          >
            {deleteLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Trash2 className="w-5 h-5" />
            )}
            <span className="sr-only">Apagar Equipamento</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EquipmentDetail;
