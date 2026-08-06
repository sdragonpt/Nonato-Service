// src/features/company/CompanyProfile.jsx
// "Cadastro da Nonato Service" — ficha da própria empresa (dados bancários,
// morada, contacto, logo). Usada para gerar documentos/pedidos de pagamento
// enviados a clientes. Guardada como documento único no Firestore.

import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { useAuth } from "../../hooks/useAuth";
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
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";

const COMPANY_DOC_REF = ["config", "companyProfile"];

const emptyForm = {
  nomeEmpresa: "Nonato Service",
  nif: "",
  nib: "",
  iban: "",
  swift: "",
  nomeBanco: "",
  telefone: "",
  email: "",
  morada: "",
  logo: "",
};

function Field({ label, icon: Icon, children }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-400">{label}</label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
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

  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const snapshot = await getDoc(doc(db, ...COMPANY_DOC_REF));
      if (snapshot.exists()) {
        setFormData({ ...emptyForm, ...snapshot.data() });
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

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("O logo deve ter menos de 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, logo: reader.result }));
      setError(null);
    };
    reader.readAsDataURL(file);
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
      await setDoc(doc(db, ...COMPANY_DOC_REF), {
        ...formData,
        lastUpdate: new Date(),
      });
      setSuccess(true);
    } catch (err) {
      console.error("Erro ao guardar dados da empresa:", err);
      setError("Erro ao guardar. Por favor, tente novamente.");
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="h-8 w-8 text-green-500" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Cadastro da Nonato Service</h1>
          <p className="text-sm text-zinc-400">
            Dados bancários e de contacto usados nos documentos enviados a clientes
          </p>
        </div>
      </div>

      {!isAdmin && (
        <Alert className="border-blue-500/30 bg-blue-500/10">
          <AlertTriangle className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-blue-300">
            Estás em modo de visualização. Apenas administradores podem editar estes dados.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">Logo</CardTitle>
          </CardHeader>
          <CardContent>
            {formData.logo ? (
              <div className="relative w-32 h-32">
                <img
                  src={formData.logo}
                  alt="Logo da Nonato Service"
                  className="w-full h-full rounded-lg object-contain bg-zinc-900 border border-zinc-700"
                />
                {isAdmin && (
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={() => setFormData((prev) => ({ ...prev, logo: "" }))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ) : isAdmin ? (
              <label className="flex flex-col items-center justify-center w-32 h-32 bg-zinc-900 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-700/50 transition-colors">
                <Camera className="h-6 w-6 text-zinc-400 mb-2" />
                <span className="text-xs text-zinc-400 text-center px-2">
                  Carregar logo
                </span>
                <input type="file" className="hidden" onChange={handleLogoChange} accept="image/*" />
              </label>
            ) : (
              <p className="text-sm text-zinc-500">Sem logo definido.</p>
            )}
          </CardContent>
        </Card>

        {/* Dados gerais */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">Dados Gerais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Nome da Empresa" icon={Building2}>
              <Input
                type="text"
                name="nomeEmpresa"
                value={formData.nomeEmpresa}
                onChange={handleChange}
                disabled={!isAdmin}
                className="pl-10 bg-zinc-900 border-zinc-700 text-white disabled:opacity-70"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Telefone" icon={Phone}>
                <Input
                  type="tel"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  disabled={!isAdmin}
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white disabled:opacity-70"
                />
              </Field>
              <Field label="Email" icon={Mail}>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={!isAdmin}
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white disabled:opacity-70"
                />
              </Field>
            </div>

            <Field label="Morada" icon={MapPin}>
              <Input
                type="text"
                name="morada"
                value={formData.morada}
                onChange={handleChange}
                disabled={!isAdmin}
                className="pl-10 bg-zinc-900 border-zinc-700 text-white disabled:opacity-70"
              />
            </Field>

            <Field label="NIF" icon={Building2}>
              <Input
                type="text"
                name="nif"
                value={formData.nif}
                onChange={handleChange}
                disabled={!isAdmin}
                className="pl-10 bg-zinc-900 border-zinc-700 text-white disabled:opacity-70"
              />
            </Field>
          </CardContent>
        </Card>

        {/* Dados bancários */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Landmark className="h-5 w-5 text-green-500" />
              Dados Bancários
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-zinc-500">
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
                <label className="text-sm font-medium text-zinc-400">{label}</label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    name={name}
                    value={formData[name]}
                    onChange={handleChange}
                    disabled={!isAdmin}
                    className="bg-zinc-900 border-zinc-700 text-white disabled:opacity-70 font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy(name, formData[name])}
                    className="border-zinc-700 text-white hover:bg-zinc-700 shrink-0"
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
            className="w-full bg-green-600 hover:bg-green-700"
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
