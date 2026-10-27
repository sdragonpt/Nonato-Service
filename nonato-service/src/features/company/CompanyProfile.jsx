// src/features/company/CompanyProfile.jsx
// "Cadastro da Nonato Service" — ficha da própria empresa (identificação,
// morada, contactos, dados bancários, logo). Guardada como documento único no
// Firestore. Daqui geram-se dois PDFs para enviar a clientes/fornecedores:
// Ficha Cadastral e Dados para Pagamento (ver pdf/companyDocumentsPDF.js).

import { useState, useEffect, useCallback, useRef } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../../firebase.jsx";
import { useAuth } from "../../hooks/useAuth";
import { compressImage } from "../../utils/imageCompression.js";
import { generateFichaCadastralPDF, generateDadosPagamentoPDF } from "./pdf/companyDocumentsPDF.js";
import {
  Building2,
  Loader2,
  Save,
  Camera,
  X,
  AlertTriangle,
  CheckCircle2,
  Landmark,
  Phone,
  Mail,
  MapPin,
  Copy,
  FileText,
  FileDown,
  Globe,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import { PageHeader, PageLoader } from "../../components/app";

const COMPANY_DOC_REF = ["config", "companyProfile"];

// Valores por omissão = dados da ficha cadastral em uso (out. 2026). Só são
// usados quando o campo ainda não tem nada gravado. Os dados bancários não
// ficam no código: preenchem-se e guardam-se aqui na app.
const emptyForm = {
  nomeEmpresa: "Nonato Service",
  denominacaoSocial: "Nonato Service",
  atividadePrincipal: "Assistência Técnica",
  cae: "",
  dataConstituicao: "",
  nif: "518772900",
  nib: "",
  iban: "",
  swift: "",
  nomeBanco: "",
  telefone: "",
  telemovel: "",
  email: "info@nonatoservice.pt",
  website: "nonatoservice.pt",
  morada: "Rua das Mimosas, 303",
  codigoPostal: "4905-642",
  localidade: "Vila de Punhe",
  concelho: "Viana do Castelo",
  distrito: "Viana do Castelo",
  pais: "Portugal",
  logo: "",
};

// O email da empresa passou a ser info@nonatoservice.pt.
const OLD_EMAIL = "service.nonato@gmail.com";

/** Junta o que está gravado com os valores por omissão (campos vazios ficam com o omissão). */
const withDefaults = (data) => {
  const merged = { ...emptyForm };
  for (const [key, val] of Object.entries(data || {})) {
    if (val !== "" && val !== null && val !== undefined) merged[key] = val;
  }
  if (merged.email === OLD_EMAIL) merged.email = emptyForm.email;
  return merged;
};

function Field({ label, icon: Icon, children }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
        )}
        {children}
      </div>
    </div>
  );
}

