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
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar.jsx";
import { PageHeader, FormSection, InputField, FieldGrid, PageLoader } from "../../../components/app";

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
    return <PageLoader label="A carregar cliente…" />;
  }

  const hasChanges =
    (originalData &&
      Object.keys(formData).some((key) =>
        key === "grupoIds"
          ? [...formData.grupoIds].sort().join() !== [...(originalData.grupoIds || [])].sort().join()
          : formData[key] !== originalData[key]
      )) ||
    !!photoFile ||
    photoRemoved;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Editar Cliente"
        description="Atualize as informações do cliente"
        icon={UserCog}
        back
      />

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection title="Informações do cliente" icon={User}>
          {/* Foto + Tipo de Cliente lado a lado */}
          <div className="flex flex-col items-start gap-5 sm:flex-row">
            {/* Avatar com overlay de câmara */}
            <div className="mx-auto shrink-0 space-y-2 sm:mx-0">
              <div className="group relative">
                <Avatar className="h-24 w-24 ring-2 ring-white/10">
                  <AvatarImage src={profilePicPreview} alt="Foto do cliente" className="object-cover" />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    <User className="h-9 w-9" />
                  </AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                  <Camera className="h-6 w-6 text-white" />
                  <input type="file" accept="image/*" onChange={handleProfilePicChange} className="hidden" />
                </label>
              </div>
              {profilePicPreview && (
                <button
                  type="button"
                  onClick={removeImage}
                  className="mx-auto flex items-center gap-1 text-xs text-red-400 hover:text-red-300 sm:mx-0"
                >
                  <Trash2 className="h-3 w-3" />
                  Remover foto
                </button>
              )}
            </div>

            {/* Tipo de Cliente — controlo segmentado */}
            <div className="w-full flex-1 space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Tipo de Cliente</label>
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted/60 p-1">
                {[
                  ["individual", "Pessoa Física", UserCheck],
                  ["company", "Empresa", UserCog],
                ].map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleTypeChange(value)}
                    aria-pressed={formData.type === value}
                    className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      formData.type === value
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Clique na foto para a substituir</p>
            </div>
          </div>

          <InputField
            label={formData.type === "company" ? "Nome da Empresa" : "Nome Completo"}
            required
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
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium">
                  Já existe{duplicateMatches.length > 1 ? "m" : ""} cliente
                  {duplicateMatches.length > 1 ? "s" : ""} parecido{duplicateMatches.length > 1 ? "s" : ""}
                </p>
                <div className="mt-2 space-y-1">
                  {duplicateMatches.slice(0, 3).map((match) => (
                    <button
                      type="button"
                      key={match.id}
                      onClick={() => navigate(`/app/client/${match.id}`)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg bg-black/20 px-3 py-2 text-left hover:bg-black/30"
                    >
                      <span className="truncate text-sm text-foreground">
                        {match.name}
                        <span className="ml-2 text-xs text-muted-foreground">{match.phone}</span>
                      </span>
                      <span className="shrink-0 text-xs">Ver cliente</span>
                    </button>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {formData.type === "individual" && (
            <InputField
              label="Empresa (opcional)"
              icon={Building2}
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="Ex: Nome da Empresa"
            />
          )}

          <FieldGrid cols={2}>
            <InputField
              label="Telefone"
              icon={Phone}
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Ex: 912 345 678"
            />
            <InputField
              label="NIF"
              icon={FileText}
              type="text"
              name="nif"
              value={formData.nif}
              onChange={handleChange}
              placeholder="Nº de identificação fiscal"
            />
          </FieldGrid>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_11rem]">
            <InputField
              label="Morada"
              icon={MapPin}
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Ex: Rua Exemplo, 123"
            />
            <InputField
              label="Código Postal"
              type="text"
              name="postalCode"
              value={formData.postalCode}
              onChange={handleChange}
              placeholder="0000-000"
            />
          </div>

          <MultiGroupField
            kind={GROUP_KINDS.CLIENTES}
            value={formData.grupoIds}
            onChange={(grupoIds) => setFormData((prev) => ({ ...prev, grupoIds }))}
            dialogTitle="Grupos de clientes"
          />
        </FormSection>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting || !hasChanges} className="sm:min-w-44">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                A guardar…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Guardar alterações
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditClient;
