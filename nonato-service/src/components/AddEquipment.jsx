import React, { useState } from "react";
import { doc, getDoc, setDoc, increment } from "firebase/firestore";
import { db } from "../firebase.jsx";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  Loader2,
  Plus,
  X,
  Printer,
  Tag,
  Package,
  Barcode,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const AddEquipment = () => {
  const navigate = useNavigate();
  const { clientId } = useParams();

  const [formData, setFormData] = useState({
    type: "",
    brand: "",
    model: "",
    serialNumber: "",
  });
  const [equipmentPic, setEquipmentPic] = useState(null);
  const [equipmentPicPreview, setEquipmentPicPreview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const getNextEquipmentId = async () => {
    try {
      const counterRef = doc(db, "counters", "equipmentsCounter");
      const counterSnapshot = await getDoc(counterRef);

      if (counterSnapshot.exists()) {
        const currentCounter = counterSnapshot.data().count;
        await setDoc(counterRef, { count: increment(1) }, { merge: true });
        return currentCounter + 1;
      } else {
        await setDoc(counterRef, { count: 1 });
        return 1;
      }
    } catch (error) {
      console.error("Erro ao gerar ID:", error);
      throw new Error("Falha ao gerar ID do equipamento");
    }
  };

  const handleEquipmentPicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("A imagem deve ter menos de 2MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setEquipmentPicPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setEquipmentPic(file);
      setError(null);
    }
  };

  const removeImage = () => {
    setEquipmentPic(null);
    setEquipmentPicPreview("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const allTouched = Object.keys(formData).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {}
    );
    setTouched(allTouched);

    if (!formData.type.trim()) {
      setError("O campo 'Tipo' é obrigatório.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const newEquipmentId = await getNextEquipmentId();
      await setDoc(doc(db, "equipamentos", newEquipmentId.toString()), {
        clientId,
        ...formData,
        serialNumber: formData.serialNumber.toUpperCase(),
        createdAt: new Date(),
        equipmentPic: equipmentPicPreview,
      });

      navigate(-1);
    } catch (err) {
      console.error("Erro ao adicionar equipamento:", err);
      setError("Erro ao adicionar equipamento. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-white">Novo Equipamento</h2>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center bg-zinc-800 text-white p-3 rounded-full hover:bg-zinc-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <Alert
          variant="destructive"
          className="mb-6 border-red-500 bg-red-500/10"
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      <Card className="bg-zinc-800 border-zinc-700 mb-6">
        <CardContent className="p-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Foto do Equipamento
          </label>
          {equipmentPicPreview ? (
            <div className="relative w-24 h-24 mx-auto">
              <img
                src={equipmentPicPreview}
                alt="Preview"
                className="w-full h-full rounded-full object-cover"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center p-6 bg-zinc-700/50 rounded-lg cursor-pointer hover:bg-zinc-700 transition-colors">
              <Camera className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-400">
                Clique para adicionar foto
              </span>
              <input
                type="file"
                className="hidden"
                onChange={handleEquipmentPicChange}
                accept="image/*"
              />
            </label>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tipo
              </label>
              <div className="relative">
                <Printer className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  onBlur={() => handleBlur("type")}
                  placeholder="Ex: Impressora, Scanner..."
                  className={`pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500 ${
                    touched.type && !formData.type ? "border-red-500" : ""
                  }`}
                />
              </div>
              {touched.type && !formData.type && (
                <p className="mt-1 text-sm text-red-500">Tipo é obrigatório</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Marca
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  placeholder="Ex: HP, Epson..."
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Modelo
              </label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  placeholder="Ex: LaserJet Pro M428fdw"
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Número de Série
              </label>
              <div className="relative">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  name="serialNumber"
                  value={formData.serialNumber}
                  onChange={handleChange}
                  placeholder="Ex: XYZ123456"
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500 uppercase"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Adicionando...
            </>
          ) : (
            <>
              <Plus className="w-5 h-5 mr-2" />
              Adicionar Equipamento
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default AddEquipment;
