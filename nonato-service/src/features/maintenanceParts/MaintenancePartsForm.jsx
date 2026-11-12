// MaintenancePartsForm.jsx
// Criar / editar um documento "Peças para Manutenção":
// - cliente (registado ou escrito à mão);
// - equipamento: do cliente, do Armazém ou escrito à mão (nome + nº);
// - peças do catálogo (código, nome, imagem) ou fora do catálogo, cada uma
//   com quantidade e nota;
// - Guardar / Guardar e gerar PDF (generateMaintenancePartsPDF.js).
// Rotas: /app/pecas-manutencao/nova e /app/pecas-manutencao/:docId

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { ClipboardList, FileText, Loader2, Package, Plus, Save, Trash2, Wrench } from "lucide-react";
import { db } from "../../firebase.jsx";
import { useClients } from "../../context/ClientsContext.jsx";
import { useEquipments } from "../../context/EquipmentsContext.jsx";
import { useAuth } from "../../hooks/useAuth";
import { searchCatalogParts } from "../../utils/catalogPartSearch.js";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import {
  PageHeader,
  FormSection,
  Field,
  FieldGrid,
  InputField,
  SearchInput,
  PageLoader,
} from "../../components/app";
import {
  emptyMaintenanceDoc,
  getMaintenanceDoc,
  createMaintenanceDoc,
  updateMaintenanceDoc,
} from "./maintenancePartsStore.js";
import { generateMaintenancePartsPDF } from "./generateMaintenancePartsPDF.js";

const NO_CLIENT = "__nenhum__";
const MANUAL = "__manual__";
const genKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Imagem da peça no formulário (esconde-se se não carregar).
const Thumb = ({ src, alt }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Package className="h-5 w-5" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-14 w-14 shrink-0 rounded-lg bg-white object-contain p-1"
    />
  );
};

