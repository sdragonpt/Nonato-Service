import { useState, useEffect, useMemo, useRef } from "react";
import { doc, setDoc, getDoc, increment } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../../firebase.jsx";
import { useNavigate } from "react-router-dom";
import { useClients } from "../../../context/ClientsContext.jsx";
import { searchIncludes } from "../../../utils/normalizeSearch.js";
import { compressImage } from "../../../utils/imageCompression.js";
import { ClientGroupField } from "../../../components/shared/GroupFields.jsx";
import {
  Camera,
  Loader2,
  Plus,
  User,
  UserCog,
  UserPlus,
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
import { PageHeader, FormSection, InputField, FieldGrid } from "../../../components/app";

const onlyDigits = (value) => (value || "").replace(/\D/g, "");

const AddClient = () => {
  const navigate = useNavigate();
  const { addClientToCache, ensureClients } = useClients();
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    postalCode: "",
    nif: "",
    type: "individual", // individual ou company
    company: "",
    grupoIds: [],
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState({});
  const [existingClients, setExistingClients] = useState([]);
  const previewUrlRef = useRef(null);

  // ✅ Carrega os clientes já existentes (do cache partilhado) para poder
  // avisar sobre possíveis duplicados enquanto se preenche o formulário.
  useEffect(() => {
    ensureClients()
      .then(setExistingClients)
      .catch((err) => console.error("Erro ao carregar clientes:", err));
  }, [ensureClients]);

  // Liberta o object URL da pré-visualização quando deixa de ser preciso.
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
    setError(null);
  };

  // ✅ Deteção de possível cliente duplicado — compara nome e telefone (só
  // dígitos) com os clientes já registados. Nunca bloqueia o submit, é só
  // um aviso para evitar registos repetidos por engano.
  const duplicateMatches = useMemo(() => {
    const nameTerm = formData.name.trim();
    const phoneDigits = onlyDigits(formData.phone);
    if (nameTerm.length < 3 && phoneDigits.length < 6) return [];
    return existingClients.filter((c) => {
      const nameMatch = nameTerm.length >= 3 && searchIncludes(c.name, nameTerm);
      const phoneMatch = phoneDigits.length >= 6 && onlyDigits(c.phone).includes(phoneDigits);
      return nameMatch || phoneMatch;
    });
  }, [formData.name, formData.phone, existingClients]);

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

  // ✅ Comprime e envia a foto para o Storage (em vez de gravar um base64
  // gigante dentro do próprio documento do cliente — mais barato de ler,
  // sem risco do documento ficar demasiado grande). Todos os sítios que
  // mostram `client.profilePic` continuam a funcionar sem alterações,
  // porque só fazem `<img src={client.profilePic}>` — tanto faz se é um
  // data URL ou um URL do Storage.
  const uploadProfilePic = async (clientId, file) => {
    const compressed = await compressImage(file, { maxDimension: 600, quality: 0.8 });
    const storagePath = `clientes/${clientId}/perfil_${Date.now()}.jpg`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, compressed, { contentType: "image/jpeg" });
    const url = await getDownloadURL(storageRef);
    return { url, storagePath };
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

      const uploaded = photoFile ? await uploadProfilePic(newClientId, photoFile) : null;

      const newClientData = {
        ...formData,
        name: formData.name.trim(),
        company: formData.company.trim(),
        address: formData.address.trim(),
        createdAt: new Date(),
        lastUpdate: new Date(),
        profilePic: uploaded?.url || "",
        profilePicStoragePath: uploaded?.storagePath || "",
      };
      await setDoc(doc(db, "clientes", newClientId.toString()), newClientData);

      // Atualiza o cache partilhado (ClientsContext) para o cliente novo
      // aparecer de imediato noutras páginas, sem esperar pelos 5 min de cache
      addClientToCache({ id: newClientId.toString(), ...newClientData });

      navigate(-1);
    } catch (err) {
      console.error("Erro ao adicionar cliente:", err);
      setError("Erro ao adicionar cliente. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Novo Cliente"
        description="Adicione um novo cliente ao sistema"
        icon={UserPlus}
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
            <div className="group relative mx-auto shrink-0 sm:mx-0">
              <Avatar className="h-24 w-24 ring-2 ring-white/10">
                <AvatarImage src={profilePicPreview} alt="Foto do cliente" className="object-cover" />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  <User className="h-9 w-9" />
                </AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                <Camera className="h-6 w-6 text-foreground" />
                <input type="file" accept="image/*" onChange={handleProfilePicChange} className="hidden" />
              </label>
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
              <p className="text-xs text-muted-foreground">Clique na foto para adicionar uma imagem (opcional)</p>
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

          <ClientGroupField
            value={formData.grupoIds}
            onChange={(grupoIds) => setFormData((prev) => ({ ...prev, grupoIds }))}
          />
        </FormSection>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting} className="sm:min-w-44">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                A adicionar…
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Adicionar Cliente
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddClient;
