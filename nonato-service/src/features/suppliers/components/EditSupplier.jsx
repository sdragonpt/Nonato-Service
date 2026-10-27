// src/features/suppliers/components/EditSupplier.jsx
import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../../firebase.jsx";
import {
  Loader2,
  Save,
  Building2,
  MapPin,
  Phone,
  Mail,
  FileText,
  User,
  CreditCard,
  AlertTriangle,
  ClipboardEdit,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import { PageHeader, PageLoader } from "../../../components/app";

const emptyForm = {
  nomeEmpresa: "",
  morada: "",
  localidade: "",
  codigoPostal: "",
  pais: "",
  numeroContribuicaoFiscal: "",
  telefones: "",
  email: "",
  contato: "",
  iban: "",
};

const EditSupplier = () => {
  const { supplierId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState({});

  useEffect(() => {
    const fetchSupplier = async () => {
      try {
        setIsLoading(true);
        const supplierDoc = doc(db, "fornecedores", supplierId);
        const snapshot = await getDoc(supplierDoc);

        if (!snapshot.exists()) {
          setError("Fornecedor não encontrado");
          return;
        }

        const data = snapshot.data();
        setFormData({
          nomeEmpresa: data.nomeEmpresa || "",
          morada: data.morada || "",
          localidade: data.localidade || "",
          codigoPostal: data.codigoPostal || "",
          pais: data.pais || "",
          numeroContribuicaoFiscal: data.numeroContribuicaoFiscal || "",
          telefones: data.telefones || "",
          email: data.email || "",
          contato: data.contato || "",
          iban: data.iban || "",
        });
        setError(null);
      } catch (err) {
        console.error("Erro ao carregar fornecedor:", err);
        setError("Erro ao carregar dados do fornecedor");
      } finally {
        setIsLoading(false);
      }
    };

    if (supplierId) fetchSupplier();
  }, [supplierId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched((prev) => ({ ...prev, nomeEmpresa: true }));

    if (!formData.nomeEmpresa.trim()) {
      setError("O campo Nome da Empresa é obrigatório");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await updateDoc(doc(db, "fornecedores", supplierId), {
        ...formData,
        lastUpdate: new Date(),
      });

      navigate(`/app/supplier/${supplierId}`);
    } catch (err) {
      console.error("Erro ao atualizar fornecedor:", err);
      setError("Erro ao atualizar fornecedor. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <PageLoader />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar Fornecedor"
        description="Atualize os dados do fornecedor"
        icon={ClipboardEdit}
        back
      />

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados do Fornecedor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Nome da Empresa</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  name="nomeEmpresa"
                  value={formData.nomeEmpresa}
                  onChange={handleChange}
                  onBlur={() => handleBlur("nomeEmpresa")}
                  className={`pl-10 bg-muted/50 border-border text-foreground ${
                    touched.nomeEmpresa && !formData.nomeEmpresa ? "border-red-500" : ""
                  }`}
                />
              </div>
              {touched.nomeEmpresa && !formData.nomeEmpresa && (
                <p className="text-sm text-red-500">Nome da Empresa é obrigatório</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Pessoa de Contacto</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  name="contato"
                  value={formData.contato}
                  onChange={handleChange}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    type="tel"
                    name="telefones"
                    value={formData.telefones}
                    onChange={handleChange}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Morada</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  name="morada"
                  value={formData.morada}
                  onChange={handleChange}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Localidade</label>
                <Input
                  type="text"
                  name="localidade"
                  value={formData.localidade}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Código Postal</label>
                <Input
                  type="text"
                  name="codigoPostal"
                  value={formData.codigoPostal}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">País</label>
                <Input
                  type="text"
                  name="pais"
                  value={formData.pais}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">NIF</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    type="text"
                    name="numeroContribuicaoFiscal"
                    value={formData.numeroContribuicaoFiscal}
                    onChange={handleChange}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">IBAN</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    type="text"
                    name="iban"
                    value={formData.iban}
                    onChange={handleChange}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
      </form>
    </div>
  );
};

export default EditSupplier;
