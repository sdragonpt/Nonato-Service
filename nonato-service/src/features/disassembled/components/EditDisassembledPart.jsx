// src/features/disassembled/components/EditDisassembledPart.jsx
import { useState, useEffect, useMemo } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../../firebase.jsx";
import { comparePtPt } from "../../../utils/sortHelpers.js";
import { useClients } from "../../../context/ClientsContext.jsx";
import {
  Loader2,
  Save,
  PackageOpen,
  MapPin,
  Hash,
  Wrench,
  FileText,
  AlertTriangle,
  ClipboardEdit,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { ClientCombobox } from "@/components/shared/ClientCombobox.jsx";

import { ESTADO_META } from "../ManageDisassembledParts.jsx";
import { PageHeader, PageLoader } from "../../../components/app";

const emptyForm = {
  nome: "",
  quantidade: "1",
  localizacao: "",
  estado: "reutilizavel",
  origemClientId: "",
  origemClientName: "",
  origemEquipamento: "",
  notas: "",
};

const EditDisassembledPart = () => {
  const { partId } = useParams();
  const navigate = useNavigate();
  const { ensureClients } = useClients();

  const [formData, setFormData] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState({});
  const [clients, setClients] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [partSnap, clientsData] = await Promise.all([
          getDoc(doc(db, "pecasDesmontadas", partId)),
          ensureClients(),
        ]);

        setClients(clientsData);

        if (partSnap.exists()) {
          const data = partSnap.data();
          setFormData({
            nome: data.nome || "",
            quantidade: String(data.quantidade ?? "1"),
            localizacao: data.localizacao || "",
            estado: data.estado || "reutilizavel",
            origemClientId: data.origemClientId || "",
            origemClientName: data.origemClientName || "",
            origemEquipamento: data.origemEquipamento || "",
            notas: data.notas || "",
          });
        } else {
          setError("Peça não encontrada.");
        }
      } catch (err) {
        console.error("Erro ao carregar peça desmontada:", err);
        setError("Erro ao carregar dados da peça.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [partId]);

  const clientOptions = useMemo(
    () => clients.sort((a, b) => comparePtPt(a.name, b.name)),
    [clients]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleClientChange = (value) => {
    if (value === "none") {
      setFormData((prev) => ({ ...prev, origemClientId: "", origemClientName: "" }));
      return;
    }
    const client = clientOptions.find((c) => c.id === value);
    setFormData((prev) => ({
      ...prev,
      origemClientId: value,
      origemClientName: client?.name || "",
    }));
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched((prev) => ({ ...prev, nome: true }));

    if (!formData.nome.trim()) {
      setError("O campo Nome é obrigatório");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await updateDoc(doc(db, "pecasDesmontadas", partId), {
        ...formData,
        quantidade: parseInt(formData.quantidade, 10) || 1,
        updatedAt: new Date(),
      });

      navigate("/app/disassembled-parts");
    } catch (err) {
      console.error("Erro ao atualizar peça desmontada:", err);
      setError("Erro ao atualizar peça. Por favor, tente novamente.");
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
        title="Editar Peça Desmontada"
        description="Atualize os dados da peça"
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
            <CardTitle className="text-lg">Dados da Peça</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Nome da Peça</label>
              <div className="relative">
                <PackageOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  onBlur={() => handleBlur("nome")}
                  placeholder="Ex: Motor de Avanço, Placa Eletrónica..."
                  className={`pl-10 bg-muted/50 border-border text-foreground ${
                    touched.nome && !formData.nome ? "border-red-500" : ""
                  }`}
                />
              </div>
              {touched.nome && !formData.nome && (
                <p className="text-sm text-red-500">Nome é obrigatório</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Quantidade</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    type="number"
                    min="1"
                    name="quantidade"
                    value={formData.quantidade}
                    onChange={handleChange}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Localização (Prateleira)</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    type="text"
                    name="localizacao"
                    value={formData.localizacao}
                    onChange={handleChange}
                    placeholder="Ex: Prateleira B2, Armazém Central"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Estado</label>
              <Select
                value={formData.estado}
                onValueChange={(value) => handleSelectChange("estado", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ESTADO_META).map(([value, meta]) => (
                    <SelectItem key={value} value={value}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-foreground/90 flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-orange-400" />
                  Origem (opcional)
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-0">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Cliente</label>
                  <ClientCombobox
                    clients={clientOptions}
                    value={formData.origemClientId || "none"}
                    onValueChange={handleClientChange}
                    allowNone
                    noneLabel="Sem cliente associado"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Equipamento de Origem</label>
                  <Input
                    type="text"
                    name="origemEquipamento"
                    value={formData.origemEquipamento}
                    onChange={handleChange}
                    placeholder="Ex: CNC Modelo X, Nº série 12345"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Notas</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 text-muted-foreground h-4 w-4" />
                <Textarea
                  name="notas"
                  value={formData.notas}
                  onChange={handleChange}
                  placeholder="Observações adicionais sobre a peça..."
                  className="pl-10 min-h-[80px]"
                />
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

export default EditDisassembledPart;
