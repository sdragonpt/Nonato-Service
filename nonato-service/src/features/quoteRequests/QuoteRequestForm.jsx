// QuoteRequestForm.jsx
// Criar / editar um "Pedido de Orçamento Avulso": fornecedor (registado ou
// escrito à mão), texto do pedido, cliente/equipamento a que se destina
// (opcional) e as peças — escritas à mão, porque não são do nosso catálogo —
// com marca, referência, quantidade, nota e fotografia opcional.
// Rotas: /app/pedidos-orcamento/novo e /app/pedidos-orcamento/:docId

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { Camera, FileQuestion, FileText, Loader2, Package, Plus, Save, Trash2, Truck, X } from "lucide-react";
import { db } from "../../firebase.jsx";
import { useAuth } from "../../hooks/useAuth";
import { uploadPartImage } from "../../services/partEdits.js";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { PageHeader, FormSection, Field, FieldGrid, InputField, PageLoader } from "../../components/app";
import {
  emptyQuoteRequest,
  getQuoteRequest,
  createQuoteRequest,
  updateQuoteRequest,
} from "./quoteRequestsStore.js";
import { generateQuoteRequestPDF } from "./generateQuoteRequestPDF.js";

const MANUAL = "__manual__";
const genKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const emptyItem = () => ({ key: genKey(), nome: "", marca: "", referencia: "", quantidade: 1, nota: "", imagem: "" });

