import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import {
  Building2,
  Loader2,
  Save,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Phone,
  Landmark,
  Eye,
  EyeOff,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

import CompanyLogoUploader from "./components/CompanyLogoUploader";
import {
  COMPANY_PROFILE_COLLECTION,
  COMPANY_PROFILE_DOC,
  COMPANY_PROFILE_DEFAULTS,
  normalizeCompanyProfile,
} from "./companyProfileDefaults";

/**
 * Configuração do Papel Timbrado / Perfil da Empresa.
 *
 * Guarda um documento único em Firestore (`config/companyProfile`) com:
 *  - dados de identificação, morada, contactos, dados bancários
 *  - URL do logo (Firebase Storage)
 *  - toggles de visibilidade por campo para o cabeçalho dos PDFs
 *
 * Esta configuração é lida pelos geradores de PDF (orçamentos, OS,
 * comprovantes, dados de depósito) para compor o papel timbrado.
 */
const ManageCompanyProfile = () => {
  const [formData, setFormData] = useState(() => ({
    ...COMPANY_PROFILE_DEFAULTS,
    show: { ...COMPANY_PROFILE_DEFAULTS.show },
  }));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const docRef = doc(db, COMPANY_PROFILE_COLLECTION, COMPANY_PROFILE_DOC);
        const snapshot = await getDoc(docRef);
        if (cancelled) return;

        if (snapshot.exists()) {
          setFormData(normalizeCompanyProfile(snapshot.data()));
        }
      } catch (err) {
        console.error("Erro ao carregar perfil da empresa:", err);
        if (!cancelled) {
          setError(
            "Não foi possível carregar a configuração actual. Podes continuar a preencher e guardar."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFieldChange = (field) => (event) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleShow = (field) => (checked) => {
    setFormData((prev) => ({
      ...prev,
      show: { ...prev.show, [field]: checked },
    }));
  };

  const handleLogoChange = (url, storagePath) => {
    setFormData((prev) => ({
      ...prev,
      logoUrl: url,
      logoStoragePath: storagePath,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage("");

    if (!formData.name.trim()) {
      setError("O nome da empresa é obrigatório.");
      return;
    }

    setIsSaving(true);
    try {
      const docRef = doc(db, COMPANY_PROFILE_COLLECTION, COMPANY_PROFILE_DOC);
      await setDoc(
        docRef,
        {
          ...formData,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setSuccessMessage("Configuração gravada com sucesso.");
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      console.error("Erro ao gravar perfil da empresa:", err);
      setError(
        "Não foi possível gravar a configuração. Verifica a ligação e tenta de novo."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <Building2 className="h-6 w-6 text-green-400" />
          Papel Timbrado
        </h1>
        <p className="text-sm text-zinc-400">
          Configura os dados da tua empresa e o logo. Estes dados são usados no
          cabeçalho dos PDFs gerados pela plataforma (orçamentos, OS,
          comprovantes, dados de depósito).
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="border-green-500/50 bg-green-500/10 text-green-300">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-green-300">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo */}
        <Card className="border-zinc-700 bg-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Logo da empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <CompanyLogoUploader
              logoUrl={formData.logoUrl}
              logoStoragePath={formData.logoStoragePath}
              onLogoChange={handleLogoChange}
              disabled={isSaving}
            />
          </CardContent>
        </Card>

        {/* Identificação */}
        <Card className="border-zinc-700 bg-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Building2 className="h-5 w-5" />
              Identificação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-zinc-300">
                  Nome da empresa <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={handleFieldChange("name")}
                  placeholder="Ex.: Nonato Service"
                  autoComplete="organization"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nif" className="text-zinc-300">
                  NIF / Contribuinte
                </Label>
                <Input
                  id="nif"
                  value={formData.nif}
                  onChange={handleFieldChange("nif")}
                  placeholder="123456789"
                  inputMode="numeric"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Morada */}
        <Card className="border-zinc-700 bg-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <MapPin className="h-5 w-5" />
              Morada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="street" className="text-zinc-300">
                Rua e número
              </Label>
              <Input
                id="street"
                value={formData.street}
                onChange={handleFieldChange("street")}
                placeholder="Ex.: Rua das Mimosas, 303"
                autoComplete="street-address"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="postalCode" className="text-zinc-300">
                  Código postal
                </Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={handleFieldChange("postalCode")}
                  placeholder="4905-642"
                  autoComplete="postal-code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city" className="text-zinc-300">
                  Cidade
                </Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={handleFieldChange("city")}
                  placeholder="Viana do Castelo"
                  autoComplete="address-level2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="locality" className="text-zinc-300">
                  Freguesia
                </Label>
                <Input
                  id="locality"
                  value={formData.locality}
                  onChange={handleFieldChange("locality")}
                  placeholder="Vila de Punhe"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="country" className="text-zinc-300">
                País
              </Label>
              <Input
                id="country"
                value={formData.country}
                onChange={handleFieldChange("country")}
                placeholder="Portugal"
                autoComplete="country-name"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contactos */}
        <Card className="border-zinc-700 bg-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Phone className="h-5 w-5" />
              Contactos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-zinc-300">
                  Telefone
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={handleFieldChange("phone")}
                  placeholder="+351 91 111 5479"
                  autoComplete="tel"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleFieldChange("email")}
                  placeholder="geral@nonato.pt"
                  autoComplete="email"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dados Bancários */}
        <Card className="border-zinc-700 bg-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Landmark className="h-5 w-5" />
              Dados bancários
            </CardTitle>
            <p className="text-xs text-zinc-400">
              Usados no PDF de dados de depósito.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bankName" className="text-zinc-300">
                  Banco
                </Label>
                <Input
                  id="bankName"
                  value={formData.bankName}
                  onChange={handleFieldChange("bankName")}
                  placeholder="Ex.: Millennium BCP"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="swift" className="text-zinc-300">
                  SWIFT / BIC
                </Label>
                <Input
                  id="swift"
                  value={formData.swift}
                  onChange={handleFieldChange("swift")}
                  placeholder="BCOMPTPL"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="iban" className="text-zinc-300">
                  IBAN
                </Label>
                <Input
                  id="iban"
                  value={formData.iban}
                  onChange={handleFieldChange("iban")}
                  placeholder="PT50 0000 0000 0000 0000 0000 0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nib" className="text-zinc-300">
                  NIB
                </Label>
                <Input
                  id="nib"
                  value={formData.nib}
                  onChange={handleFieldChange("nib")}
                  placeholder="0000 0000 00000000000 00"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visibilidade dos campos nos PDFs */}
        <Card className="border-zinc-700 bg-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Eye className="h-5 w-5" />
              Visibilidade no cabeçalho dos PDFs
            </CardTitle>
            <p className="text-xs text-zinc-400">
              Controla que campos aparecem no cabeçalho dos documentos. Os
              dados continuam guardados; só deixam de ser apresentados.
            </p>
          </CardHeader>
          <CardContent className="space-y-1">
            {VISIBILITY_FIELDS.map((entry, idx) => (
              <div key={entry.key}>
                {idx > 0 && <Separator className="my-1 bg-zinc-700/50" />}
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2 text-sm text-zinc-200">
                    {formData.show[entry.key] ? (
                      <Eye className="h-4 w-4 text-green-400" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-zinc-500" />
                    )}
                    {entry.label}
                  </div>
                  <Switch
                    checked={formData.show[entry.key]}
                    onCheckedChange={handleToggleShow(entry.key)}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Botão de gravar */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A gravar...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Gravar configuração
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

const VISIBILITY_FIELDS = [
  { key: "logo", label: "Logo" },
  { key: "name", label: "Nome da empresa" },
  { key: "street", label: "Rua e número" },
  { key: "postalCode", label: "Código postal" },
  { key: "city", label: "Cidade" },
  { key: "locality", label: "Freguesia" },
  { key: "phone", label: "Telefone" },
  { key: "email", label: "Email" },
];

export default ManageCompanyProfile;