const MaintenancePartsForm = () => {
  const { docId } = useParams();
  const isNew = !docId || docId === "nova";
  const navigate = useNavigate();
  const { user } = useAuth();
  const { ensureClients } = useClients();
  const { ensureEquipments } = useEquipments();

  const [data, setData] = useState(emptyMaintenanceDoc());
  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);

  const [clients, setClients] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [warehouse, setWarehouse] = useState([]);

  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Fontes: clientes, equipamentos dos clientes e do Armazém
  useEffect(() => {
    Promise.all([ensureClients(), ensureEquipments(), getDocs(collection(db, "equipamentosArmazem"))])
      .then(([c, e, w]) => {
        setClients([...c].sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt")));
        setEquipments(e);
        setWarehouse(w.docs.map((d) => ({ id: d.id, ...d.data() })));
      })
      .catch((err) => console.error("Erro ao carregar clientes/equipamentos:", err));
  }, [ensureClients, ensureEquipments]);

  // Documento existente
  useEffect(() => {
    if (isNew) return;
    getMaintenanceDoc(docId)
      .then((d) => {
        if (!d) {
          setError("Documento não encontrado.");
          return;
        }
        setNumber(d.number || "");
        setData({ ...emptyMaintenanceDoc(), ...d, itens: (d.itens || []).map((i) => ({ ...i, key: i.key || genKey() })) });
      })
      .catch((err) => {
        console.error("Erro ao abrir o documento:", err);
        setError("Não foi possível abrir o documento.");
      })
      .finally(() => setLoading(false));
  }, [docId, isNew]);

  // Pesquisa no catálogo (com pequena espera entre teclas)
  useEffect(() => {
    if (search.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(() => {
      searchCatalogParts(search, { limit: 12 })
        .then((r) => !cancelled && setResults(r))
        .catch((err) => console.error("Erro na pesquisa de peças:", err))
        .finally(() => !cancelled && setSearching(false));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [search]);

  const set = (patch) => setData((d) => ({ ...d, ...patch }));
  const setEquipment = (patch) => setData((d) => ({ ...d, equipment: { ...d.equipment, ...patch } }));

  // ── Cliente ──
  const clientValue = data.clientId || (data.clientName ? MANUAL : NO_CLIENT);
  const chooseClient = (v) => {
    if (v === NO_CLIENT) return set({ clientId: "", clientName: "" });
    if (v === MANUAL) return set({ clientId: "", clientName: data.clientId ? "" : data.clientName });
    const c = clients.find((x) => x.id === v);
    set({ clientId: v, clientName: c?.name || "" });
    // equipamento de outro cliente deixa de fazer sentido
    if (data.equipment.source === "cliente") setEquipment({ source: "", id: "", brand: "", model: "", serialNumber: "" });
  };
  const [manualClient, setManualClient] = useState(false);
  const showManualClient = manualClient || (!data.clientId && !!data.clientName);

  // ── Equipamento ──
  const clientEquipments = useMemo(
    () => equipments.filter((e) => data.clientId && e.clientId === data.clientId),
    [equipments, data.clientId]
  );
  const equipmentValue = data.equipment.source === "manual"
    ? MANUAL
    : data.equipment.id
    ? `${data.equipment.source}:${data.equipment.id}`
    : "";
  const chooseEquipment = (v) => {
    if (v === MANUAL) return setEquipment({ source: "manual", id: "" });
    const [source, id] = v.split(":");
    if (source === "cliente") {
      const e = equipments.find((x) => x.id === id);
      setEquipment({ source, id, brand: e?.brand || "", model: e?.model || "", serialNumber: e?.serialNumber || "" });
    } else {
      const w = warehouse.find((x) => x.id === id);
      setEquipment({
        source,
        id,
        brand: w?.marca || w?.nome || "",
        model: w?.modelo || "",
        serialNumber: w?.numeroSerie || "",
      });
    }
  };

  // ── Peças ──
  const addPart = (part) => {
    setData((d) => {
      const existing = d.itens.find((i) => i.code && i.code === part.code);
      if (existing) {
        return { ...d, itens: d.itens.map((i) => (i === existing ? { ...i, quantity: (Number(i.quantity) || 1) + 1 } : i)) };
      }
      return {
        ...d,
        itens: [...d.itens, { key: genKey(), code: part.code || "", name: part.name || "", image: part.image || null, quantity: 1, nota: "" }],
      };
    });
    setSearch("");
    setResults([]);
  };
  const addManualPart = () =>
    setData((d) => ({ ...d, itens: [...d.itens, { key: genKey(), code: "", name: "", image: null, quantity: 1, nota: "", manual: true }] }));
  const updatePart = (key, patch) =>
    setData((d) => ({ ...d, itens: d.itens.map((i) => (i.key === key ? { ...i, ...patch } : i)) }));
  const removePart = (key) => setData((d) => ({ ...d, itens: d.itens.filter((i) => i.key !== key) }));

  const valid = data.itens.length > 0 && data.itens.every((i) => (i.name || i.code).trim());

  const save = async (withPdf) => {
    if (!valid) {
      setError("Adicione pelo menos uma peça (cada peça precisa de nome ou código).");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      setSaved(null);
      let record = { ...data, number };
      if (isNew) {
        const { id, number: n } = await createMaintenanceDoc(data, user?.displayName || user?.email || "");
        record = { ...data, number: n, createdAt: new Date() };
        setNumber(n);
        navigate(`/app/pecas-manutencao/${id}`, { replace: true });
      } else {
        await updateMaintenanceDoc(docId, data);
      }
      if (withPdf) {
        const client = clients.find((c) => c.id === data.clientId);
        await generateMaintenancePartsPDF(record, { client });
      }
      setSaved(withPdf ? "Guardado e PDF gerado." : "Guardado.");
    } catch (err) {
      console.error("Erro ao guardar:", err);
      setError("Não foi possível guardar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader label="A abrir…" />;

  const totalQtd = data.itens.reduce((t, i) => t + (Number(i.quantity) || 0), 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      <PageHeader
        icon={ClipboardList}
        title={isNew ? "Novo — Peças para Manutenção" : `Peças para Manutenção ${number}`}
        description="Peças necessárias para a manutenção, com código e imagem (sem preços)"
        back="/app/pecas-manutencao"
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

      {/* Cliente e equipamento */}
      <FormSection title="Cliente e equipamento" icon={Wrench}>
        <FieldGrid cols={2}>
          <Field label="Cliente">
            <Select
              value={showManualClient ? MANUAL : clientValue}
              onValueChange={(v) => {
                setManualClient(v === MANUAL);
                chooseClient(v);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Escolher cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CLIENT} className="text-muted-foreground">Sem cliente</SelectItem>
                <SelectItem value={MANUAL}>Escrever o nome à mão…</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {showManualClient && (
            <InputField
              label="Nome do cliente"
              value={data.clientName}
              onChange={(e) => set({ clientName: e.target.value, clientId: "" })}
              placeholder="Ex.: FERWOOD"
            />
          )}
        </FieldGrid>

        <Field label="Equipamento">
          <Select value={equipmentValue} onValueChange={chooseEquipment}>
            <SelectTrigger>
              <SelectValue placeholder="Escolher equipamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={MANUAL}>Escrever à mão…</SelectItem>
              {clientEquipments.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Do cliente</SelectLabel>
                  {clientEquipments.map((e) => (
                    <SelectItem key={e.id} value={`cliente:${e.id}`}>
                      {[e.brand, e.model].filter(Boolean).join(" ") || "Equipamento"}
                      {e.serialNumber ? ` — ${e.serialNumber}` : ""}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              {warehouse.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Armazém (própria empresa)</SelectLabel>
                  {warehouse.map((w) => (
                    <SelectItem key={w.id} value={`armazem:${w.id}`}>
                      {[w.marca, w.modelo].filter(Boolean).join(" ") || w.nome}
                      {w.numeroSerie ? ` — ${w.numeroSerie}` : ""}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
        </Field>

        {data.equipment.source && (
          <FieldGrid cols={3}>
            <InputField
              label="Marca"
              value={data.equipment.brand}
              onChange={(e) => setEquipment({ brand: e.target.value })}
              placeholder="Ex.: HOMAG"
            />
            <InputField
              label="Modelo"
              value={data.equipment.model}
              onChange={(e) => setEquipment({ model: e.target.value })}
              placeholder="Ex.: EDGETEQ S-380"
            />
            <InputField
              label="Nº do equipamento"
              value={data.equipment.serialNumber}
              onChange={(e) => setEquipment({ serialNumber: e.target.value })}
              placeholder="Ex.: 0-261-73-2862"
            />
          </FieldGrid>
        )}

        <InputField
          label="Assunto"
          value={data.titulo}
          onChange={(e) => set({ titulo: e.target.value })}
          placeholder="Ex.: Manutenção preventiva anual"
        />
        <Field label="Observações">
          <Textarea
            rows={3}
            value={data.observacoes}
            onChange={(e) => set({ observacoes: e.target.value })}
            placeholder="Informação extra para quem vai preparar as peças…"
          />
        </Field>
      </FormSection>

      {/* Peças */}
      <FormSection
        title={`Peças necessárias${data.itens.length ? ` (${data.itens.length} · ${totalQtd} un.)` : ""}`}
        icon={Package}
        actions={
          <Button type="button" size="sm" variant="outline" onClick={addManualPart}>
            <Plus /> Peça fora do catálogo
          </Button>
        }
      >
        <div className="space-y-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Pesquisar no catálogo por código ou nome…"
            className="lg:max-w-none"
          />
          {searching && <p className="text-xs text-muted-foreground">A procurar…</p>}
          {results.length > 0 && (
            <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
              {results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addPart(p)}
                  className="flex w-full items-center gap-3 border-b border-border p-2 text-left last:border-b-0 hover:bg-white/5"
                >
                  <Thumb src={p.image} alt={p.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{p.code}</p>
                  </div>
                  <Plus className="h-4 w-4 shrink-0 text-primary" />
                </button>
              ))}
            </div>
          )}
        </div>

        {data.itens.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ainda não há peças. Pesquise no catálogo ou use “Peça fora do catálogo”.
          </p>
        ) : (
          <div className="space-y-2">
            {data.itens.map((i) => (
              <div key={i.key} className="surface-muted flex flex-col gap-3 p-3 sm:flex-row sm:items-start">
                <Thumb src={i.image} alt={i.name} />
                <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-[1fr_9rem_5rem]">
                  <Input
                    value={i.name}
                    onChange={(e) => updatePart(i.key, { name: e.target.value })}
                    placeholder="Nome da peça"
                    aria-label="Nome da peça"
                  />
                  <Input
                    value={i.code}
                    onChange={(e) => updatePart(i.key, { code: e.target.value })}
                    placeholder="Código"
                    aria-label="Código"
                    className="font-mono"
                    readOnly={!i.manual && !!i.code}
                  />
                  <Input
                    type="number"
                    min={1}
                    value={i.quantity}
                    onChange={(e) => updatePart(i.key, { quantity: e.target.value })}
                    aria-label="Quantidade"
                    className="text-center"
                  />
                  <Input
                    value={i.nota}
                    onChange={(e) => updatePart(i.key, { nota: e.target.value })}
                    placeholder="Nota (opcional) — ex.: lado esquerdo, trocar junto com…"
                    aria-label="Nota"
                    className="sm:col-span-3"
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 shrink-0 self-end text-muted-foreground hover:text-red-400 sm:self-start"
                  onClick={() => removePart(i.key)}
                  aria-label="Tirar peça"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
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

export default MaintenancePartsForm;