// Fotografia de uma peça: mostrar, carregar, tirar.
const PartPhoto = ({ item, onChange }) => {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    try {
      setUploading(true);
      onChange(await uploadPartImage(`orcamento-avulso-${item.key}`, file));
      setFailed(false);
    } catch (err) {
      console.error("Erro ao carregar a fotografia:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative h-16 w-16 shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground hover:ring-2 hover:ring-primary/40"
        title="Carregar fotografia"
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : item.imagem && !failed ? (
          <img src={item.imagem} alt={item.nome} className="h-full w-full bg-white object-contain p-1" onError={() => setFailed(true)} />
        ) : (
          <Camera className="h-5 w-5" />
        )}
      </button>
      {item.imagem && !uploading && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-background text-muted-foreground ring-1 ring-border hover:text-red-400"
          aria-label="Tirar fotografia"
        >
          <X className="h-3 w-3" />
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
};

const QuoteRequestForm = () => {
  const { docId } = useParams();
  const isNew = !docId || docId === "novo";
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState(() => ({ ...emptyQuoteRequest(), itens: [emptyItem()] }));
  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [manualSupplier, setManualSupplier] = useState(false);

  useEffect(() => {
    getDocs(collection(db, "fornecedores"))
      .then((snap) =>
        setSuppliers(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((s) => !s.eliminadoEm)
            .sort((a, b) => (a.nomeEmpresa || "").localeCompare(b.nomeEmpresa || "", "pt"))
        )
      )
      .catch((err) => console.error("Erro ao carregar fornecedores:", err));
  }, []);

  useEffect(() => {
    if (isNew) return;
    getQuoteRequest(docId)
      .then((d) => {
        if (!d) {
          setError("Pedido não encontrado.");
          return;
        }
        setNumber(d.number || "");
        setData({ ...emptyQuoteRequest(), ...d, itens: (d.itens || []).map((i) => ({ ...i, key: i.key || genKey() })) });
        setManualSupplier(!d.fornecedor?.id && !!d.fornecedor?.nome);
      })
      .catch((err) => {
        console.error("Erro ao abrir o pedido:", err);
        setError("Não foi possível abrir o pedido.");
      })
      .finally(() => setLoading(false));
  }, [docId, isNew]);

  const set = (patch) => setData((d) => ({ ...d, ...patch }));
  const setF = (patch) => setData((d) => ({ ...d, fornecedor: { ...d.fornecedor, ...patch } }));
  const setEq = (patch) => setData((d) => ({ ...d, equipment: { ...d.equipment, ...patch } }));

  const chooseSupplier = (v) => {
    if (v === MANUAL) {
      setManualSupplier(true);
      setF({ id: "", nome: "", contato: "", email: "", telefone: "" });
      return;
    }
    setManualSupplier(false);
    const s = suppliers.find((x) => x.id === v);
    setF({
      id: v,
      nome: s?.nomeEmpresa || "",
      contato: s?.contato || "",
      email: s?.email || "",
      telefone: s?.telefones || "",
    });
  };

  const updateItem = (key, patch) =>
    setData((d) => ({ ...d, itens: d.itens.map((i) => (i.key === key ? { ...i, ...patch } : i)) }));
  const removeItem = (key) => setData((d) => ({ ...d, itens: d.itens.filter((i) => i.key !== key) }));
  const addItem = () => setData((d) => ({ ...d, itens: [...d.itens, emptyItem()] }));

  const filledItems = data.itens.filter((i) => (i.nome || i.referencia).trim());
  const valid = filledItems.length > 0 && (data.fornecedor.nome || "").trim();

  const save = async (withPdf) => {
    if (!(data.fornecedor.nome || "").trim()) return setError("Escolha ou escreva o fornecedor.");
    if (!filledItems.length) return setError("Adicione pelo menos uma peça (nome ou referência).");
    const toSave = { ...data, itens: filledItems };
    try {
      setSaving(true);
      setError(null);
      setSaved(null);
      let record = { ...toSave, number };
      if (isNew) {
        const { id, number: n } = await createQuoteRequest(toSave, user?.displayName || user?.email || "");
        record = { ...toSave, number: n, createdAt: new Date() };
        setNumber(n);
        navigate(`/app/pedidos-orcamento/${id}`, { replace: true });
      } else {
        await updateQuoteRequest(docId, toSave);
      }
      if (withPdf) await generateQuoteRequestPDF(record);
      setSaved(withPdf ? "Guardado e PDF gerado." : "Guardado.");
    } catch (err) {
      console.error("Erro ao guardar:", err);
      setError("Não foi possível guardar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader label="A abrir…" />;

  const totalQtd = filledItems.reduce((t, i) => t + (Number(i.quantidade) || 0), 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      <PageHeader
        icon={FileQuestion}
        title={isNew ? "Novo Pedido de Orçamento Avulso" : `Pedido de Orçamento ${number}`}
        description="Pedir preços a um fornecedor por peças que não são do nosso catálogo"
        back="/app/pedidos-orcamento"
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {saved && (
        <Alert variant="success">
          <AlertDescription>{saved}</AlertDescription>
        </Alert>
      )}

      <FormSection title="Fornecedor" icon={Truck}>
        <Field label="Fornecedor" required>
          <Select value={manualSupplier ? MANUAL : data.fornecedor.id} onValueChange={chooseSupplier}>
            <SelectTrigger>
              <SelectValue placeholder="Escolher fornecedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={MANUAL}>Escrever à mão (fornecedor não registado)…</SelectItem>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.nomeEmpresa}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {(manualSupplier || data.fornecedor.id) && (
          <FieldGrid cols={2}>
            <InputField label="Nome" required value={data.fornecedor.nome} onChange={(e) => setF({ nome: e.target.value })} />
            <InputField label="Contacto (pessoa)" value={data.fornecedor.contato} onChange={(e) => setF({ contato: e.target.value })} />
            <InputField label="E-mail" type="email" value={data.fornecedor.email} onChange={(e) => setF({ email: e.target.value })} />
            <InputField label="Telefone" value={data.fornecedor.telefone} onChange={(e) => setF({ telefone: e.target.value })} />
          </FieldGrid>
        )}
        <Field label="Texto do pedido">
          <Textarea rows={4} value={data.texto} onChange={(e) => set({ texto: e.target.value })} />
        </Field>
      </FormSection>

      <FormSection title="Destino das peças" description="Opcional — para que cliente e equipamento são as peças" icon={Package}>
        <InputField label="Cliente" value={data.clientName} onChange={(e) => set({ clientName: e.target.value })} placeholder="Ex.: FERWOOD" />
        <FieldGrid cols={3}>
          <InputField label="Marca do equipamento" value={data.equipment.brand} onChange={(e) => setEq({ brand: e.target.value })} />
          <InputField label="Modelo" value={data.equipment.model} onChange={(e) => setEq({ model: e.target.value })} />
          <InputField label="Nº do equipamento" value={data.equipment.serialNumber} onChange={(e) => setEq({ serialNumber: e.target.value })} />
        </FieldGrid>
      </FormSection>

      <FormSection
        title={`Peças a orçamentar${filledItems.length ? ` (${filledItems.length} · ${totalQtd} un.)` : ""}`}
        icon={Package}
        actions={
          <Button type="button" size="sm" variant="outline" onClick={addItem}>
            <Plus /> Peça
          </Button>
        }
      >
        <div className="space-y-2">
          {data.itens.map((i) => (
            <div key={i.key} className="surface-muted flex flex-col gap-3 p-3 sm:flex-row sm:items-start">
              <PartPhoto item={i} onChange={(imagem) => updateItem(i.key, { imagem })} />
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-[1fr_9rem_9rem_5rem]">
                <Input value={i.nome} onChange={(e) => updateItem(i.key, { nome: e.target.value })} placeholder="Nome / descrição da peça" aria-label="Nome da peça" />
                <Input value={i.marca} onChange={(e) => updateItem(i.key, { marca: e.target.value })} placeholder="Marca" aria-label="Marca" />
                <Input value={i.referencia} onChange={(e) => updateItem(i.key, { referencia: e.target.value })} placeholder="Referência" aria-label="Referência" className="font-mono" />
                <Input type="number" min={1} value={i.quantidade} onChange={(e) => updateItem(i.key, { quantidade: e.target.value })} aria-label="Quantidade" className="text-center" />
                <Input value={i.nota} onChange={(e) => updateItem(i.key, { nota: e.target.value })} placeholder="Nota (opcional) — medidas, alternativa aceite…" aria-label="Nota" className="sm:col-span-4" />
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-9 w-9 shrink-0 self-end text-muted-foreground hover:text-red-400 sm:self-start"
                onClick={() => removeItem(i.key)}
                aria-label="Tirar peça"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" className="w-full border-dashed" onClick={addItem}>
            <Plus /> Adicionar peça
          </Button>
        </div>
      </FormSection>

      <FormSection title="Observações">
        <Textarea rows={3} value={data.observacoes} onChange={(e) => set({ observacoes: e.target.value })} placeholder="Ex.: urgente, entrega na morada do cliente…" />
      </FormSection>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => save(false)} disabled={saving || !valid}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          Guardar
        </Button>
        <Button type="button" onClick={() => save(true)} disabled={saving || !valid} className="sm:min-w-52">
          {saving ? <Loader2 className="animate-spin" /> : <FileText />}
          Guardar e gerar PDF
        </Button>
      </div>
    </div>
  );
};

export default QuoteRequestForm;
