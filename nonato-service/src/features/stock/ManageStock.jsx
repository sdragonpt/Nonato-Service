// ManageStock.jsx - Stock interno de peças da Nonato Service
// (o "Almoxarifado / Armazém" é para máquinas; isto é para as peças que a
// empresa tem em prateleira). Dados em services/stockService.js.

import { useState, useEffect, useMemo, useRef } from "react";
import {
  subscribeStock,
  newStockItemId,
  createStockItem,
  updateStockItem,
  deleteStockItem,
  moveStock,
  setStockQuantity,
  loadStockMovements,
} from "../../services/stockService.js";
import { searchCatalogParts } from "../../utils/catalogPartSearch.js";
import { searchIncludes } from "../../utils/normalizeSearch.js";
import { comparePtPt } from "../../utils/sortHelpers.js";
import PartImage from "../../components/ui/PartImage.jsx";
import {
  Boxes,
  Plus,
  Minus,
  Search,
  Loader2,
  AlertTriangle,
  MoreVertical,
  Pencil,
  Trash2,
  History,
  ClipboardCheck,
  MapPin,
  X,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx";

const fieldClass = "bg-zinc-900 border-zinc-700 text-white";

const isLow = (item) => item.minimo > 0 && item.quantidade <= item.minimo;

// Miniatura com zoom ao passar o rato (igual à Biblioteca de Peças).
const StockImage = ({ item }) => (
  <div className="relative shrink-0 h-16 w-16">
    <div className="absolute inset-0 rounded-lg overflow-hidden bg-zinc-900 origin-left transition-transform duration-200 ease-out hover:z-30 hover:scale-[3] hover:shadow-2xl hover:ring-1 hover:ring-zinc-600">
      <PartImage
        src={item.imagem || null}
        alt={item.nome}
        className="w-full h-full object-contain"
        defaultImage="/default-part.png"
      />
    </div>
  </div>
);

// ─── Criar / editar artigo ─────────────────────────────────────────────

const emptyForm = { codigo: "", nome: "", imagem: "", quantidade: "0", minimo: "0", localizacao: "", notas: "" };

const ItemFormDialog = ({ open, onOpenChange, item, existingCodes }) => {
  const isEdit = Boolean(item);
  const [form, setForm] = useState(emptyForm);
  const [catalogTerm, setCatalogTerm] = useState("");
  const [catalogResults, setCatalogResults] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setForm(
      item
        ? { ...emptyForm, ...item, quantidade: String(item.quantidade), minimo: String(item.minimo || 0) }
        : emptyForm
    );
    setCatalogTerm("");
    setCatalogResults([]);
    setError(null);
  }, [open, item]);

  // Pesquisa no catálogo HOMAG para preencher código, nome e imagem.
  useEffect(() => {
    if (catalogTerm.trim().length < 2) {
      setCatalogResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      searchCatalogParts(catalogTerm, { limit: 8 }).then((r) => {
        if (!cancelled) setCatalogResults(r);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [catalogTerm]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const pickCatalogPart = (p) => {
    setForm((f) => ({ ...f, codigo: p.code, nome: p.name, imagem: p.image || "" }));
    setCatalogTerm("");
    setCatalogResults([]);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      setError("O nome é obrigatório.");
      return;
    }
    const codigo = form.codigo.trim();
    if (codigo && existingCodes.has(codigo) && codigo !== item?.codigo) {
      setError(`Já existe um artigo com o código ${codigo}. Dê entrada nesse artigo em vez de criar outro.`);
      return;
    }
    try {
      setSaving(true);
      setError(null);
      if (isEdit) await updateStockItem(item.id, form);
      else await createStockItem(newStockItemId(), form);
      onOpenChange(false);
    } catch (err) {
      console.error("Erro ao guardar artigo de stock:", err);
      setError("Não foi possível guardar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-800 border-zinc-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar artigo" : "Novo artigo de stock"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!isEdit && (
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">
                Procurar no catálogo HOMAG (preenche código, nome e imagem)
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  value={catalogTerm}
                  onChange={(e) => setCatalogTerm(e.target.value)}
                  placeholder="Nome ou código da peça"
                  className={`${fieldClass} pl-9`}
                />
              </div>
              {catalogResults.length > 0 && (
                <ul className="rounded-md border border-zinc-700 divide-y divide-zinc-700 max-h-56 overflow-y-auto">
                  {catalogResults.map((p) => (
                    <li key={p.code}>
                      <button
                        type="button"
                        onClick={() => pickCatalogPart(p)}
                        className="w-full text-left px-3 py-2 hover:bg-zinc-700 text-sm"
                      >
                        <span className="text-white">{p.name}</span>
                        <span className="block text-xs text-zinc-400">{p.code}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm text-zinc-400">Nome *</label>
              <Input value={form.nome} onChange={set("nome")} className={fieldClass} />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-zinc-400">Código</label>
              <Input value={form.codigo} onChange={set("codigo")} className={fieldClass} />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-zinc-400">Localização (prateleira)</label>
              <Input
                value={form.localizacao}
                onChange={set("localizacao")}
                placeholder="Ex: A3"
                className={fieldClass}
              />
            </div>
            {!isEdit && (
              <div className="space-y-1">
                <label className="text-sm text-zinc-400">Quantidade atual</label>
                <Input type="number" min="0" value={form.quantidade} onChange={set("quantidade")} className={fieldClass} />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm text-zinc-400">Stock mínimo (alerta)</label>
              <Input type="number" min="0" value={form.minimo} onChange={set("minimo")} className={fieldClass} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm text-zinc-400">Notas</label>
              <Textarea value={form.notas} onChange={set("notas")} rows={2} className={fieldClass} />
            </div>
          </div>

          {isEdit && (
            <p className="text-xs text-zinc-500">
              A quantidade muda com Entrada, Saída ou Acerto de inventário, para ficar no histórico.
            </p>
          )}

          {error && (
            <Alert variant="destructive" className="border-red-500 bg-red-500/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-400">{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-zinc-600 bg-zinc-900 text-white hover:bg-zinc-700">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Entrada / saída / acerto ──────────────────────────────────────────

const MOVE_LABELS = {
  entrada: { title: "Entrada de stock", qty: "Quantidade que entrou", button: "Dar entrada" },
  saida: { title: "Saída de stock", qty: "Quantidade que saiu", button: "Dar saída" },
  acerto: { title: "Acerto de inventário", qty: "Quantidade contada na prateleira", button: "Guardar contagem" },
};

const MoveDialog = ({ open, onOpenChange, item, mode }) => {
  const [qty, setQty] = useState("1");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !item) return;
    setQty(mode === "acerto" ? String(item.quantidade) : "1");
    setMotivo("");
    setError(null);
  }, [open, item, mode]);

  if (!item) return null;
  const labels = MOVE_LABELS[mode];

  const handleSave = async () => {
    const n = Number(qty);
    if (!Number.isFinite(n) || n < 0 || (mode !== "acerto" && n <= 0)) {
      setError("Indique uma quantidade válida.");
      return;
    }
    if (mode === "saida" && n > item.quantidade) {
      setError(`Só há ${item.quantidade} em stock.`);
      return;
    }
    try {
      setSaving(true);
      setError(null);
      if (mode === "acerto") await setStockQuantity(item, n, motivo);
      else await moveStock(item, mode === "entrada" ? n : -n, motivo);
      onOpenChange(false);
    } catch (err) {
      console.error("Erro no movimento de stock:", err);
      setError("Não foi possível guardar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-800 border-zinc-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="font-medium">{item.nome}</p>
            <p className="text-sm text-zinc-400">
              {item.codigo && `${item.codigo} · `}Em stock: {item.quantidade}
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-zinc-400">{labels.qty}</label>
            <Input
              type="number"
              min="0"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className={fieldClass}
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-zinc-400">
              Motivo {mode === "saida" ? "(ex: OS 123, cliente…)" : "(opcional)"}
            </label>
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} className={fieldClass} />
          </div>
          {error && (
            <Alert variant="destructive" className="border-red-500 bg-red-500/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-400">{error}</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-zinc-600 bg-zinc-900 text-white hover:bg-zinc-700">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {labels.button}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Histórico ─────────────────────────────────────────────────────────

const TIPO_LABEL = {
  criacao: { text: "Criado", cls: "bg-zinc-700 text-zinc-300" },
  entrada: { text: "Entrada", cls: "bg-green-500/15 text-green-400" },
  saida: { text: "Saída", cls: "bg-red-500/15 text-red-400" },
  acerto: { text: "Acerto", cls: "bg-blue-500/15 text-blue-400" },
};

const HistoryDialog = ({ open, onOpenChange, item }) => {
  const [moves, setMoves] = useState(null);

  useEffect(() => {
    if (!open || !item) return;
    setMoves(null);
    loadStockMovements(item.id)
      .then(setMoves)
      .catch((err) => {
        console.error("Erro ao ler histórico:", err);
        setMoves([]);
      });
  }, [open, item]);

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-800 border-zinc-700 text-white max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico — {item.nome}</DialogTitle>
        </DialogHeader>
        {moves === null ? (
          <div className="flex items-center gap-2 text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" /> A carregar…
          </div>
        ) : moves.length === 0 ? (
          <p className="text-zinc-400">Sem movimentos.</p>
        ) : (
          <ul className="divide-y divide-zinc-700">
            {moves.map((m) => {
              const t = TIPO_LABEL[m.tipo] || TIPO_LABEL.acerto;
              const sign = m.tipo === "saida" ? "−" : m.tipo === "acerto" && m.quantidade < 0 ? "" : "+";
              return (
                <li key={m.id} className="py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <Badge className={t.cls}>{t.text}</Badge>
                    <span className="text-white font-medium">
                      {sign}
                      {m.quantidade} → {m.quantidadeFinal}
                    </span>
                  </div>
                  <p className="text-zinc-400 mt-1">
                    {m.data ? m.data.toLocaleString("pt-PT") : ""}
                    {m.utilizador && ` · ${m.utilizador}`}
                  </p>
                  {m.motivo && <p className="text-zinc-300">{m.motivo}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ─── Página ────────────────────────────────────────────────────────────

const ManageStock = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [moveState, setMoveState] = useState({ open: false, item: null, mode: "entrada" });
  const [historyItem, setHistoryItem] = useState(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(
    () =>
      subscribeStock(
        (list) => {
          setItems(list);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error("Erro ao carregar stock:", err);
          setError("Não foi possível carregar o stock.");
          setLoading(false);
        }
      ),
    []
  );

  // Os diálogos abertos acompanham as alterações em tempo real.
  const liveItem = (item) => (item ? itemsRef.current.find((i) => i.id === item.id) || item : null);

  const existingCodes = useMemo(
    () => new Set(items.map((i) => i.codigo).filter(Boolean)),
    [items]
  );

  const stats = useMemo(
    () => ({
      artigos: items.length,
      unidades: items.reduce((s, i) => s + i.quantidade, 0),
      baixo: items.filter(isLow).length,
      semStock: items.filter((i) => i.quantidade <= 0).length,
    }),
    [items]
  );

  const visible = useMemo(() => {
    let list = items;
    if (filter === "low") list = list.filter(isLow);
    else if (filter === "empty") list = list.filter((i) => i.quantidade <= 0);
    const t = search.trim();
    if (t) {
      list = list.filter(
        (i) => searchIncludes(i.nome, t) || searchIncludes(i.codigo, t) || searchIncludes(i.localizacao, t)
      );
    }
    return [...list].sort((a, b) => comparePtPt(a.nome, b.nome));
  }, [items, filter, search]);

  const openMove = (item, mode) => setMoveState({ open: true, item, mode });

  const handleDelete = async (item) => {
    if (!window.confirm(`Apagar "${item.nome}" do stock? O histórico de movimentos fica guardado.`)) return;
    try {
      await deleteStockItem(item.id);
    } catch (err) {
      console.error("Erro ao apagar artigo:", err);
      setError("Não foi possível apagar o artigo.");
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <Boxes className="h-6 w-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Stock Interno de Peças</h1>
            <p className="text-zinc-400">Peças que a Nonato Service tem em armazém.</p>
          </div>
        </div>
        <Button
          onClick={() => {
            setEditItem(null);
            setFormOpen(true);
          }}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo artigo
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ["Artigos", stats.artigos, "text-white"],
          ["Unidades em stock", stats.unidades, "text-white"],
          ["Abaixo do mínimo", stats.baixo, stats.baixo ? "text-amber-400" : "text-white"],
          ["Sem stock", stats.semStock, stats.semStock ? "text-red-400" : "text-white"],
        ].map(([label, value, cls]) => (
          <Card key={label} className="bg-zinc-800 border-zinc-700">
            <CardContent className="p-4">
              <p className="text-sm text-zinc-400">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${cls}`}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : value.toLocaleString("pt-PT")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_16rem] gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Procurar por nome, código ou prateleira"
            className={`${fieldClass} pl-9 pr-9`}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              aria-label="Limpar pesquisa"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className={fieldClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="all" className="text-white">Todos os artigos</SelectItem>
            <SelectItem value="low" className="text-white">Abaixo do mínimo</SelectItem>
            <SelectItem value="empty" className="text-white">Sem stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" /> A carregar stock…
        </div>
      ) : visible.length === 0 ? (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-8 text-center text-zinc-400">
            {items.length === 0
              ? "Ainda não há artigos. Carregue em \"Novo artigo\" para começar."
              : "Nenhum artigo corresponde à pesquisa."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {visible.map((item) => (
            <Card key={item.id} className="bg-zinc-800 border-zinc-700">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <StockImage item={item} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{item.nome}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400 mt-0.5">
                      {item.codigo && <span>Código: {item.codigo}</span>}
                      {item.localizacao && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {item.localizacao}
                        </span>
                      )}
                      {item.minimo > 0 && <span>Mínimo: {item.minimo}</span>}
                    </div>
                  </div>

                  <div className="text-center shrink-0 w-16">
                    <p
                      className={`text-2xl font-bold ${
                        item.quantidade <= 0 ? "text-red-400" : isLow(item) ? "text-amber-400" : "text-white"
                      }`}
                    >
                      {item.quantidade}
                    </p>
                    <p className="text-[11px] text-zinc-500">em stock</p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      title="Dar saída"
                      onClick={() => openMove(item, "saida")}
                      disabled={item.quantidade <= 0}
                      className="h-9 w-9 bg-red-600/80 hover:bg-red-600 text-white"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      title="Dar entrada"
                      onClick={() => openMove(item, "entrada")}
                      className="h-9 w-9 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-zinc-700">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-zinc-800 border-zinc-700">
                        <DropdownMenuItem onClick={() => setHistoryItem(item)} className="text-white hover:bg-zinc-700 cursor-pointer">
                          <History className="h-4 w-4 mr-2" /> Histórico
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openMove(item, "acerto")} className="text-white hover:bg-zinc-700 cursor-pointer">
                          <ClipboardCheck className="h-4 w-4 mr-2" /> Acerto de inventário
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditItem(item);
                            setFormOpen(true);
                          }}
                          className="text-white hover:bg-zinc-700 cursor-pointer"
                        >
                          <Pencil className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(item)} className="text-red-400 hover:bg-zinc-700 cursor-pointer">
                          <Trash2 className="h-4 w-4 mr-2" /> Apagar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ItemFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editItem}
        existingCodes={existingCodes}
      />
      <MoveDialog
        open={moveState.open}
        onOpenChange={(open) => setMoveState((s) => ({ ...s, open }))}
        item={liveItem(moveState.item)}
        mode={moveState.mode}
      />
      <HistoryDialog
        open={Boolean(historyItem)}
        onOpenChange={(open) => !open && setHistoryItem(null)}
        item={historyItem}
      />
    </div>
  );
};

export default ManageStock;
