// SolicitarFaturaDialog.jsx
// Janela "Solicitar fatura" dos Detalhes do Cliente: preenche os dados do
// cliente, pede o valor (com ou sem IVA) e a nota, e gera o PDF da
// Solicitação de Fatura (pdf/solicitacaoFaturaPDF.js). Os dados do cliente
// podem ser acertados aqui só para este PDF — não alteram a ficha.
//
// Tipos:
// - Avulsa — serviços por mensagem, documentos por e-mail, etc. (valor à mão);
// - Orçamento de peças — escolhe-se um orçamento de peças: os ligados a este
//   cliente e os 50 mais recentes de todos; se o cliente não tiver nenhum
//   ligado (muitos são criados sem cliente), aparecem TODOS. O pedido leva o
//   mesmo número (ORP-…) e o valor vem das peças;
// - Ordem de serviço — escolhe-se uma OS do cliente; o pedido leva o número
//   da OS e as máquinas dela (nome + nº de série) e, se a OS já tiver
//   fechamento, o valor e o IVA vêm de lá.
// O número e o valor são sempre editáveis (para documentos que não estejam na lista).
// Cada pedido gerado fica guardado no perfil do cliente (só os dados, não o
// PDF) — ver ../invoiceRequests.js e ClientInvoiceRequests.jsx.

import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { FileText, Loader2, Euro } from "lucide-react";
import { db } from "../../../firebase.jsx";
import { useAuth } from "../../../hooks/useAuth";
import { saveInvoiceRequest } from "../invoiceRequests.js";
import { formatDate } from "../../../utils/formatDate.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Switch } from "@/components/ui/switch.jsx";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { Field, FieldGrid, InputField } from "../../../components/app";
import {
  generateSolicitacaoFaturaPDF,
  invoiceAmounts,
  formatEuro,
  TIPOS_FATURA,
} from "../pdf/solicitacaoFaturaPDF.js";

const toMillis = (v) => (v?.toDate ? v.toDate().getTime() : new Date(v || 0).getTime() || 0);
const RECENT_QUOTES = 50;

// Máquinas de uma OS: a lista `equipmentsList` (OS com vários equipamentos);
// nas mais antigas, o `equipmentId` (procura-se o equipamento) ou o
// equipamento escrito à mão (`manualEquipment`).
const machineOf = (e) => ({
  nome: [e.brand, e.model].filter(Boolean).join(" ").trim() || e.type || "Equipamento",
  numero: e.serialNumber || "",
});
async function orderMachines(order) {
  if (order.equipmentsList?.length) return order.equipmentsList.map(machineOf);
  if (order.equipmentId) {
    const snap = await getDoc(doc(db, "equipamentos", order.equipmentId));
    if (snap.exists()) return [machineOf(snap.data())];
  }
  if (order.manualEquipment?.model || order.manualEquipment?.brand) return [machineOf(order.manualEquipment)];
  return [];
}
const quoteClientName = (q) => q.unregisteredClient?.name || q.clientName || "Sem cliente";
const partsTotal = (q) =>
  (q.partsQuoteItems || q.items || []).reduce((t, i) => t + (Number(i.quantity) || 0) * (Number(i.price) || 0), 0);

