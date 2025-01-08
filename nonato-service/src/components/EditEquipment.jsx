import React, { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase.jsx";
import { ArrowLeft, Loader2, Save, AlertCircle, User } from "lucide-react";

const EditEquipment = () => {
  const { equipmentId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    type: "",
    brand: "",
    model: "",
    serialNumber: "",
  });

  const [clientName, setClientName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState({});
  const [originalData, setOriginalData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Buscar equipamento
        const equipmentDoc = await getDoc(doc(db, "equipamentos", equipmentId));

        if (!equipmentDoc.exists()) {
          setError("Equipamento não encontrado");
          return;
        }

        const equipmentData = equipmentDoc.data();
        const formattedData = {
          type: equipmentData.type || "",
          brand: equipmentData.brand || "",
          model: equipmentData.model || "",
          serialNumber: equipmentData.serialNumber || "",
        };

        setFormData(formattedData);
        setOriginalData(formattedData);

        // Buscar nome do cliente
        const clientDoc = await getDoc(
          doc(db, "clientes", equipmentData.clientId)
        );
        if (clientDoc.exists()) {
          setClientName(clientDoc.data().name);
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError("Erro ao carregar dados. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [equipmentId]);

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

  const validateForm = () => {
    const errors = {};

    if (!formData.type.trim()) errors.type = "Tipo é obrigatório";
    if (!formData.brand.trim()) errors.brand = "Marca é obrigatória";
    if (!formData.model.trim()) errors.model = "Modelo é obrigatório";
    if (!formData.serialNumber.trim())
      errors.serialNumber = "Número de série é obrigatório";

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const allTouched = Object.keys(formData).reduce(
      (acc, key) => ({
        ...acc,
        [key]: true,
      }),
      {}
    );
    setTouched(allTouched);

    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setError("Por favor, corrija os erros no formulário");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await updateDoc(doc(db, "equipamentos", equipmentId), {
        ...formData,
        serialNumber: formData.serialNumber.toUpperCase(),
      });

      navigate(-1);
    } catch (err) {
      console.error("Erro ao atualizar equipamento:", err);
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

  const hasChanges =
    originalData &&
    Object.keys(formData).some((key) => formData[key] !== originalData[key]);

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
        Editar Equipamento
      </h2>

      <div className="w-full max-w-md mx-auto">
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg flex items-center text-red-500 text-sm">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="mb-6 p-4 bg-gray-700/50 rounded-lg flex items-center">
          <User className="w-5 h-5 text-gray-400 mr-3" />
          <div>
            <p className="text-sm text-gray-400">Cliente</p>
            <p className="text-white font-medium">{clientName}</p>
          </div>
        </div>

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
              className={`w-full p-3 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors
                ${
                  touched.brand && !formData.brand
                    ? "border border-red-500"
                    : ""
                }`}
            />
            {touched.brand && !formData.brand && (
              <p className="mt-1 text-sm text-red-500">Marca é obrigatória</p>
            )}
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
              className={`w-full p-3 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors
                ${
                  touched.model && !formData.model
                    ? "border border-red-500"
                    : ""
                }`}
            />
            {touched.model && !formData.model && (
              <p className="mt-1 text-sm text-red-500">Modelo é obrigatório</p>
            )}
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
              className={`w-full p-3 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors uppercase
                ${
                  touched.serialNumber && !formData.serialNumber
                    ? "border border-red-500"
                    : ""
                }`}
            />
            {touched.serialNumber && !formData.serialNumber && (
              <p className="mt-1 text-sm text-red-500">
                Número de série é obrigatório
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !hasChanges}
            className="w-full p-3 flex items-center justify-center text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:hover:bg-blue-600"
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
    </div>
  );
};

export default EditEquipment;