const CompanyProfile = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [formData, setFormData] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [pendingDefaults, setPendingDefaults] = useState(false);
  const [generating, setGenerating] = useState(null); // "ficha" | "pagamento" | null

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [existingLogoStoragePath, setExistingLogoStoragePath] = useState("");
  const previewUrlRef = useRef(null);

  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const snapshot = await getDoc(doc(db, ...COMPANY_DOC_REF));
      if (snapshot.exists()) {
        const data = snapshot.data();
        const merged = withDefaults(data);
        setFormData(merged);
        // Algum valor por omissão (ou o email novo) entrou no formulário:
        // avisa que é preciso guardar para ficar gravado.
        setPendingDefaults(
          Object.keys(emptyForm).some((k) => k !== "logo" && (data[k] ?? "") !== merged[k])
        );
        setLogoPreview(data.logo || "");
        setExistingLogoStoragePath(data.logoStoragePath || "");
      }
      setError(null);
    } catch (err) {
      console.error("Erro ao carregar dados da empresa:", err);
      setError("Erro ao carregar os dados da empresa.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSuccess(false);
  };

  // Liberta o object URL da pré-visualização quando deixa de ser preciso.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("O logo deve ter menos de 2MB");
      return;
    }
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    previewUrlRef.current = objectUrl;
    setLogoPreview(objectUrl);
    setLogoFile(file);
    setLogoRemoved(false);
    setError(null);
  };

  const removeLogo = () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setLogoPreview("");
    setLogoFile(null);
    setLogoRemoved(true);
  };

  // ✅ Mesmo princípio do AddClient/AddEquipment — comprime e envia para o
  // Storage em vez de gravar um base64 gigante dentro do documento único
  // da empresa. Só é enviado ao Storage quando o formulário é guardado
  // (evita ficar com ficheiros órfãos se o utilizador desistir a meio).
  const uploadLogo = async (file) => {
    const compressed = await compressImage(file, { maxDimension: 800, quality: 0.85 });
    const storagePath = `config/companyProfile/logo_${Date.now()}.jpg`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, compressed, { contentType: "image/jpeg" });
    const url = await getDownloadURL(storageRef);
    return { url, storagePath };
  };

  const deleteOldLogo = async () => {
    if (!existingLogoStoragePath) return;
    try {
      await deleteObject(ref(storage, existingLogoStoragePath));
    } catch {
      // logo antigo pode já não existir no storage
    }
  };

  const handleCopy = (field, value) => {
    if (!value) return;
    navigator.clipboard?.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const dataToSave = { ...formData };

      if (logoFile) {
        const uploaded = await uploadLogo(logoFile);
        await deleteOldLogo();
        dataToSave.logo = uploaded.url;
        dataToSave.logoStoragePath = uploaded.storagePath;
        setExistingLogoStoragePath(uploaded.storagePath);
        setLogoFile(null);
      } else if (logoRemoved) {
        await deleteOldLogo();
        dataToSave.logo = "";
        dataToSave.logoStoragePath = "";
        setExistingLogoStoragePath("");
        setLogoRemoved(false);
      }

      await setDoc(doc(db, ...COMPANY_DOC_REF), {
        ...dataToSave,
        lastUpdate: new Date(),
      });
      setFormData(dataToSave);
      setPendingDefaults(false);
      setSuccess(true);
    } catch (err) {
      console.error("Erro ao guardar dados da empresa:", err);
      setError("Erro ao guardar. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Os PDFs usam os dados que estão no ecrã (mesmo antes de guardar).
  const handleGenerate = async (kind) => {
    try {
      setGenerating(kind);
      setError(null);
      if (kind === "ficha") await generateFichaCadastralPDF(formData);
      else await generateDadosPagamentoPDF(formData);
    } catch (err) {
      console.error("Erro ao gerar PDF da empresa:", err);
      setError("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setGenerating(null);
    }
  };

  const textField = (name, label, { icon, type = "text", placeholder } = {}) => (
    <Field label={label} icon={icon}>
      <Input
        type={type}
        name={name}
        value={formData[name] || ""}
        onChange={handleChange}
        disabled={!isAdmin}
        placeholder={placeholder}
        className={`${icon ? "pl-10 " : ""}bg-muted/50 border-border text-foreground disabled:opacity-70 placeholder:text-muted-foreground`}
      />
    </Field>
  );

  if (isLoading) {
    return (
      <PageLoader />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cadastro da Nonato Service"
        description="Dados bancários e de contacto usados nos documentos enviados a clientes"
        icon={Building2}
      />

      {!isAdmin && (
        <Alert className="border-blue-500/30 bg-blue-500/10">
          <AlertTriangle className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-blue-300">
            Estás em modo de visualização: podes consultar os dados e gerar os PDFs. Apenas
            administradores podem editar estes dados.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500/30 bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-green-400">
            Dados da empresa atualizados com sucesso.
          </AlertDescription>
        </Alert>
      )}

      {pendingDefaults && isAdmin && (
        <Alert className="border-amber-500/30 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <AlertDescription className="text-amber-300">
            Alguns campos foram preenchidos com os dados da ficha cadastral (e o email passou a
            info@nonatoservice.pt). Confira e carregue em &quot;Guardar Alterações&quot; para ficarem gravados.
          </AlertDescription>
        </Alert>
      )}

      {/* Documentos da empresa */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-500" />
            Documentos da Empresa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Gera os PDFs com os dados que estão neste ecrã. Campos vazios saem em branco, para
            preencher à mão.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              ["ficha", "Ficha Cadastral", "Identificação, morada e contactos"],
              ["pagamento", "Dados para Pagamento", "Dados bancários para depósito / transferência"],
            ].map(([kind, title, hint]) => (
              <Button
                key={kind}
                type="button"
                onClick={() => handleGenerate(kind)}
                disabled={generating !== null}
                className="h-auto justify-start gap-3 bg-muted/50 border border-border py-3 text-left hover:bg-accent"
              >
                {generating === kind ? (
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin text-green-400" />
                ) : (
                  <FileDown className="h-5 w-5 shrink-0 text-green-400" />
                )}
                <span>
                  <span className="block font-semibold">{title}</span>
                  <span className="block text-xs font-normal text-muted-foreground">{hint}</span>
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Logo</CardTitle>
          </CardHeader>
          <CardContent>
            {logoPreview ? (
              <div className="relative w-32 h-32">
                <img
                  src={logoPreview}
                  alt="Logo da Nonato Service"
                  className="w-full h-full rounded-lg object-contain bg-muted/50 border border-border"
                />
                {isAdmin && (
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={removeLogo}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ) : isAdmin ? (
              <label className="flex flex-col items-center justify-center w-32 h-32 bg-muted/50 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-white/5 transition-colors">
                <Camera className="h-6 w-6 text-muted-foreground mb-2" />
                <span className="text-xs text-muted-foreground text-center px-2">
                  Carregar logo
                </span>
                <input type="file" className="hidden" onChange={handleLogoChange} accept="image/*" />
              </label>
            ) : (
              <p className="text-sm text-muted-foreground">Sem logo definido.</p>
            )}
          </CardContent>
        </Card>

        {/* Identificação */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Identificação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {textField("nomeEmpresa", "Nome comercial", { icon: Building2 })}
              {textField("denominacaoSocial", "Denominação social", { icon: Building2 })}
              {textField("nif", "NIF", { icon: Building2 })}
              {textField("atividadePrincipal", "Atividade principal")}
              {textField("cae", "CAE", { placeholder: "Ex: 33120" })}
              {textField("dataConstituicao", "Data de constituição", { placeholder: "dd/mm/aaaa" })}
            </div>
          </CardContent>
        </Card>

        {/* Morada */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Morada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {textField("morada", "Morada", { icon: MapPin })}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {textField("codigoPostal", "Código postal", { placeholder: "0000-000" })}
              {textField("localidade", "Localidade")}
              {textField("concelho", "Concelho")}
              {textField("distrito", "Distrito")}
              {textField("pais", "País")}
            </div>
          </CardContent>
        </Card>

        {/* Contactos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contactos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {textField("telefone", "Telefone", { icon: Phone, type: "tel" })}
              {textField("telemovel", "Telemóvel", { icon: Phone, type: "tel" })}
              {textField("email", "Email", { icon: Mail, type: "email" })}
              {textField("website", "Website", { icon: Globe, placeholder: "nonatoservice.pt" })}
            </div>
          </CardContent>
        </Card>

        {/* Dados bancários */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Landmark className="h-5 w-5 text-green-500" />
              Dados Bancários
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Estes dados aparecem nos documentos de pagamento enviados aos clientes. Usa o botão
              de copiar para os partilhares rapidamente.
            </p>

            {[
              { name: "nomeBanco", label: "Banco" },
              { name: "iban", label: "IBAN" },
              { name: "nib", label: "NIB" },
              { name: "swift", label: "SWIFT / BIC" },
            ].map(({ name, label }) => (
              <div key={name} className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">{label}</label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    name={name}
                    value={formData[name]}
                    onChange={handleChange}
                    disabled={!isAdmin}
                    className="disabled:opacity-70 font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy(name, formData[name])}
                    className="shrink-0"
                    title="Copiar"
                  >
                    {copiedField === name ? (
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {isAdmin && (
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                A guardar...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar Alterações
              </>
            )}
          </Button>
        )}
      </form>
    </div>
  );
};

export default CompanyProfile;
