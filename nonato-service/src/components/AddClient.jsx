import React, { useState } from "react";
import { doc, setDoc, getDoc, increment } from "firebase/firestore";
import { db } from "../firebase.jsx";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  Loader2,
  Plus,
  X,
  User,
  MapPin,
  Mail,
  Phone,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
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
    setTouched((prev) => ({ ...prev, name: true }));

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
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-white">Novo Cliente</h2>
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
            Foto de Perfil
          </label>
          {profilePicPreview ? (
            <div className="relative w-24 h-24 mx-auto">
              <img
                src={profilePicPreview}
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
                onChange={handleProfilePicChange}
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
                Nome
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={() => handleBlur("name")}
                  placeholder="Ex: Manuel Silva"
                  className={`pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500 ${
                    touched.name && !formData.name ? "border-red-500" : ""
                  }`}
                />
              </div>
              {touched.name && !formData.name && (
                <p className="mt-1 text-sm text-red-500">Nome é obrigatório</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Telefone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Ex: 912345678"
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Endereço
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Ex: Vila Real, Rua das Flores 123"
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Código Postal
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  placeholder="Ex: 1234-567"
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                NIF
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  name="nif"
                  value={formData.nif}
                  onChange={handleChange}
                  placeholder="Ex: 123456789"
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
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
              Adicionar Cliente
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default AddClient;
