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
  Package,
  Barcode,
  Tag,
  Shapes,
  AlertTriangle,
  User,
} from "lucide-react";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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
        setNewPhotoURL(equipmentInfo.equipmentPic || "");

        // Fetch client name
        const clientDoc = doc(db, "clientes", equipmentInfo.clientId);
        const clientData = await getDoc(clientDoc);

        if (clientData.exists()) {
          setClientName(clientData.data().name);
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
    try {
      setIsSubmitting(true);
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
      setIsSubmitting(false);
    }
  };

  const handleDeleteEquipment = async () => {
    try {
      setIsSubmitting(true);
      await deleteDoc(doc(db, "equipamentos", equipmentId));
      navigate(`/app/client/${equipment.clientId}`);
    } catch (err) {
      console.error("Erro ao apagar equipamento:", err);
      setError("Erro ao apagar equipamento. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!equipment) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Detalhes do Equipamento
          </h1>
          <p className="text-sm text-zinc-400">
            Visualize e gerencie as informações do equipamento
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-10 w-10 rounded-full border-zinc-700 text-white hover:bg-green-700 bg-green-600"
        >
          <ArrowLeft className="h-4 w-4 text-white" />
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      {/* Equipment Info Card */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar className="h-20 w-20">
                <AvatarImage
                  src={equipment.equipmentPic}
                  alt={equipment.type}
                />
                <AvatarFallback className="bg-zinc-700 text-white">
                  {equipment.type?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
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
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-semibold text-white">
                  {equipment.type}
                </h3>
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                <User className="h-4 w-4" />
                <span>{clientName}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Equipment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {equipment.brand && (
              <div className="flex items-center gap-2 text-zinc-400">
                <Package className="h-4 w-4 shrink-0" />
                <span>{equipment.brand}</span>
              </div>
            )}
            {equipment.model && (
              <div className="flex items-center gap-2 text-zinc-400">
                <Tag className="h-4 w-4 shrink-0" />
                <span>{equipment.model}</span>
              </div>
            )}
            {equipment.serialNumber && (
              <div className="flex items-center gap-2 text-zinc-400">
                <Barcode className="h-4 w-4 shrink-0" />
                <span>{equipment.serialNumber}</span>
              </div>
            )}
            {equipment.type && (
              <div className="flex items-center gap-2 text-zinc-400">
                <Shapes className="h-4 w-4 shrink-0" />
                <span>{equipment.type}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 mt-6">
            <Button
              onClick={() => navigate(`/app/edit-equipment/${equipmentId}`)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Editar Equipamento
            </Button>
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Equipamento
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar exclusão</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem certeza que deseja excluir o equipamento{" "}
              <span className="font-semibold text-white">
                {equipment.type} - {equipment.model}
              </span>
              ? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-zinc-700 text-white hover:bg-zinc-700"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteEquipment}
              className="bg-red-600 hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EquipmentDetail;
