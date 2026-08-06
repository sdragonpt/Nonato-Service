// src/features/prepOrders/components/AddOrdemPreparacao.jsx
// Ordem de Preparação — formulário técnico pré-instalação, com o Código
// SME_UP a fazer lookup automático no Cadastro de Equipamentos (id ou nº de
// série) para pré-preencher descrição/modelo/marca.
import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "../../../firebase.jsx";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Save,
  CheckCircle2,
  AlertTriangle,
  Search,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Checkbox } from "@/components/ui/checkbox.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";

import { isStaffRole } from "../../../config/roles.js";

const MATERIAL_TRABALHADO_OPTIONS = ["Aglomerado", "MDF", "Plástico", "Fenólico", "Alumínio"];
const TIPOLOGIA_FOLHEADO_OPTIONS = ["Ausente", "Brilhante", "Fosco", "Texturizado", "Corian"];
const COR_OPTIONS = ["Preto Fosco", "Preto Brilhante", "Branco Fosco", "Branco Brilhante"];
const TIPOLOGIA_BORDA_OPTIONS = [
  "ABS",
  "PVC",
  "Madeira Real",
  "Alumínio",
  "Laminado",
  "CPL",
  "Melamínico",
  "Poliéster Lustroso",
  "Fitas Madeira Maciça",
];
const ESPESSURA_BORDA_OPTIONS = ["0,3mm", "0,4mm", "0,8mm", "1mm", "2mm", "3mm"];
const TIPO_COLA_OPTIONS = ["PUR", "EVA"];
const GRADES_PROTECAO_OPTIONS = ["Lado Esquerdo", "Lado Direito", "Traseira", "Adicionada"];

const emptyForm = {
  codigoSmeUp: "",
  descricao: "",
  modelo: "",
  marca: "",
  clientId: "",
  modalidadeVenda: "",
  pais: "",
  instalacao: "",
  tecnicoResponsavelId: "",
  testRun: false,

  materialTrabalhado: [],
  materialTrabalhadoOutro: "",
  tipologiaFolheado: "",
  tipologiaFolheadoOutro: "",
  cor: "",
  corOutro: "",
  dimensoesMax: "",
  dimensoesMin: "",
  dimensoesOutro: "",
  tipologiaBorda: [],
  tipologiaBordaOutro: "",
  espessuraBorda: [],
  espessuraBordaOutro: "",
  tipoCola: [],
  tipoColaOutro: "",
  gradesProtecao: [],

  ferramentasFornecidoCliente: false,
  ferramentasAntesTestRun: false,
  ferramentasCargoFerwood: false,
  tapeteEvacuacao: false,
  ferramentasQuais: "",
  ventosas: "",

  materialTestRunFornecidoCliente: false,
  materialTestRunArmazemFW: false,
  materialTestRunQuaisQtd: "",

  linguaDestino: "",
  manuais: "",
  adesivos: "",

  notasProducao: "",
  impressoes: "",
};

// Grupo de checkboxes reutilizável (multi-select) com campo "Outro" opcional.
const CheckboxGroup = ({ options, selected, onToggle }) => (
  <div className="flex flex-wrap gap-x-6 gap-y-2">
    {options.map((opt) => (
      <label key={opt} className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
        <Checkbox checked={selected.includes(opt)} onCheckedChange={() => onToggle(opt)} />
        {opt}
      </label>
    ))}
  </div>
);