const DEFAULT_TEXT = "Venho por meio desta solicitar que seja feita uma fatura com os dados abaixo.\nObrigado. Nonato";
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const SolicitarFaturaDialog = ({ open, onOpenChange, client, onSaved }) => {
  const { user } = useAuth();
  const [form, setForm] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  // Documentos do cliente para os tipos "peças" e "OS" (carregados ao abrir)
  const [docs, setDocs] = useState({ loading: false, pecas: [], os: [] });
  // Orçamentos de peças recentes de qualquer cliente (só se carregam ao escolher "peças")
  const [recentQuotes, setRecentQuotes] = useState(null);
  const [docId, setDocId] = useState("");
  // Número que veio do documento escolhido — se for alterado à mão, o pedido
  // deixa de ficar ligado a esse documento.
  const [docRef, setDocRef] = useState("");

  // Cada vez que abre, recomeça com os dados atuais do cliente.
  useEffect(() => {
    if (!open || !client) return;
    setForm({
      name: client.name || "",
      nif: client.nif || "",
      phone: client.phone || "",
      email: client.email || "",
      address: client.address || "",
      postalCode: client.postalCode || "",
      company: client.company || "",
      data: today(),
      texto: DEFAULT_TEXT,
      valor: "",
      comIva: false,
      taxaIva: "23",
      nota: "Prestação de serviços",
      tipo: "avulsa",
      referencia: "",
      maquinas: [],
    });
    setDocId("");
    setDocRef("");
    setError(null);
    setRecentQuotes(null);

    // Orçamentos de peças e OS deste cliente (as duas estão em "ordens").
    let cancelled = false;
    setDocs({ loading: true, pecas: [], os: [] });
    getDocs(query(collection(db, "ordens"), where("clientId", "==", client.id)))
      .then((snap) => {
        if (cancelled) return;
        const all = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((d) => !d.eliminadoEm)
          .sort((a, b) => toMillis(b.createdAt || b.date) - toMillis(a.createdAt || a.date));
        setDocs({ loading: false, pecas: all.filter((d) => d.isQuote), os: all.filter((d) => !d.isQuote) });
      })
      .catch((err) => {
        console.error("Erro ao carregar orçamentos/ordens do cliente:", err);
        if (!cancelled) setDocs({ loading: false, pecas: [], os: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [open, client]);

  // Orçamentos de peças de todos os clientes, quando se escolhe "peças" e a
  // lista do cliente já carregou: sem nenhum ligado → todos; senão → os 50
  // mais recentes.
  const tipo = form?.tipo;
  useEffect(() => {
    if (tipo !== "pecas" || docs.loading || recentQuotes !== null) return;
    setRecentQuotes([]);
    const base = [where("isQuote", "==", true), orderBy("createdAt", "desc")];
    const q = docs.pecas.length
      ? query(collection(db, "ordens"), ...base, limit(RECENT_QUOTES))
      : query(collection(db, "ordens"), ...base);
    getDocs(q)
      .then((snap) => setRecentQuotes(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((d) => !d.eliminadoEm)))
      .catch((err) => console.error("Erro ao carregar orçamentos de peças:", err));
  }, [tipo, docs.loading, docs.pecas.length, recentQuotes]);

  const setTipo = (tipo) => {
    setDocId("");
    setDocRef("");
    setForm((f) => ({ ...f, tipo, referencia: "", maquinas: [], ...(tipo === "avulsa" ? {} : { valor: "" }) }));
  };

  // Ao escolher o documento: número + valor (peças: soma das peças; OS: valor
  // do fechamento, se já existir).
  const chooseDoc = async (id) => {
    setDocId(id);
    if (form.tipo === "pecas") {
      const q = docs.pecas.find((d) => d.id === id) || (recentQuotes || []).find((d) => d.id === id);
      if (!q) return;
      setDocRef(q.quoteNumber || q.id);
      setForm((f) => ({
        ...f,
        referencia: q.quoteNumber || q.id,
        valor: String(Math.round(partsTotal(q) * 100) / 100).replace(".", ","),
        nota: f.nota === "Prestação de serviços" ? "Fornecimento de peças" : f.nota,
      }));
      return;
    }
    const o = docs.os.find((d) => d.id === id);
    if (!o) return;
    setDocRef(o.orderNumber || o.id);
    setForm((f) => ({ ...f, referencia: o.orderNumber || o.id, maquinas: [] }));
    orderMachines(o)
      .then((maquinas) => setForm((f) => (f.referencia === (o.orderNumber || o.id) ? { ...f, maquinas } : f)))
      .catch((err) => console.error("Erro ao ler as máquinas da OS:", err));
    try {
      const snap = await getDocs(query(collection(db, "orcamentos"), where("orderId", "==", id)));
      const fechamentos = snap.docs
        .map((d) => d.data())
        .filter((b) => !b.eliminadoEm)
        .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
      const fecho = fechamentos[0];
      if (fecho && Number(fecho.total) > 0) {
        const iva = Number(fecho.ivaRate) || 0;
        setForm((f) => ({
          ...f,
          valor: String(Math.round(Number(fecho.total) * 100) / 100).replace(".", ","),
          comIva: iva > 0,
          taxaIva: iva > 0 ? String(iva) : f.taxaIva,
        }));
      }
    } catch (err) {
      console.error("Erro ao procurar o fechamento da OS:", err);
    }
  };

  if (!form) return null;
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const valorNum = Number(String(form.valor).replace(",", "."));
  const valid =
    form.name.trim() &&
    form.valor !== "" &&
    !Number.isNaN(valorNum) &&
    valorNum > 0 &&
    (form.tipo === "avulsa" || !!form.referencia);
  const docList = form.tipo === "pecas" ? docs.pecas : form.tipo === "os" ? docs.os : [];
  const otherQuotes =
    form.tipo === "pecas" ? (recentQuotes || []).filter((q) => !docs.pecas.some((p) => p.id === q.id)) : [];
  const quoteLabel = (d, withClient) =>
    `${d.quoteNumber || d.id}${withClient ? ` · ${quoteClientName(d)}` : ""} · ${formatDate(d.createdAt)} · ${formatEuro(partsTotal(d))}`;
  const amounts = invoiceAmounts({ valor: valorNum, comIva: form.comIva, taxaIva: form.taxaIva });

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!valid) return;
    try {
      setGenerating(true);
      setError(null);
      await generateSolicitacaoFaturaPDF({
        client: form,
        data: form.data,
        texto: form.texto,
        valor: valorNum,
        comIva: form.comIva,
        taxaIva: Number(String(form.taxaIva).replace(",", ".")) || 0,
        nota: form.nota,
        tipo: form.tipo,
        referencia: form.referencia,
        maquinas: form.tipo === "os" ? form.maquinas : [],
      });
      // Guarda os dados (não o PDF) no perfil do cliente. Se falhar, o PDF já
      // saiu — avisa sem fechar a janela.
      try {
        await saveInvoiceRequest({
          clientId: client.id,
          sourceId: docId && docRef === form.referencia ? docId : null,
          form,
          createdBy: user?.displayName || user?.email || "",
        });
        onSaved?.();
      } catch (err) {
        console.error("Erro ao guardar o pedido de fatura:", err);
        setError("O PDF foi gerado, mas não foi possível guardar o pedido no perfil do cliente.");
        return;
      }
      onOpenChange(false);
    } catch (err) {
      console.error("Erro ao gerar a solicitação de fatura:", err);
      setError("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar fatura</DialogTitle>
          <DialogDescription>
            Gera o PDF do pedido de fatura com os dados do cliente e o valor.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleGenerate} className="space-y-5">
          {/* Tipo de pedido */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Tipo</label>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted/60 p-1">
              {Object.entries(TIPOS_FATURA).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTipo(key)}
                  aria-pressed={form.tipo === key}
                  className={`rounded-md px-2 py-2 text-xs font-medium transition-colors sm:text-sm ${
                    form.tipo === key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {form.tipo === "avulsa"
                ? "Serviços por mensagem, documentos por e-mail e outros pedidos sem documento de origem."
                : form.tipo === "pecas"
                ? "O pedido leva o mesmo número do orçamento de peças, e o valor vem das peças."
                : "O pedido leva o número da ordem de serviço; se a OS já tiver fechamento, o valor vem de lá."}
            </p>
          </div>

          {form.tipo !== "avulsa" && (
            <Field label={form.tipo === "pecas" ? "Orçamento de peças" : "Ordem de serviço"} required>
              <Select value={docId} onValueChange={chooseDoc} disabled={docs.loading}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      docs.loading
                        ? "A carregar…"
                        : docList.length || otherQuotes.length
                        ? "Escolher…"
                        : form.tipo === "pecas"
                        ? recentQuotes === null || recentQuotes.length === 0
                          ? "A procurar orçamentos de peças…"
                          : "Sem orçamentos de peças — escreva o número abaixo"
                        : "Este cliente não tem ordens de serviço — escreva o número abaixo"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {form.tipo === "pecas" ? (
                    <>
                      {docList.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Deste cliente</SelectLabel>
                          {docList.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{quoteLabel(d, false)}</SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {otherQuotes.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>{docList.length ? "Outros recentes" : "Todos os orçamentos de peças"}</SelectLabel>
                          {otherQuotes.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{quoteLabel(d, true)}</SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                    </>
                  ) : (
                    docList.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {`${d.orderNumber || d.id} · ${formatDate(d.date || d.createdAt)}${d.status ? ` · ${d.status}` : ""}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </Field>
          )}

          {form.tipo !== "avulsa" && (
            <InputField
              label={form.tipo === "pecas" ? "Nº do orçamento de peças" : "Nº da ordem de serviço"}
              required
              value={form.referencia}
              onChange={set("referencia")}
              placeholder={form.tipo === "pecas" ? "ORP-0000-0000" : "OS-0000-0000"}
              hint="Vem do documento escolhido; pode escrever-se à mão se não estiver na lista."
            />
          )}

          {form.tipo === "os" && form.maquinas.length > 0 && (
            <div className="surface-muted space-y-1.5 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {form.maquinas.length === 1 ? "Máquina da OS" : `Máquinas da OS (${form.maquinas.length})`} — saem no PDF
              </p>
              {form.maquinas.map((m, i) => (
                <div key={i} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{m.nome}</span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">{m.numero || "sem nº"}</span>
                </div>
              ))}
            </div>
          )}

          <FieldGrid cols={2}>
            <InputField label="Valor" required icon={Euro} inputMode="decimal" value={form.valor} onChange={set("valor")} placeholder="0,00" autoFocus />
            <InputField label="Data" type="date" value={form.data} onChange={set("data")} />
          </FieldGrid>

          <div className="surface-muted space-y-3 p-3">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>
                Acrescentar IVA
                <span className="block text-xs text-muted-foreground">Desligado = o valor vai tal como está</span>
              </span>
              <Switch checked={form.comIva} onCheckedChange={(v) => setForm((f) => ({ ...f, comIva: v }))} />
            </label>
            {form.comIva && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Taxa</span>
                <Input inputMode="decimal" value={form.taxaIva} onChange={set("taxaIva")} className="h-9 w-20 text-right" />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            )}
            {valid && (
              <p className="text-sm tabular-nums">
                {form.comIva ? (
                  <>
                    {formatEuro(amounts.base)} + IVA {formatEuro(amounts.iva)} ={" "}
                    <strong className="text-primary">{formatEuro(amounts.total)}</strong>
                  </>
                ) : (
                  <>
                    Valor a faturar: <strong className="text-primary">{formatEuro(amounts.total)}</strong>
                  </>
                )}
              </p>
            )}
          </div>

          <Field label="Texto da solicitação">
            <Textarea rows={3} value={form.texto} onChange={set("texto")} />
          </Field>

          <div className="space-y-3">
            <p className="text-sm font-medium">Dados do cliente <span className="font-normal text-muted-foreground">(só para este PDF)</span></p>
            <FieldGrid cols={2}>
              <InputField label="Cliente" required value={form.name} onChange={set("name")} />
              <InputField label="NIF" value={form.nif} onChange={set("nif")} />
              <InputField label="Telefone" value={form.phone} onChange={set("phone")} />
              <InputField label="E-mail" type="email" value={form.email} onChange={set("email")} />
            </FieldGrid>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_11rem]">
              <InputField label="Morada" value={form.address} onChange={set("address")} />
              <InputField label="Código postal / localidade" value={form.postalCode} onChange={set("postalCode")} />
            </div>
          </div>

          <Field label="Nota">
            <Textarea rows={2} value={form.nota} onChange={set("nota")} />
          </Field>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!valid || generating}>
              {generating ? <Loader2 className="animate-spin" /> : <FileText />}
              Gerar PDF
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SolicitarFaturaDialog;
