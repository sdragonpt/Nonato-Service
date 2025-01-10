import React, { useState } from "react";
import { doc, setDoc, getDoc, increment } from "firebase/firestore";
import { db } from "../firebase.jsx";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  Loader2,
  Upload,
  X,
  User,
  MapPin,
  Mail,
  Phone,
  FileText,
  AlertCircle,
} from "lucide-react";

const AddClient = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    postalCode: "",
    phone: "",
    nif: "",
  });
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState("");
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

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("A imagem deve ter menos de 2MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setProfilePic(file);
      setError(null);
    }
  };

  const removeImage = () => {
    setProfilePic(null);
    setProfilePicPreview("");
  };

  const getNextClientId = async () => {
    try {
      const counterRef = doc(db, "counters", "clientsCounter");
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
      console.error("Erro ao gerar ID do cliente:", error);
      throw new Error("Falha ao gerar ID do cliente");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setTouched((prev) => ({
      ...prev,
      name: true,
    }));

    if (!formData.name.trim()) {
      setError("O campo Nome é obrigatório");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const newClientId = await getNextClientId();

      await setDoc(doc(db, "clientes", newClientId.toString()), {
        ...formData,
        createdAt: new Date(),
        profilePic: profilePicPreview,
      });

      navigate(-1);
    } catch (err) {
      console.error("Erro ao adicionar cliente:", err);
      setError("Erro ao adicionar cliente. Por favor, tente novamente.");
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
        Novo Cliente
      </h2>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-red-500">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Foto de Perfil */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Foto de Perfil
          </label>
          {profilePicPreview ? (
            <div className="relative w-32 h-32 mx-auto">
              <img
                src={profilePicPreview}
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
                onChange={handleProfilePicChange}
                accept="image/*"
              />
            </label>
          )}
        </div>

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
                placeholder="Ex: Manuel Silva"
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
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                onBlur={() => handleBlur("phone")}
                placeholder="Ex: 912345678"
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
                placeholder="Ex: Vila Real, Rua das Flores 123"
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
                onChange={handleChange}
                onBlur={() => handleBlur("postalCode")}
                placeholder="Ex: 1234-567"
                className="w-full p-3 pl-10 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              NIF
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="nif"
                value={formData.nif}
                onChange={handleChange}
                onBlur={() => handleBlur("nif")}
                placeholder="Ex: 123456789"
                className="w-full p-3 pl-10 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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
              Adicionar Cliente
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default AddClient;
