// QuoteRequestForm.jsx
// Criar / editar um "Pedido de Orçamento Avulso": cliente (registado ou não)
// e os seus dados, as peças — escritas à mão, porque não são do nosso
// catálogo — com marca, referência, quantidade, nota e fotografia opcional,
// e observações.
// Rotas: /app/pedidos-orcamento/novo e /app/pedidos-orcamento/:docId
//
// Depois de o fornecedor dar os preços, "Criar proposta para o cliente" abre
// um Orçamento de Peças novo com o cliente e as peças deste pedido (como
// peças fora do catálogo) e o nº do pedido, que aparece no PDF da proposta.

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Calculator, Camera, FileQuestion, FileText, Loader2, Package, Plus, Save, Trash2, User, X } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useClients } from "../../context/ClientsContext.jsx";
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

const UNREGISTERED = "__nao_registado__";
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
  const { ensureClients } = useClients();

  const [data, setData] = useState(() => ({ ...emptyQuoteRequest(), itens: [emptyItem()] }));
  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);
  const [clients, setClients] = useState([]);

  useEffect(() => {
    ensureClients()
      .then((list) => setClients([...list].sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt"))))
      .catch((err) => console.error("Erro ao carregar clientes:", err));
  }, [ensureClients]);

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
      })
      .catch((err) => {
        console.error("Erro ao abrir o pedido:", err);
        setError("Não foi possível abrir o pedido.");
      })
      .finally(() => setLoading(false));
  }, [docId, isNew]);

  const set = (patch) => setData((d) => ({ ...d, ...patch }));
  const setC = (patch) => setData((d) => ({ ...d, cliente: { ...d.cliente, ...patch } }));

  // Cliente registado: os dados vêm da ficha (e podem ser acertados só para este pedido).
  const chooseClient = (v) => {
    if (v === UNREGISTERED) {
      setC({ id: "", name: "", nif: "", phone: "", email: "", address: "" });
      return;
    }
    const c = clients.find((x) => x.id === v);
    setC({
      id: v,
      name: c?.name || "",
      nif: c?.nif || "",
      phone: c?.phone || "",
      email: c?.email || "",
      address: [c?.address, c?.postalCode].filter(Boolean).join(" · "),
    });
  };

  const updateItem = (key, patch) =>
    setData((d) => ({ ...d, itens: d.itens.map((i) => (i.key === key ? { ...i, ...patch } : i)) }));
  const removeItem = (key) => setData((d) => ({ ...d, itens: d.itens.filter((i) => i.key !== key) }));
  const addItem = () => setData((d) => ({ ...d, itens: [...d.itens, emptyItem()] }));

  const filledItems = data.itens.filter((i) => (i.nome || i.referencia).trim());
  const valid = filledItems.length > 0 && (data.cliente.name || "").trim();

  const save = async (withPdf) => {
    if (!(data.cliente.name || "").trim()) return setError("Escolha o cliente ou escreva o nome.");
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
        description="Peças que não são do nosso catálogo, para um cliente registado ou não"
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

      <FormSection title="Cliente" icon={User}>
        <Field label="Cliente">
          <Select value={data.cliente.id || UNREGISTERED} onValueChange={chooseClient}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNREGISTERED}>Cliente não registado (escrever os dados)</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <FieldGrid cols={2}>
          <InputField label="Nome" required value={data.cliente.name} onChange={(e) => setC({ name: e.target.value })} />
          <InputField label="NIF" value={data.cliente.nif} onChange={(e) => setC({ nif: e.target.value })} />
          <InputField label="Telefone" value={data.cliente.phone} onChange={(e) => setC({ phone: e.target.value })} />
          <InputField label="E-mail" type="email" value={data.cliente.email} onChange={(e) => setC({ email: e.target.value })} />
        </FieldGrid>
        <InputField label="Morada" value={data.cliente.address} onChange={(e) => setC({ address: e.target.value })} />
        {data.cliente.id && (
          <p className="text-xs text-muted-foreground">Os dados vêm da ficha do cliente; alterar aqui não muda a ficha.</p>
        )}
      </FormSection>

      <FormSection
        title={`Peças${filledItems.length ? ` (${filledItems.length} · ${totalQtd} un.)` : ""}`}
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
        <Textarea rows={3} value={data.observacoes} onChange={(e) => set({ observacoes: e.target.value })} placeholder="Ex.: urgente, prazo de entrega…" />
      </FormSection>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {!isNew && number && (
          <Button
            type="button"
            variant="soft"
            className="sm:mr-auto"
            disabled={saving || !filledItems.length}
            onClick={() =>
              navigate("/app/add-part-budget", {
                state: { fromPOA: { number, cliente: data.cliente, itens: filledItems } },
              })
            }
            title="Abre um Orçamento de Peças com este cliente e estas peças, para pôr os preços"
          >
            <Calculator />
            Criar proposta para o cliente
          </Button>
        )}
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
