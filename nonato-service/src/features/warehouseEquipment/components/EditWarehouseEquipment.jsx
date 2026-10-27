// src/features/warehouseEquipment/components/EditWarehouseEquipment.jsx
import { useState, useEffect, useMemo } from "react";
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../../firebase.jsx";
import { comparePtPt } from "../../../utils/sortHelpers.js";
import {
  Loader2,
  Save,
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
  Barcode,
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

import { ESTADO_META } from "../ManageWarehouseEquipment.jsx";
import { PageHeader } from "../../../components/app";

const emptyForm = {
  nome: "",
  equipmentCode: "",
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

const EditWarehouseEquipment = () => {
  const { equipmentId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
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
        .sort((a, b) => comparePtPt(a.name, b.name)),
    [families]
  );
  const groupOptions = useMemo(
    () =>
      families
        .filter((f) => f.parentId === formData.familyId)
        .sort((a, b) => comparePtPt(a.name, b.name)),
    [families, formData.familyId]
  );

  useEffect(() => {
    const fetchItem = async () => {
      try {
        setIsLoading(true);
        const itemDoc = doc(db, "equipamentosArmazem", equipmentId);
        const snapshot = await getDoc(itemDoc);

        if (!snapshot.exists()) {
          setError("Equipamento não encontrado");
          return;
        }

        const data = snapshot.data();
        setFormData({
          ...emptyForm,
          ...data,
          valorAquisicao:
            data.valorAquisicao !== undefined && data.valorAquisicao !== null
              ? String(data.valorAquisicao)
              : "",
        });
      } catch (err) {
        console.error("Erro ao carregar equipamento:", err);
        setError("Erro ao carregar equipamento. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    if (equipmentId) fetchItem();
  }, [equipmentId]);

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
      setError("O campo Nome / Designação é obrigatório");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const family = familyOptions.find((f) => f.id === formData.familyId);
      const group = groupOptions.find((g) => g.id === formData.groupId);

      await updateDoc(doc(db, "equipamentosArmazem", equipmentId), {
        ...formData,
        valorAquisicao: parseFloat(formData.valorAquisicao) || 0,
        familyName: family?.name || "",
        groupName: group?.name || "",
        updatedAt: new Date(),
      });

      navigate("/app/warehouse-equipment");
    } catch (err) {
      console.error("Erro ao atualizar equipamento:", err);
      setError("Erro ao atualizar equipamento. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar Equipamento"
        description="Atualize os dados do equipamento"
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
            <CardTitle className="text-lg">Dados do Equipamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Nome / Designação</label>
              <div className="relative">
                <Wrench className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  onBlur={() => handleBlur("nome")}
                  placeholder="Ex: Compressor de Ar Industrial"
                  className={`pl-10 bg-muted/50 border-border text-foreground ${
                    touched.nome && !formData.nome ? "border-red-500" : ""
                  }`}
                />
              </div>
              {touched.nome && !formData.nome && (
                <p className="text-sm text-red-500">Nome / Designação é obrigatório</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                ID do Equipamento
              </label>
              <div className="relative">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  name="equipmentCode"
                  value={formData.equipmentCode}
                  onChange={handleChange}
                  placeholder="Ex: 008323 (o número que o cliente atribui/escreve na etiqueta)"
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Este ID identifica a máquina toda. Cada volume/peça (a máquina
                em si + os itens inclusos) gera uma etiqueta com este ID mais
                um sufixo — ex: {formData.equipmentCode || "008323"}-01,{" "}
                {formData.equipmentCode || "008323"}-02. Define-se depois em
                &ldquo;Itens Inclusos&rdquo;, na página de detalhe.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Categoria</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    type="text"
                    name="categoria"
                    value={formData.categoria}
                    onChange={handleChange}
                    placeholder="Ex: Ferramentas, Máquinas, Veículos"
                    className="pl-10"
                  />
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
            </div>

            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-foreground/90 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-orange-400" />
                  Família / Grupo (opcional)
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-0">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Família</label>
                  <Select
                    value={formData.familyId || "none"}
                    onValueChange={(value) =>
                      handleSelectChange("familyId", value === "none" ? "" : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sem família" />
                    </SelectTrigger>
                    <SelectContent>
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
                  <label className="text-sm font-medium text-muted-foreground">Grupo</label>
                  <Select
                    value={formData.groupId || "none"}
                    onValueChange={(value) =>
                      handleSelectChange("groupId", value === "none" ? "" : value)
                    }
                    disabled={!formData.familyId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sem grupo" />
                    </SelectTrigger>
                    <SelectContent>
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
                <label className="text-sm font-medium text-muted-foreground">Marca</label>
                <Input
                  type="text"
                  name="marca"
                  value={formData.marca}
                  onChange={handleChange}
                  placeholder="Ex: Bosch"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Modelo</label>
                <Input
                  type="text"
                  name="modelo"
                  value={formData.modelo}
                  onChange={handleChange}
                  placeholder="Ex: GSB 21-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Nº de Série</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    type="text"
                    name="numeroSerie"
                    value={formData.numeroSerie}
                    onChange={handleChange}
                    placeholder="Ex: SN-2024-001"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Localização</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    type="text"
                    name="localizacao"
                    value={formData.localizacao}
                    onChange={handleChange}
                    placeholder="Ex: Prateleira A3, Armazém Central"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Data de Aquisição</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    type="date"
                    name="dataAquisicao"
                    value={formData.dataAquisicao}
                    onChange={handleChange}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Valor de Aquisição</label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    type="number"
                    step="0.01"
                    name="valorAquisicao"
                    value={formData.valorAquisicao}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Responsável</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    type="text"
                    name="responsavel"
                    value={formData.responsavel}
                    onChange={handleChange}
                    placeholder="Ex: João Nonato"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Notas</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 text-muted-foreground h-4 w-4" />
                <Textarea
                  name="notas"
                  value={formData.notas}
                  onChange={handleChange}
                  placeholder="Observações adicionais sobre o equipamento..."
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

export default EditWarehouseEquipment;
