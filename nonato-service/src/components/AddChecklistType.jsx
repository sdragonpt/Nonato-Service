import React, { useState } from "react";
import { doc, setDoc, getDoc, increment } from "firebase/firestore";
import { db } from "../firebase.jsx";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Save,
  AlertCircle,
} from "lucide-react";

const AddChecklistType = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    type: "",
    characteristics: [""], // Inicializa com uma característica vazia
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState({
    type: false,
    characteristics: [false],
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCharacteristicChange = (index, value) => {
    setFormData((prev) => {
      const newCharacteristics = [...prev.characteristics];
      newCharacteristics[index] = value;
      return {
        ...prev,
        characteristics: newCharacteristics,
      };
    });
  };

  const addCharacteristic = () => {
    setFormData((prev) => ({
      ...prev,
      characteristics: [...prev.characteristics, ""],
    }));
    setTouched((prev) => ({
      ...prev,
      characteristics: [...prev.characteristics, false],
    }));
  };

  const removeCharacteristic = (index) => {
    setFormData((prev) => ({
      ...prev,
      characteristics: prev.characteristics.filter((_, i) => i !== index),
    }));
    setTouched((prev) => ({
      ...prev,
      characteristics: prev.characteristics.filter((_, i) => i !== index),
    }));
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));
  };

  const handleCharacteristicBlur = (index) => {
    setTouched((prev) => ({
      ...prev,
      characteristics: prev.characteristics.map((t, i) =>
        i === index ? true : t
      ),
    }));
  };

  const getNextTypeId = async () => {
    try {
      const counterRef = doc(db, "counters", "checklistTypesCounter");
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
      throw new Error("Falha ao gerar ID do tipo");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Marca todos os campos como touched
    setTouched({
      type: true,
      characteristics: formData.characteristics.map(() => true),
    });

    // Validações
    if (!formData.type.trim()) {
      setError("O tipo é obrigatório");
      return;
    }

    const validCharacteristics = formData.characteristics.filter((char) =>
      char.trim()
    );
    if (validCharacteristics.length === 0) {
      setError("Adicione pelo menos uma característica");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const newTypeId = await getNextTypeId();

      await setDoc(doc(db, "checklist_machines", newTypeId.toString()), {
        type: formData.type,
        characteristics: validCharacteristics,
        createdAt: new Date(),
      });

      navigate("/app/manage-checklist");
    } catch (err) {
      console.error("Erro ao adicionar tipo:", err);
      setError("Erro ao adicionar tipo. Por favor, tente novamente.");
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
        Novo Tipo no Checklist
      </h2>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-red-500">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tipo */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Tipo
            </label>
            <input
              type="text"
              name="type"
              value={formData.type}
              onChange={handleChange}
              onBlur={() => handleBlur("type")}
              className={`w-full p-3 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                touched.type && !formData.type ? "border border-red-500" : ""
              }`}
              placeholder="Ex: Impressora, Scanner, etc."
            />
            {touched.type && !formData.type && (
              <p className="mt-1 text-sm text-red-500">Tipo é obrigatório</p>
            )}
          </div>
        </div>

        {/* Características */}
        <div className="bg-gray-800 p-6 rounded-lg space-y-4">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-gray-300">
              Características
            </label>
            <button
              type="button"
              onClick={addCharacteristic}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </button>
          </div>

          {formData.characteristics.map((characteristic, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={characteristic}
                onChange={(e) =>
                  handleCharacteristicChange(index, e.target.value)
                }
                onBlur={() => handleCharacteristicBlur(index)}
                placeholder={`Característica ${index + 1}`}
                className={`flex-1 p-3 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  touched.characteristics[index] && !characteristic.trim()
                    ? "border border-red-500"
                    : ""
                }`}
              />
              {formData.characteristics.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCharacteristic(index)}
                  className="p-2 text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
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
              <Save className="w-5 h-5 mr-2" />
              Adicionar Tipo
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default AddChecklistType;
