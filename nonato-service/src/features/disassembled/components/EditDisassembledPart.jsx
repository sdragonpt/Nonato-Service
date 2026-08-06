// src/features/disassembled/components/EditDisassembledPart.jsx
import { useState, useEffect, useMemo } from "react";
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../../firebase.jsx";
import {
  ArrowLeft,
  Loader2,
  Save,
  PackageOpen,
  MapPin,
  Hash,
  User,
  Wrench,
  FileText,
  AlertTriangle,
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

import { ESTADO_META } from "../ManageDisassembledParts.jsx";

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
        const [partSnap, clientsSnap] = await Promise.all([
          getDoc(doc(db, "pecasDesmontadas", partId)),
          getDocs(collection(db, "clientes")),
        ]);

        setClients(clientsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

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
    () => clients.sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-PT")),
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
      origemClientName: client?.nome || "",
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
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Editar Peça Desmontada</h1>
          <p className="text-sm text-zinc-400">Atualize os dados da peça</p>
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
            <CardTitle className="text-lg text-white">Dados da Peça</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Nome da Peça</label>
              <div className="relative">
                <PackageOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
                <Input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  onBlur={() => handleBlur("nome")}
                  placeholder="Ex: Motor de Avanço, Placa Eletrónica..."
                  className={`pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500 ${
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
                <label className="text-sm font-medium text-zinc-400">Quantidade</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
                  <Input
                    type="number"
                    min="1"
                    name="quantidade"
                    value={formData.quantidade}
                    onChange={handleChange}
                    className="pl-10 bg-zinc-900 border-zinc-700 text-white"
                  />
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium text-zinc-400">Localização (Prateleira)</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
                  <Input
                    type="text"
                    name="localizacao"
                    value={formData.localizacao}
                    onChange={handleChange}
                    placeholder="Ex: Prateleira B2, Armazém Central"
                    className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Estado</label>
              <Select
                value={formData.estado}
                onValueChange={(value) => handleSelectChange("estado", value)}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                  {Object.entries(ESTADO_META).map(([value, meta]) => (
                    <SelectItem key={value} value={value}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Card className="bg-zinc-900 border-zinc-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-orange-400" />
                  Origem (opcional)
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-0">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">Cliente</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4 z-10" />
                    <Select
                      value={formData.origemClientId || "none"}
                      onValueChange={handleClientChange}
                    >
                      <SelectTrigger className="pl-10 bg-zinc-800 border-zinc-700 text-white">
                        <SelectValue placeholder="Sem cliente associado" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                        <SelectItem value="none">Sem cliente associado</SelectItem>
                        {clientOptions.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">Equipamento de Origem</label>
                  <Input
                    type="text"
                    name="origemEquipamento"
                    value={formData.origemEquipamento}
                    onChange={handleChange}
                    placeholder="Ex: CNC Modelo X, Nº série 12345"
                    className="bg-zinc-800 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Notas</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 text-zinc-400 h-4 w-4" />
                <Textarea
                  name="notas"
                  value={formData.notas}
                  onChange={handleChange}
                  placeholder="Observações adicionais sobre a peça..."
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500 min-h-[80px]"
                />
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

export default EditDisassembledPart;