// Grupo de seleção única (visual tipo "radio") usando botões.
const SingleSelectGroup = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((opt) => (
      <button
        key={opt}
        type="button"
        onClick={() => onChange(value === opt ? "" : opt)}
        className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
          value === opt
            ? "bg-green-600 border-green-600 text-white"
            : "bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
        }`}
      >
        {opt}
      </button>
    ))}
  </div>
);

const AddOrdemPreparacao = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState({});

  const [clients, setClients] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [matchedEquipment, setMatchedEquipment] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsSnap, usersSnap, equipmentsSnap] = await Promise.all([
          getDocs(collection(db, "clientes")),
          getDocs(collection(db, "users")),
          getDocs(collection(db, "equipamentos")),
        ]);
        setClients(clientsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setStaffUsers(
          usersSnap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((u) => isStaffRole(u.role))
        );
        setEquipments(equipmentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      }
    };
    fetchData();
  }, []);

  // Lookup automático do Código SME_UP no Cadastro de Equipamentos (id ou nº série)
  useEffect(() => {
    const term = formData.codigoSmeUp.trim().toLowerCase();
    if (!term) {
      setMatchedEquipment(null);
      return;
    }
    const found = equipments.find(
      (eq) =>
        eq.id.toLowerCase() === term ||
        (eq.serialNumber || "").toLowerCase() === term
    );
    setMatchedEquipment(found || null);
    if (found) {
      setFormData((prev) => ({
        ...prev,
        descricao: found.type || prev.descricao,
        modelo: found.model || prev.modelo,
        marca: found.brand || prev.marca,
        clientId: found.clientId || prev.clientId,
      }));
    }
  }, [formData.codigoSmeUp, equipments]);

  const clientOptions = useMemo(
    () => clients.slice().sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-PT")),
    [clients]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value === "none" ? "" : value }));
  };

  const toggleMulti = (field, option) => {
    setFormData((prev) => {
      const current = prev[field];
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      return { ...prev, [field]: next };
    });
  };

  const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));

  const persistOrder = async (status) => {
    const client = clients.find((c) => c.id === formData.clientId);
    const tecnico = staffUsers.find((u) => u.id === formData.tecnicoResponsavelId);

    const docRef = await addDoc(collection(db, "ordensPreparacao"), {
      ...formData,
      clientName: client?.name || "",
      tecnicoResponsavelNome: tecnico?.displayName || "",
      equipmentId: matchedEquipment?.id || "",
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return docRef.id;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched((prev) => ({ ...prev, codigoSmeUp: true }));

    if (!formData.codigoSmeUp.trim()) {
      setError("O campo Código SME_UP é obrigatório.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const id = await persistOrder("rascunho");
      navigate(`/app/ordem-preparacao/${id}`);
    } catch (err) {
      console.error("Erro ao guardar ordem de preparação:", err);
      setError("Erro ao guardar. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Nova Ordem de Preparação</h1>
          <p className="text-sm text-zinc-400">
            Formulário técnico de preparação pré-instalação
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
        {/* Dados Gerais */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">Dados Gerais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Código SME_UP (ID ou Nº Série)</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
                <Input
                  name="codigoSmeUp"
                  value={formData.codigoSmeUp}
                  onChange={handleChange}
                  onBlur={() => handleBlur("codigoSmeUp")}
                  placeholder="Ex: 1042 ou nº de série do equipamento"
                  className={`pl-10 pr-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500 ${
                    touched.codigoSmeUp && !formData.codigoSmeUp ? "border-red-500" : ""
                  }`}
                />
                {matchedEquipment && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 h-4 w-4" />
                )}
              </div>
              {touched.codigoSmeUp && !formData.codigoSmeUp && (
                <p className="text-sm text-red-500">Código SME_UP é obrigatório</p>
              )}
              {matchedEquipment && (
                <p className="text-xs text-green-400">
                  Equipamento encontrado — descrição/modelo/marca preenchidos automaticamente.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Descrição</label>
                <Input
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleChange}
                  className="bg-zinc-900 border-zinc-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Modelo</label>
                <Input
                  name="modelo"
                  value={formData.modelo}
                  onChange={handleChange}
                  className="bg-zinc-900 border-zinc-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Marca</label>
                <Input
                  name="marca"
                  value={formData.marca}
                  onChange={handleChange}
                  className="bg-zinc-900 border-zinc-700 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Cliente</label>
                <Select
                  value={formData.clientId || "none"}
                  onValueChange={(v) => handleSelectChange("clientId", v)}
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectItem value="none">Sem cliente</SelectItem>
                    {clientOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Técnico Responsável</label>
                <Select
                  value={formData.tecnicoResponsavelId || "none"}
                  onValueChange={(v) => handleSelectChange("tecnicoResponsavelId", v)}
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                    <SelectValue placeholder="Selecione o técnico" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectItem value="none">Sem técnico</SelectItem>
                    {staffUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.displayName || "Sem nome"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Modalidade de Venda</label>
                <Input
                  name="modalidadeVenda"
                  value={formData.modalidadeVenda}
                  onChange={handleChange}
                  className="bg-zinc-900 border-zinc-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">País</label>
                <Input
                  name="pais"
                  value={formData.pais}
                  onChange={handleChange}
                  className="bg-zinc-900 border-zinc-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Instalação</label>
                <Input
                  name="instalacao"
                  value={formData.instalacao}
                  onChange={handleChange}
                  className="bg-zinc-900 border-zinc-700 text-white"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <Checkbox
                checked={formData.testRun}
                onCheckedChange={(v) => setFormData((p) => ({ ...p, testRun: !!v }))}
              />
              Test Run
            </label>
          </CardContent>
        </Card>

        {/* 1. Material Trabalhado */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-base text-white">Material Trabalhado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CheckboxGroup
              options={MATERIAL_TRABALHADO_OPTIONS}
              selected={formData.materialTrabalhado}
              onToggle={(opt) => toggleMulti("materialTrabalhado", opt)}
            />
            <Input
              name="materialTrabalhadoOutro"
              value={formData.materialTrabalhadoOutro}
              onChange={handleChange}
              placeholder="Outro (especifique)"
              className="bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500 max-w-sm"
            />
          </CardContent>
        </Card>

        {/* 2. Tipologia Folheado */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-base text-white">Tipologia Folheado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SingleSelectGroup
              options={TIPOLOGIA_FOLHEADO_OPTIONS}
              value={formData.tipologiaFolheado}
              onChange={(v) => setFormData((p) => ({ ...p, tipologiaFolheado: v }))}
            />
            <Input
              name="tipologiaFolheadoOutro"
              value={formData.tipologiaFolheadoOutro}
              onChange={handleChange}
              placeholder="Outro (especifique)"
              className="bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500 max-w-sm"
            />
          </CardContent>
        </Card>

        {/* 3. Cor */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-base text-white">Cor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SingleSelectGroup
              options={COR_OPTIONS}
              value={formData.cor}
              onChange={(v) => setFormData((p) => ({ ...p, cor: v }))}
            />
            <Input
              name="corOutro"
              value={formData.corOutro}
              onChange={handleChange}
              placeholder="Outro (especifique)"
              className="bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500 max-w-sm"
            />
          </CardContent>
        </Card>

        {/* 4. Dimensões */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-base text-white">Dimensões</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Máx (X/Y/Z)</label>
              <Input
                name="dimensoesMax"
                value={formData.dimensoesMax}
                onChange={handleChange}
                placeholder="Ex: 2800/1300/60"
                className="bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Mín (X/Y/Z)</label>
              <Input
                name="dimensoesMin"
                value={formData.dimensoesMin}
                onChange={handleChange}
                placeholder="Ex: 200/100/8"
                className="bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Outro</label>
              <Input
                name="dimensoesOutro"
                value={formData.dimensoesOutro}
                onChange={handleChange}
                className="bg-zinc-900 border-zinc-700 text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* 5. Tipologia de Borda */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-base text-white">Tipologia de Borda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CheckboxGroup
              options={TIPOLOGIA_BORDA_OPTIONS}
              selected={formData.tipologiaBorda}
              onToggle={(opt) => toggleMulti("tipologiaBorda", opt)}
            />
            <Input
              name="tipologiaBordaOutro"
              value={formData.tipologiaBordaOutro}
              onChange={handleChange}
              placeholder="Outro (especifique)"
              className="bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500 max-w-sm"
            />
          </CardContent>
        </Card>

        {/* 6. Espessura Borda */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-base text-white">Espessura Borda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CheckboxGroup
              options={ESPESSURA_BORDA_OPTIONS}
              selected={formData.espessuraBorda}
              onToggle={(opt) => toggleMulti("espessuraBorda", opt)}
            />
            <Input
              name="espessuraBordaOutro"
              value={formData.espessuraBordaOutro}
              onChange={handleChange}
              placeholder="Outro (especifique)"
              className="bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500 max-w-sm"
            />
          </CardContent>
        </Card>

        {/* 7. Tipo de Cola */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-base text-white">Tipo de Cola</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CheckboxGroup
              options={TIPO_COLA_OPTIONS}
              selected={formData.tipoCola}
              onToggle={(opt) => toggleMulti("tipoCola", opt)}
            />
            <Input
              name="tipoColaOutro"
              value={formData.tipoColaOutro}
              onChange={handleChange}
              placeholder="Outro (especifique)"
              className="bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500 max-w-sm"
            />
          </CardContent>
        </Card>

        {/* 9. Grades de Proteção */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-base text-white">Grades de Proteção</CardTitle>
          </CardHeader>
          <CardContent>
            <CheckboxGroup
              options={GRADES_PROTECAO_OPTIONS}
              selected={formData.gradesProtecao}
              onToggle={(opt) => toggleMulti("gradesProtecao", opt)}
            />
          </CardContent>
        </Card>

        {/* 10. Ferramentas */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-base text-white">Ferramentas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <Checkbox
                  checked={formData.ferramentasFornecidoCliente}
                  onCheckedChange={(v) =>
                    setFormData((p) => ({ ...p, ferramentasFornecidoCliente: !!v }))
                  }
                />
                Fornecido pelo Cliente
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <Checkbox
                  checked={formData.ferramentasAntesTestRun}
                  onCheckedChange={(v) =>
                    setFormData((p) => ({ ...p, ferramentasAntesTestRun: !!v }))
                  }
                />
                Antes do Test Run?
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <Checkbox
                  checked={formData.ferramentasCargoFerwood}
                  onCheckedChange={(v) =>
                    setFormData((p) => ({ ...p, ferramentasCargoFerwood: !!v }))
                  }
                />
                A cargo do Fabricante
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <Checkbox
                  checked={formData.tapeteEvacuacao}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, tapeteEvacuacao: !!v }))}
                />
                Tapete de Evacuação
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Quais?</label>
                <Input
                  name="ferramentasQuais"
                  value={formData.ferramentasQuais}
                  onChange={handleChange}
                  className="bg-zinc-900 border-zinc-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Ventosas (qtd)</label>
                <Input
                  name="ventosas"
                  value={formData.ventosas}
                  onChange={handleChange}
                  className="bg-zinc-900 border-zinc-700 text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 11. Material Test Run */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-base text-white">Material Test Run</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <Checkbox
                  checked={formData.materialTestRunFornecidoCliente}
                  onCheckedChange={(v) =>
                    setFormData((p) => ({ ...p, materialTestRunFornecidoCliente: !!v }))
                  }
                />
                Fornecido pelo Cliente
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <Checkbox
                  checked={formData.materialTestRunArmazemFW}
                  onCheckedChange={(v) =>
                    setFormData((p) => ({ ...p, materialTestRunArmazemFW: !!v }))
                  }
                />
                Armazém Nonato
              </label>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Quais e Qtd?</label>
              <Input
                name="materialTestRunQuaisQtd"
                value={formData.materialTestRunQuaisQtd}
                onChange={handleChange}
                className="bg-zinc-900 border-zinc-700 text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* 12. Língua e Documentação */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-base text-white">Língua e Documentação</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Língua Destino</label>
              <Input
                name="linguaDestino"
                value={formData.linguaDestino}
                onChange={handleChange}
                className="bg-zinc-900 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Manuais</label>
              <Input
                name="manuais"
                value={formData.manuais}
                onChange={handleChange}
                className="bg-zinc-900 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Adesivos</label>
              <Input
                name="adesivos"
                value={formData.adesivos}
                onChange={handleChange}
                className="bg-zinc-900 border-zinc-700 text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notas e Impressões */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-base text-white">Notas de Produção</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              name="notasProducao"
              value={formData.notasProducao}
              onChange={handleChange}
              placeholder="Notas de produção..."
              className="bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500 min-h-[80px]"
            />
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Impressões</label>
              <Textarea
                name="impressoes"
                value={formData.impressoes}
                onChange={handleChange}
                placeholder="Informações sobre impressões/etiquetas/marcações..."
                className="bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500 min-h-[80px]"
              />
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
              Salvar Ordem de Preparação
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default AddOrdemPreparacao;
