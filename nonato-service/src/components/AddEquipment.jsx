import React, { useState } from "react";
import { doc, getDoc, setDoc, increment } from "firebase/firestore";
import { db } from "../firebase.jsx";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  Loader2,
  Upload,
  X,
  Printer,
  Tag,
  FileText,
  Barcode,
  Package,
  AlertCircle,
} from "lucide-react";

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
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));
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
    <div className="w-full max-w-2xl mx-auto p-4">
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all hover:scale-105 flex items-center justify-center"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <h2 className="text-2xl text-center text-white font-semibold mb-6">
        Novo Equipamento
      </h2>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-red-500">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Foto do Equipamento */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Foto do Equipamento
          </label>
          {equipmentPicPreview ? (
            <div className="relative w-32 h-32 mx-auto">
              <img
                src={equipmentPicPreview}
                alt="Preview"
                className="w-full h-full rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center p-6 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
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
        </div>

        {/* Informações Básicas */}
        <div className="bg-gray-800 p-6 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Tipo
            </label>
            <div className="relative">
              <Printer className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="type"
                value={formData.type}
                onChange={handleChange}
                onBlur={() => handleBlur("type")}
                placeholder="Ex: Impressora, Scanner..."
                className={`w-full p-3 pl-10 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  touched.type && !formData.type ? "border border-red-500" : ""
                }`}
              />
            </div>
            {touched.type && !formData.type && (
              <p className="mt-1 text-sm text-red-500">Tipo é obrigatório</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Marca
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                onBlur={() => handleBlur("brand")}
                placeholder="Ex: HP, Epson..."
                className="w-full p-3 pl-10 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Modelo e Número de Série */}
        <div className="bg-gray-800 p-6 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Modelo
            </label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleChange}
                onBlur={() => handleBlur("model")}
                placeholder="Ex: LaserJet Pro M428fdw"
                className="w-full p-3 pl-10 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Número de Série
            </label>
            <div className="relative">
              <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="serialNumber"
                value={formData.serialNumber}
                onChange={handleChange}
                onBlur={() => handleBlur("serialNumber")}
                placeholder="Ex: XYZ123456"
                className="w-full p-3 pl-10 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors uppercase"
              />
            </div>
          </div>
        </div>

        {/* Botão Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full p-4 flex items-center justify-center text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:hover:bg-blue-600"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Adicionando...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 mr-2" />
              Adicionar Equipamento
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default AddEquipment;
