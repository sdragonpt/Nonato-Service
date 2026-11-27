// ManageEmailCampaigns.jsx — "E-mails para Clientes".
//
// Escrever um e-mail (avisos, promoções, máquinas à venda…), ver como fica,
// mandar um teste para o próprio e depois enviar a todos os clientes com
// e-mail (ou só a um grupo). O envio é feito no servidor pela Cloud Function
// enviarCampanhaEmail (functions/index.js), que só aceita administradores e gestores,
// salta quem pediu para não receber e põe em cada e-mail o link pessoal para
// deixar de receber.
//
// Coleção "campanhasEmail": { nome, assunto, preheader, titulo, saudacao,
// texto, imagemUrl, botaoTexto, botaoUrl, grupoId, html, estado
// ("rascunho" | "a_enviar" | "enviada" — os dois últimos só pelo servidor),
// enviados, falhados, destinatarios, criadaEm, enviadaEm }.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  CheckCircle2,
  Copy,
  ImagePlus,
  Loader2,
  Mail,
  Plus,
  Save,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { db, firebaseApp } from "../../firebase.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Switch } from "@/components/ui/switch.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import {
  PageHeader,
  FormSection,
  Field,
  FieldGrid,
  EmptyState,
  PageLoader,
  useConfirm,
} from "../../components/app";
import { useClients } from "../../context/ClientsContext.jsx";
import { useGroups, GROUP_KINDS } from "../../services/groupsStore.js";
import { uploadPartImage } from "../../services/partEdits.js";
import { formatDate } from "../../utils/formatDate.js";
import { buildEmailHtml, EMPTY_CAMPAIGN, PRESETS, PRESET_WEBSITE, safeUrl } from "./emailTemplate.js";

const COL = "campanhasEmail";
const ALL = "__todos__";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Plano grátis do Brevo: 300 e-mails por dia.
const DAILY_LIMIT = 300;

const sendFn = () =>
  httpsCallable(getFunctions(firebaseApp, "europe-west1"), "enviarCampanhaEmail", { timeout: 540000 });

const FIELDS = Object.keys(EMPTY_CAMPAIGN);
const pickFields = (c) => Object.fromEntries(FIELDS.map((k) => [k, c?.[k] ?? EMPTY_CAMPAIGN[k]]));

