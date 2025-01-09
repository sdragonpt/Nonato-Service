import React, { useState } from "react";
import { doc, getDoc, setDoc, increment } from "firebase/firestore";
import { db } from "../firebase.jsx";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Camera, Loader2, Upload, X } from "lucide-react";

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
        // 2MB limit
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

    // Marca todos os campos como touched para mostrar validações
    const allTouched = Object.keys(formData).reduce(
      (acc, key) => ({
        ...acc,
        [key]: true,
      }),
      {}
    );
    setTouched(allTouched);

    // Validação: Apenas o campo "type" é obrigatório
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
    <div className="min-h-screen p-4">
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all hover:scale-105 flex items-center justify-center"
        aria-label="Voltar"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <h2 className="text-2xl text-center text-white font-semibold mb-6">
        Novo Equipamento
      </h2>

      <div className="w-full max-w-md mx-auto">
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-500 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Tipo
            </label>
            <input
              id="type"
              type="text"
              name="type"
              value={formData.type}
              onChange={handleChange}
              onBlur={() => handleBlur("type")}
              placeholder="Ex: Impressora, Scanner..."
              className={`w-full p-3 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors
                ${
                  touched.type && !formData.type ? "border border-red-500" : ""
                }`}
            />
            {touched.type && !formData.type && (
              <p className="mt-1 text-sm text-red-500">Tipo é obrigatório</p>
            )}
          </div>

          <div>
            <label
              htmlFor="brand"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Marca
            </label>
            <input
              id="brand"
              type="text"
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              onBlur={() => handleBlur("brand")}
              placeholder="Ex: HP, Epson..."
              className={`w-full p-3 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors`}
            />
            {/* {touched.brand && !formData.brand && (
              <p className="mt-1 text-sm text-red-500">Marca é obrigatória</p>
            )} */}
          </div>

          <div>
            <label
              htmlFor="model"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Modelo
            </label>
            <input
              id="model"
              type="text"
              name="model"
              value={formData.model}
              onChange={handleChange}
              onBlur={() => handleBlur("model")}
              placeholder="Ex: LaserJet Pro M428fdw"
              className={`w-full p-3 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors`}
            />
            {/* {touched.model && !formData.model && (
              <p className="mt-1 text-sm text-red-500">Modelo é obrigatório</p>
            )} */}
          </div>

          <div>
            <label
              htmlFor="serialNumber"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Número de Série
            </label>
            <input
              id="serialNumber"
              type="text"
              name="serialNumber"
              value={formData.serialNumber}
              onChange={handleChange}
              onBlur={() => handleBlur("serialNumber")}
              placeholder="Ex: XYZ123456"
              className={`w-full p-3 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors uppercase`}
            />
            {/* {touched.serialNumber && !formData.serialNumber && (
              <p className="mt-1 text-sm text-red-500">
                Número de série é obrigatório
              </p>
            )} */}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full p-3 flex items-center justify-center text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:hover:bg-blue-600"
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
    </div>
  );
};

export default AddEquipment;
