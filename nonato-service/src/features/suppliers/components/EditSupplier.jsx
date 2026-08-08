// src/features/suppliers/components/EditSupplier.jsx
import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../../firebase.jsx";
import {
  ArrowLeft,
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
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";

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
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Editar Fornecedor</h1>
          <p className="text-sm text-zinc-400">Atualize os dados do fornecedor</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-10 w-10 rounded-full border-zinc-700 text-white hover:bg-green-700 bg-green-600"
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
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">Dados do Fornecedor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Nome da Empresa</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
                <Input
                  type="text"
                  name="nomeEmpresa"
                  value={formData.nomeEmpresa}
                  onChange={handleChange}
                  onBlur={() => handleBlur("nomeEmpresa")}
                  className={`pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500 ${
                    touched.nomeEmpresa && !formData.nomeEmpresa ? "border-red-500" : ""
                  }`}
                />
              </div>
              {touched.nomeEmpresa && !formData.nomeEmpresa && (
                <p className="text-sm text-red-500">Nome da Empresa é obrigatório</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Pessoa de Contacto</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
                <Input
                  type="text"
                  name="contato"
                  value={formData.contato}
                  onChange={handleChange}
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
                  <Input
                    type="tel"
                    name="telefones"
                    value={formData.telefones}
                    onChange={handleChange}
                    className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Morada</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
                <Input
                  type="text"
                  name="morada"
                  value={formData.morada}
                  onChange={handleChange}
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Localidade</label>
                <Input
                  type="text"
                  name="localidade"
                  value={formData.localidade}
                  onChange={handleChange}
                  className="bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Código Postal</label>
                <Input
                  type="text"
                  name="codigoPostal"
                  value={formData.codigoPostal}
                  onChange={handleChange}
                  className="bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">País</label>
                <Input
                  type="text"
                  name="pais"
                  value={formData.pais}
                  onChange={handleChange}
                  className="bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">NIF</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
                  <Input
                    type="text"
                    name="numeroContribuicaoFiscal"
                    value={formData.numeroContribuicaoFiscal}
                    onChange={handleChange}
                    className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">IBAN</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
                  <Input
                    type="text"
                    name="iban"
                    value={formData.iban}
                    onChange={handleChange}
                    className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
      </form>
    </div>
  );
};

export default EditSupplier;
