import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase.jsx";
import {
  ArrowLeft,
  Loader2,
  Save,
  AlertCircle,
  User,
  MapPin,
  Mail,
  Phone,
  FileText,
  Building,
} from "lucide-react";

const EditClient = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    nif: "",
    postalCode: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState({});
  const [originalData, setOriginalData] = useState(null);

  useEffect(() => {
    const fetchClient = async () => {
      try {
        setIsLoading(true);
        const clientDoc = doc(db, "clientes", clientId);
        const clientData = await getDoc(clientDoc);

        if (!clientData.exists()) {
          setError("Cliente não encontrado");
          return;
        }

        const data = clientData.data();
        setFormData({
          name: data.name || "",
          address: data.address || "",
          phone: data.phone || "",
          nif: data.nif || "",
          postalCode: data.postalCode || "",
        });
        setOriginalData(data);
        setError(null);
      } catch (err) {
        console.error("Erro ao carregar cliente:", err);
        setError("Erro ao carregar dados do cliente");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClient();
  }, [clientId]);

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
    if (!formData.name.trim()) errors.name = "Nome é obrigatório";
    return errors;
  };

  const formatPostalCode = (value) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, 4)}-${digits.slice(4, 7)}`;
  };

  const handlePostalCodeChange = (e) => {
    const formatted = formatPostalCode(e.target.value);
    setFormData((prev) => ({
      ...prev,
      postalCode: formatted,
    }));
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

      const clientRef = doc(db, "clientes", clientId);
      await updateDoc(clientRef, formData);

      navigate(-1);
    } catch (err) {
      console.error("Erro ao atualizar cliente:", err);
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
    <div className="w-full max-w-2xl mx-auto p-4">
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all hover:scale-105 flex items-center justify-center"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <h2 className="text-2xl text-center text-white font-semibold mb-6">
        Editar Cliente
      </h2>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-red-500">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações Básicas */}
        <div className="bg-gray-800 p-6 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Nome
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={() => handleBlur("name")}
                className={`w-full p-3 pl-10 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  touched.name && !formData.name ? "border border-red-500" : ""
                }`}
              />
            </div>
            {touched.name && !formData.name && (
              <p className="mt-1 text-sm text-red-500">Nome é obrigatório</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Telefone
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                onBlur={() => handleBlur("phone")}
                placeholder="912345678"
                className="w-full p-3 pl-10 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Endereço e Detalhes */}
        <div className="bg-gray-800 p-6 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Endereço
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                onBlur={() => handleBlur("address")}
                placeholder="Vila Real, Rua das Flores 123"
                className="w-full p-3 pl-10 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Código Postal
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="postalCode"
                value={formData.postalCode}
                onChange={handlePostalCodeChange}
                onBlur={() => handleBlur("postalCode")}
                placeholder="1234-567"
                maxLength={8}
                className="w-full p-3 pl-10 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Informações Fiscais */}
        <div className="bg-gray-800 p-6 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              NIF
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="nif"
                value={formData.nif}
                onChange={handleChange}
                onBlur={() => handleBlur("nif")}
                maxLength={9}
                placeholder="123456789"
                className="w-full p-3 pl-10 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>
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

export default EditClient;
