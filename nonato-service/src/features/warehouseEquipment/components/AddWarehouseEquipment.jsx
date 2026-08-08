// src/features/warehouseEquipment/components/AddWarehouseEquipment.jsx
import { useState, useEffect, useMemo } from "react";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "../../../firebase.jsx";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Wrench,
  MapPin,
  Hash,
  Tag,
  User,
  Calendar,
  Euro,
  AlertTriangle,
  FileText,
  Layers,
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

import { ESTADO_META } from "../ManageWarehouseEquipment.jsx";

const emptyForm = {
  nome: "",
  categoria: "",
  marca: "",
  modelo: "",
  numeroSerie: "",
  localizacao: "",
  estado: "operacional",
  dataAquisicao: "",
  valorAquisicao: "",
  responsavel: "",
  notas: "",
  familyId: "",
  groupId: "",
};

const AddWarehouseEquipment = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState({});
  const [families, setFamilies] = useState([]);

  useEffect(() => {
    const fetchFamilies = async () => {
      try {
        const snap = await getDocs(collection(db, "familiasEquipamentos"));
        setFamilies(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Erro ao carregar famílias de equipamentos:", err);
      }
    };
    fetchFamilies();
  }, []);

  const familyOptions = useMemo(
    () =>
      families
        .filter((f) => !f.parentId)
        .sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-PT")),
    [families]
  );
  const groupOptions = useMemo(
    () =>
      families
        .filter((f) => f.parentId === formData.familyId)
        .sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-PT")),
    [families, formData.familyId]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    if (name === "familyId") {
      setFormData((prev) => ({ ...prev, familyId: value, groupId: "" }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched((prev) => ({ ...prev, nome: true }));

    if (!formData.nome.trim()) {
      setError("O campo Nome/Designação é obrigatório");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const family = familyOptions.find((f) => f.id === formData.familyId);
      const group = groupOptions.find((g) => g.id === formData.groupId);

      await addDoc(collection(db, "equipamentosArmazem"), {
        ...formData,
        valorAquisicao: parseFloat(formData.valorAquisicao) || 0,
        familyName: family?.name || "",
        groupName: group?.name || "",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      navigate("/app/warehouse-equipment");
    } catch (err) {
      console.error("Erro ao adicionar equipamento:", err);
      setError("Erro ao adicionar equipamento. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Novo Equipamento do Armazém</h1>
          <p className="text-sm text-zinc-400">
            Adicione um equipamento ao inventário próprio da Nonato Service
          </p>
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
            <CardTitle className="text-lg text-white">Dados do Equipamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Nome / Designação</label>
              <div className="relative">
                <Wrench className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
                <Input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  onBlur={() => handleBlur("nome")}
                  placeholder="Ex: Compressor de Ar Industrial"
                  className={`pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500 ${
                    touched.nome && !formData.nome ? "border-red-500" : ""
                  }`}
                />
              </div>
              {touched.nome && !formData.nome && (
                <p className="text-sm text-red-500">Nome / Designação é obrigatório</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Categoria</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
                  <Input
                    type="text"
                    name="categoria"
                    value={formData.categoria}
                    onChange={handleChange}
                    placeholder="Ex: Ferramentas, Máquinas, Veículos"
                    className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                  />
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
            </div>

            <Card className="bg-zinc-900 border-zinc-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-orange-400" />
                  Família / Grupo (opcional)
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-0">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">Família</label>
                  <Select
                    value={formData.familyId || "none"}
                    onValueChange={(value) =>
                      handleSelectChange("familyId", value === "none" ? "" : value)
                    }
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Sem família" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectItem value="none">Sem família</SelectItem>
                      {familyOptions.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">Grupo</label>
                  <Select
                    value={formData.groupId || "none"}
                    onValueChange={(value) =>
                      handleSelectChange("groupId", value === "none" ? "" : value)
                    }
                    disabled={!formData.familyId}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Sem grupo" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectItem value="none">Sem grupo</SelectItem>
                      {groupOptions.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Marca</label>
                <Input
                  type="text"
                  name="marca"
                  value={formData.marca}
                  onChange={handleChange}
                  placeholder="Ex: Bosch"
                  className="bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Modelo</label>
                <Input
                  type="text"
                  name="modelo"
                  value={formData.modelo}
                  onChange={handleChange}
                  placeholder="Ex: GSB 21-2"
                  className="bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Nº de Série</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
                  <Input
                    type="text"
                    name="numeroSerie"
                    value={formData.numeroSerie}
                    onChange={handleChange}
                    placeholder="Ex: SN-2024-001"
                    className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Localização</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
                  <Input
                    type="text"
                    name="localizacao"
                    value={formData.localizacao}
                    onChange={handleChange}
                    placeholder="Ex: Prateleira A3, Armazém Central"
                    className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Data de Aquisição</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
                  <Input
                    type="date"
                    name="dataAquisicao"
                    value={formData.dataAquisicao}
                    onChange={handleChange}
                    className="pl-10 bg-zinc-900 border-zinc-700 text-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Valor de Aquisição</label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
                  <Input
                    type="number"
                    step="0.01"
                    name="valorAquisicao"
                    value={formData.valorAquisicao}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Responsável</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
                  <Input
                    type="text"
                    name="responsavel"
                    value={formData.responsavel}
                    onChange={handleChange}
                    placeholder="Ex: João Nonato"
                    className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Notas</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 text-zinc-400 h-4 w-4" />
                <Textarea
                  name="notas"
                  value={formData.notas}
                  onChange={handleChange}
                  placeholder="Observações adicionais sobre o equipamento..."
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
              A adicionar...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Equipamento
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default AddWarehouseEquipment;
