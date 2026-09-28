import { useState, useEffect, useMemo, useRef } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useParams, useNavigate } from "react-router-dom";
import { db, storage } from "../../../firebase.jsx";
import { useClients } from "../../../context/ClientsContext.jsx";
import { searchIncludes } from "../../../utils/normalizeSearch.js";
import { compressImage } from "../../../utils/imageCompression.js";
import { MultiGroupField } from "../../../components/shared/GroupFields.jsx";
import { GROUP_KINDS } from "../../../services/groupsStore.js";
import {
  ArrowLeft,
  Camera,
  Loader2,
  Save,
  Trash2,
  User,
  UserCog,
  UserCheck,
  MapPin,
  Phone,
  FileText,
  AlertTriangle,
  Building2,
} from "lucide-react";

// UI Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar.jsx";

// ✅ Mesmo bloco reutilizável do AddClient.jsx — mantém os dois formulários
// visualmente e estruturalmente consistentes.
const FieldRow = ({ label, icon: Icon, error, ...inputProps }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-zinc-400">{label}</label>
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
      <Input
        {...inputProps}
        className={`pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500 ${
          error ? "border-red-500" : ""
        }`}
      />
    </div>
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

const onlyDigits = (value) => (value || "").replace(/\D/g, "");

const EditClient = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { updateClientInCache, ensureClients } = useClients();

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    postalCode: "",
    nif: "",
    type: "individual",
    company: "",
    grupoIds: [],
  });

  const [profilePicPreview, setProfilePicPreview] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [existingStoragePath, setExistingStoragePath] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState({});
  const [originalData, setOriginalData] = useState(null);
  const [existingClients, setExistingClients] = useState([]);
  const previewUrlRef = useRef(null);

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
          type: data.type || "individual",
          company: data.company || "",
          grupoIds: data.grupoIds || [],
        });
        setProfilePicPreview(data.profilePic || "");
        setExistingStoragePath(data.profilePicStoragePath || "");
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

  // ✅ Clientes já existentes (do cache partilhado), para poder avisar de
  // possíveis duplicados — o próprio cliente é excluído da comparação.
  useEffect(() => {
    ensureClients()
      .then(setExistingClients)
      .catch((err) => console.error("Erro ao carregar clientes:", err));
  }, [ensureClients]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // ✅ Telefone, código postal e NIF ficam em texto livre — clientes
    // podem ser de outros países, com formatos diferentes do português.
    const nextValue = name === "phone" ? value.replace(/[^\d+()\s-]/g, "") : value;
    setFormData((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleTypeChange = (value) => {
    setFormData((prev) => ({ ...prev, type: value }));
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setError("A imagem deve ter menos de 8MB");
      return;
    }

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    previewUrlRef.current = objectUrl;
    setProfilePicPreview(objectUrl);
    setPhotoFile(file);
    setPhotoRemoved(false);
    setError(null);
  };

  const removeImage = () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setProfilePicPreview("");
    setPhotoFile(null);
    setPhotoRemoved(true);
  };

  // ✅ Deteção de possível cliente duplicado — mesma lógica do AddClient,
  // mas excluindo o próprio cliente da comparação.
  const duplicateMatches = useMemo(() => {
    const nameTerm = formData.name.trim();
    const phoneDigits = onlyDigits(formData.phone);
    if (nameTerm.length < 3 && phoneDigits.length < 6) return [];
    return existingClients.filter((c) => {
      if (c.id === clientId) return false;
      const nameMatch = nameTerm.length >= 3 && searchIncludes(c.name, nameTerm);
      const phoneMatch = phoneDigits.length >= 6 && onlyDigits(c.phone).includes(phoneDigits);
      return nameMatch || phoneMatch;
    });
  }, [formData.name, formData.phone, existingClients, clientId]);

  // ✅ Mesmo princípio do AddClient: comprime e envia para o Storage em vez
  // de gravar base64 no documento. `<img src={client.profilePic}>` continua
  // a funcionar sem alterações em nenhum sítio que já mostra a foto.
  const uploadProfilePic = async (file) => {
    const compressed = await compressImage(file, { maxDimension: 600, quality: 0.8 });
    const storagePath = `clientes/${clientId}/perfil_${Date.now()}.jpg`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, compressed, { contentType: "image/jpeg" });
    const url = await getDownloadURL(storageRef);
    return { url, storagePath };
  };

  const deleteOldStorageFile = async () => {
    if (!existingStoragePath) return;
    try {
      await deleteObject(ref(storage, existingStoragePath));
    } catch {
      // foto antiga pode já não existir no storage
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

      const updatedData = {
        ...formData,
        name: formData.name.trim(),
        company: formData.company.trim(),
        address: formData.address.trim(),
        lastUpdate: new Date(),
      };

      if (photoFile) {
        const uploaded = await uploadProfilePic(photoFile);
        await deleteOldStorageFile();
        updatedData.profilePic = uploaded.url;
        updatedData.profilePicStoragePath = uploaded.storagePath;
      } else if (photoRemoved) {
        await deleteOldStorageFile();
        updatedData.profilePic = "";
        updatedData.profilePicStoragePath = "";
      }

      const clientRef = doc(db, "clientes", clientId);
      await updateDoc(clientRef, updatedData);

      // Mantém o cache partilhado (ClientsContext) atualizado, para as
      // alterações aparecerem de imediato noutras páginas
      updateClientInCache(clientId, updatedData);

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
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  const hasChanges =
    (originalData &&
      Object.keys(formData).some((key) => formData[key] !== originalData[key])) ||
    !!photoFile ||
    photoRemoved;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
            <UserCog className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Editar Cliente</h1>
            <p className="text-sm text-zinc-400">
              Atualize as informações do cliente
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-10 w-10 rounded-full border-zinc-700 text-white hover:bg-green-700 bg-green-600 shrink-0"
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Information Card */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Informações do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Foto + Tipo de Cliente lado a lado */}
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              {/* Avatar com overlay de câmara */}
              <div className="shrink-0 mx-auto sm:mx-0 space-y-2">
                <div className="relative group">
                  <Avatar className="h-24 w-24 border-2 border-zinc-700">
                    <AvatarImage src={profilePicPreview} alt="Foto do cliente" className="object-cover" />
                    <AvatarFallback className="bg-zinc-900 text-zinc-500">
                      <User className="h-9 w-9" />
                    </AvatarFallback>
                  </Avatar>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-6 h-6 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePicChange}
                      className="hidden"
                    />
                  </label>
                </div>
                {profilePicPreview && (
                  <button
                    type="button"
                    onClick={removeImage}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 mx-auto sm:mx-0"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remover foto
                  </button>
                )}
              </div>

              {/* Tipo de Cliente — toggle segmentado */}
              <div className="flex-1 w-full space-y-1.5">
                <label className="text-sm font-medium text-zinc-400">
                  Tipo de Cliente
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleTypeChange("individual")}
                    className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors ${
                      formData.type === "individual"
                        ? "bg-green-600 border-green-600 text-white"
                        : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-700/50"
                    }`}
                  >
                    <UserCheck className="h-4 w-4" />
                    Pessoa Física
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange("company")}
                    className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors ${
                      formData.type === "company"
                        ? "bg-green-600 border-green-600 text-white"
                        : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-700/50"
                    }`}
                  >
                    <UserCog className="h-4 w-4" />
                    Empresa
                  </button>
                </div>
                <p className="text-xs text-zinc-500">
                  Clique na foto para a substituir
                </p>
              </div>
            </div>

            {/* Name Field */}
            <FieldRow
              label={formData.type === "company" ? "Nome da Empresa" : "Nome Completo"}
              icon={User}
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              onBlur={() => handleBlur("name")}
              placeholder={formData.type === "company" ? "Ex: Empresa LTDA" : "Ex: João Silva"}
              error={touched.name && !formData.name ? "Nome é obrigatório" : null}
            />

            {/* ✅ Aviso de possível cliente duplicado */}
            {duplicateMatches.length > 0 && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0" />
                  <span className="text-sm font-medium text-orange-400">
                    Já existe{duplicateMatches.length > 1 ? "m" : ""} cliente
                    {duplicateMatches.length > 1 ? "s" : ""} parecido{duplicateMatches.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-1">
                  {duplicateMatches.slice(0, 3).map((match) => (
                    <button
                      type="button"
                      key={match.id}
                      onClick={() => navigate(`/app/client/${match.id}`)}
                      className="w-full flex items-center justify-between gap-2 p-2 bg-zinc-900/60 rounded border border-zinc-700 hover:bg-zinc-900 text-left"
                    >
                      <span className="text-sm text-white truncate">
                        {match.name}
                        <span className="text-xs text-zinc-400 ml-2">{match.phone}</span>
                      </span>
                      <span className="text-xs text-orange-400 shrink-0">Ver cliente</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Individual-specific fields */}
            {formData.type === "individual" && (
              <FieldRow
                label="Empresa (Opcional)"
                icon={Building2}
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="Ex: Nome da Empresa"
              />
            )}

            {/* Contacto — telefone + NIF lado a lado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldRow
                label="Telefone"
                icon={Phone}
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Ex: 912 345 678"
              />
              <FieldRow
                label="NIF"
                icon={FileText}
                type="text"
                name="nif"
                value={formData.nif}
                onChange={handleChange}
                placeholder="Nº de identificação fiscal"
              />
            </div>

            {/* Morada — endereço + código postal lado a lado */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
              <FieldRow
                label="Endereço"
                icon={MapPin}
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Ex: Rua Exemplo, 123"
              />
              <div className="space-y-1.5 sm:w-44">
                <label className="text-sm font-medium text-zinc-400">Código Postal</label>
                <Input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  placeholder="Código Postal"
                  className="bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                />
              </div>
            </div>

            <MultiGroupField
              kind={GROUP_KINDS.CLIENTES}
              value={formData.grupoIds}
              onChange={(grupoIds) => setFormData((prev) => ({ ...prev, grupoIds }))}
              dialogTitle="Grupos de clientes"
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting || !hasChanges}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default EditClient;
