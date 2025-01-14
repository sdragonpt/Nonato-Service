import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase.jsx";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Save,
  AlertCircle,
} from "lucide-react";

const EditChecklistType = () => {
  const { typeId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    type: "",
    characteristics: [""],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState({
    type: false,
    characteristics: [false],
  });
  const [originalData, setOriginalData] = useState(null);

  useEffect(() => {
    const fetchType = async () => {
      try {
        setIsLoading(true);
        const typeDoc = doc(db, "checklist_machines", typeId);
        const typeData = await getDoc(typeDoc);

        if (!typeData.exists()) {
          setError("Tipo não encontrado");
          return;
        }

        const data = typeData.data();
        const formattedData = {
          type: data.type || "",
          characteristics: data.characteristics || [""],
        };

        setFormData(formattedData);
        setOriginalData(formattedData);
        setTouched({
          type: false,
          characteristics: data.characteristics.map(() => false),
        });

        setError(null);
      } catch (err) {
        console.error("Erro ao carregar tipo:", err);
        setError("Erro ao carregar dados do tipo");
      } finally {
        setIsLoading(false);
      }
    };

    fetchType();
  }, [typeId]);

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
    if (formData.characteristics.length === 1) {
      setError("É necessário ter pelo menos uma característica");
      return;
    }

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

  const hasChanges =
    originalData &&
    (formData.type !== originalData.type ||
      formData.characteristics.length !== originalData.characteristics.length ||
      formData.characteristics.some(
        (char, index) => char !== originalData.characteristics[index]
      ));

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

      await updateDoc(doc(db, "checklist_machines", typeId), {
        type: formData.type,
        characteristics: validCharacteristics,
      });

      navigate("/app/manage-checklist");
    } catch (err) {
      console.error("Erro ao atualizar tipo:", err);
      setError("Erro ao salvar alterações. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all hover:scale-105 flex items-center justify-center"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <h2 className="text-2xl text-center text-white font-semibold mb-6">
        Editar Tipo
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
              <button
                type="button"
                onClick={() => removeCharacteristic(index)}
                className="p-2 text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        {/* Botão Submit */}
        <button
          type="submit"
          disabled={isSubmitting || !hasChanges}
          className="w-full p-4 flex items-center justify-center text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:hover:bg-blue-600"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Salvar Alterações
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default EditChecklistType;