const ManageEmailCampaigns = () => {
  const confirm = useConfirm();
  const { ensureClients } = useClients();
  const { groups } = useGroups(GROUP_KINDS.SERVICOS);

  const [campaigns, setCampaigns] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(PRESET_WEBSITE);
  const [grupoId, setGrupoId] = useState(ALL);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(null); // "save" | "test" | "send" | "image"
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    Promise.all([
      getDocs(query(collection(db, COL), orderBy("criadaEm", "desc"))).then((s) =>
        setCampaigns(s.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
      ensureClients().then((list) => setClients(list || [])),
    ])
      .catch((err) => {
        console.error("Erro ao carregar campanhas:", err);
        setError("Não foi possível carregar as campanhas.");
      })
      .finally(() => setLoading(false));
  }, [ensureClients]);

  // Quem recebe: mesmas regras que o servidor (functions/index.js).
  const audience = useMemo(() => {
    const seen = new Set();
    let semEmail = 0;
    let optOut = 0;
    for (const c of clients) {
      if (c.eliminadoEm) continue;
      if (grupoId !== ALL && !(c.grupoIds || []).includes(grupoId)) continue;
      const email = String(c.email || "").trim().toLowerCase();
      if (!EMAIL_RE.test(email)) { semEmail += 1; continue; }
      if (c.emailOptOut) { optOut += 1; continue; }
      seen.add(email);
    }
    return { total: seen.size, semEmail, optOut };
  }, [clients, grupoId]);

  const html = useMemo(() => buildEmailHtml(form), [form]);
  const previewHtml = useMemo(
    () => html.replaceAll("{{NOME}}", "Cliente").replaceAll("{{CANCELAR_URL}}", "#"),
    [html]
  );

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  const editing = campaigns.find((c) => c.id === editingId);
  const locked = editing && editing.estado && editing.estado !== "rascunho";

  const problems = [];
  if (!form.assunto.trim()) problems.push("o assunto");
  if (!form.titulo.trim()) problems.push("o título");
  if (!form.texto.trim()) problems.push("o texto");
  if (form.botaoTexto.trim() && !safeUrl(form.botaoUrl)) problems.push("um link válido para o botão");

  const resetTo = (data) => {
    setForm({ ...EMPTY_CAMPAIGN, ...data });
    setEditingId(null);
    setGrupoId(ALL);
    setNotice(null);
    setError(null);
  };

  /** Guarda (cria ou atualiza o rascunho) e devolve o id. */
  const save = async () => {
    const payload = {
      ...pickFields(form),
      grupoId: grupoId === ALL ? null : grupoId,
      html,
      atualizadaEm: serverTimestamp(),
    };
    if (editingId && !locked) {
      await updateDoc(doc(db, COL, editingId), payload);
      setCampaigns((prev) => prev.map((c) => (c.id === editingId ? { ...c, ...payload } : c)));
      return editingId;
    }
    const data = { ...payload, estado: "rascunho", criadaEm: serverTimestamp() };
    const ref = await addDoc(collection(db, COL), data);
    setCampaigns((prev) => [{ id: ref.id, ...data, criadaEm: new Date() }, ...prev]);
    setEditingId(ref.id);
    return ref.id;
  };

  const run = async (kind, fn) => {
    setBusy(kind);
    setError(null);
    setNotice(null);
    try {
      await fn();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Ocorreu um erro. Tente novamente.");
    } finally {
      setBusy(null);
    }
  };

  const onSave = () => run("save", async () => {
    await save();
    setNotice("Rascunho guardado.");
  });

  const onTest = () => run("test", async () => {
    if (problems.length) throw new Error(`Falta ${problems.join(", ")}.`);
    const id = await save();
    const res = await sendFn()({ campanhaId: id, teste: true });
    setNotice(`E-mail de teste enviado para ${res.data?.para}. Veja como ficou antes de enviar a todos.`);
  });

  const onSend = () => run("send", async () => {
    if (problems.length) throw new Error(`Falta ${problems.join(", ")}.`);
    if (!audience.total) throw new Error("Não há clientes com e-mail para receber esta campanha.");
    const grupo = grupoId === ALL ? "todos os clientes" : `o grupo “${groups.find((g) => g.id === grupoId)?.nome}”`;
    const ok = await confirm({
      title: `Enviar a ${audience.total} cliente(s)?`,
      description:
        `O e-mail “${form.assunto}” vai para ${grupo} com e-mail. Depois de enviado não dá para voltar atrás.` +
        (audience.total > DAILY_LIMIT
          ? ` Atenção: são mais de ${DAILY_LIMIT}, o limite diário do plano grátis do Brevo — os restantes podem falhar.`
          : ""),
      confirmLabel: "Enviar",
    });
    if (!ok) return;
    const id = await save();
    const res = await sendFn()({ campanhaId: id });
    const { enviados = 0, falhados = 0, destinatarios = 0 } = res.data || {};
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, estado: "enviada", enviados, falhados, destinatarios, enviadaEm: new Date() } : c))
    );
    setNotice(`Enviado: ${enviados} de ${destinatarios}${falhados ? ` (${falhados} falharam)` : ""}.`);
  });

  const onImage = (file) => run("image", async () => {
    if (!file) return;
    const url = await uploadPartImage("_campanhas", file);
    setForm((f) => ({ ...f, imagemUrl: url }));
  });

  const open = (c) => {
    setForm(pickFields(c));
    setGrupoId(c.grupoId || ALL);
    setEditingId(c.id);
    setNotice(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const duplicate = (c) => resetTo({ ...pickFields(c), nome: `${c.nome || c.assunto} (cópia)` });

  const remove = async (c) => {
    const ok = await confirm({
      title: "Apagar esta campanha?",
      description: "Apaga só o registo na app. E-mails já enviados não são afetados.",
      confirmLabel: "Apagar",
      destructive: true,
    });
    if (!ok) return;
    await deleteDoc(doc(db, COL, c.id));
    setCampaigns((prev) => prev.filter((x) => x.id !== c.id));
    if (editingId === c.id) resetTo(EMPTY_CAMPAIGN);
  };

  if (loading) return <PageLoader label="A carregar…" />;

  return (
    <div className="space-y-6 pb-24 sm:pb-6">
      <PageHeader
        icon={Mail}
        title="E-mails para Clientes"
        description="Avisos, promoções e máquinas à venda — enviados a todos os clientes com e-mail"
        actions={
          <Button variant="outline" onClick={() => resetTo(EMPTY_CAMPAIGN)}>
            <Plus /> Novo e-mail
          </Button>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}
      {locked && (
        <Alert>
          <AlertDescription>
            Esta campanha já foi enviada. Pode ver como ficou; para mandar algo parecido use “Duplicar”.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <FormSection
            title="Conteúdo"
            icon={Mail}
            actions={
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <Button key={p.label} size="sm" variant="ghost" onClick={() => resetTo(p.data)}>
                    {p.label}
                  </Button>
                ))}
              </div>
            }
          >
            <fieldset disabled={locked} className="space-y-4">
              <Field label="Assunto" hint="O que aparece na caixa de entrada" required>
                <Input value={form.assunto} onChange={set("assunto")} maxLength={150} />
              </Field>
              <Field label="Texto de pré-visualização" hint="A linha cinzenta que aparece a seguir ao assunto">
                <Input value={form.preheader} onChange={set("preheader")} maxLength={200} />
              </Field>
              <Field label="Título" required>
                <Input value={form.titulo} onChange={set("titulo")} maxLength={150} />
              </Field>
              <div className="flex items-center gap-3">
                <Switch checked={!!form.saudacao} onCheckedChange={set("saudacao")} id="saudacao" />
                <label htmlFor="saudacao" className="text-sm">Começar com “Olá &lt;nome do cliente&gt;,”</label>
              </div>
              <Field label="Texto" hint="Deixe uma linha em branco para começar um parágrafo novo" required>
                <Textarea value={form.texto} onChange={set("texto")} rows={9} />
              </Field>

              <Field label="Imagem (opcional)" hint="Ex.: fotografia da máquina à venda ou do website">
                {form.imagemUrl ? (
                  <div className="relative w-fit">
                    <img src={form.imagemUrl} alt="" className="max-h-40 rounded-lg border border-border" />
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute right-1 top-1 h-7 w-7"
                      onClick={() => setForm((f) => ({ ...f, imagemUrl: "" }))}
                      aria-label="Tirar imagem"
                    >
                      <X />
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy === "image"}>
                    {busy === "image" ? <Loader2 className="animate-spin" /> : <ImagePlus />} Escolher imagem
                  </Button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    onImage(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </Field>

              <FieldGrid>
                <Field label="Texto do botão (opcional)">
                  <Input value={form.botaoTexto} onChange={set("botaoTexto")} maxLength={60} />
                </Field>
                <Field label="Link do botão">
                  <Input value={form.botaoUrl} onChange={set("botaoUrl")} placeholder="https://nonatoservice.pt" />
                </Field>
              </FieldGrid>
              <Field label="Nome interno" hint="Só para encontrar a campanha no histórico">
                <Input value={form.nome} onChange={set("nome")} maxLength={100} />
              </Field>
            </fieldset>
          </FormSection>

          <FormSection title="Destinatários" icon={Users}>
            <fieldset disabled={locked} className="space-y-3">
              <Select value={grupoId} onValueChange={setGrupoId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos os clientes</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>Grupo: {g.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm">
                <strong className="text-primary">{audience.total}</strong> cliente(s) vão receber.
                <span className="text-muted-foreground">
                  {" "}{audience.semEmail} sem e-mail na ficha · {audience.optOut} pediram para não receber.
                </span>
              </p>
              {audience.total > DAILY_LIMIT && (
                <p className="text-sm text-amber-400">
                  Mais de {DAILY_LIMIT} destinatários: o plano grátis do Brevo só envia {DAILY_LIMIT} por dia.
                </p>
              )}
            </fieldset>
          </FormSection>

          {!locked && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={onSave} disabled={!!busy}>
                {busy === "save" ? <Loader2 className="animate-spin" /> : <Save />} Guardar rascunho
              </Button>
              <Button variant="outline" onClick={onTest} disabled={!!busy}>
                {busy === "test" ? <Loader2 className="animate-spin" /> : <Mail />} Enviar teste para mim
              </Button>
              <Button onClick={onSend} disabled={!!busy || !audience.total} className="sm:ml-auto">
                {busy === "send" ? <Loader2 className="animate-spin" /> : <Send />}
                {busy === "send" ? "A enviar…" : `Enviar a ${audience.total} cliente(s)`}
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-2 xl:sticky xl:top-4 xl:self-start">
          <p className="text-sm text-muted-foreground">Pré-visualização</p>
          <div className="overflow-hidden rounded-xl border border-border bg-white">
            <div className="border-b bg-neutral-50 px-4 py-2 text-sm text-neutral-800">
              <strong>{form.assunto || "(sem assunto)"}</strong>
              <span className="text-neutral-500"> — {form.preheader}</span>
            </div>
            <iframe
              title="Pré-visualização do e-mail"
              srcDoc={previewHtml}
              sandbox=""
              className="h-[720px] w-full"
            />
          </div>
        </div>
      </div>

      <FormSection title="Histórico" icon={Mail}>
        {campaigns.length === 0 ? (
          <EmptyState icon={Mail} title="Ainda não foram criados e-mails" description="Os rascunhos e envios aparecem aqui." />
        ) : (
          <div className="divide-y divide-border">
            {campaigns.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                <button type="button" onClick={() => open(c)} className="min-w-0 flex-1 text-left">
                  <p className="truncate font-medium">{c.nome || c.assunto || "(sem nome)"}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {c.assunto} · {formatDate(c.enviadaEm || c.criadaEm)}
                  </p>
                </button>
                {c.estado === "enviada" ? (
                  <Badge variant={c.falhados ? "warning" : "success"}>
                    Enviada · {c.enviados}/{c.destinatarios}
                    {c.falhados ? ` · ${c.falhados} falharam` : ""}
                  </Badge>
                ) : c.estado === "a_enviar" ? (
                  <Badge variant="info">A enviar…</Badge>
                ) : (
                  <Badge variant="secondary">Rascunho</Badge>
                )}
                <Button size="sm" variant="ghost" onClick={() => duplicate(c)}>
                  <Copy /> Duplicar
                </Button>
                {c.estado !== "a_enviar" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-red-400"
                    onClick={() => remove(c)}
                    aria-label="Apagar"
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </FormSection>
    </div>
  );
};

export default ManageEmailCampaigns;
