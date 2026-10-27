// ServiceGroups.jsx
// Grupos de serviços como tabelas de preços (ex.: "HOMAG"). Dentro de cada
// grupo escolhem-se os serviços/despesas do catálogo e o valor de cada um
// nesse grupo. O catálogo é partilhado: um serviço criado aqui fica
// disponível para os outros grupos, cada um com o seu valor.
// Modelo de dados em services/groupsStore.js.

import { useEffect, useMemo, useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import {
  Copy,
  Euro,
  FolderOpen,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
  Check,
  ListPlus,
} from "lucide-react";
import { db } from "../../../firebase.jsx";
import { comparePtPt } from "../../../utils/sortHelpers.js";
import {
  GROUP_KINDS,
  createGroup,
  renameGroup,
  deleteGroup,
  setGroupPrice,
  removeFromGroup,
} from "../../../services/groupsStore.js";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { EmptyState, SearchInput, useConfirm } from "../../../components/app";

const KIND = GROUP_KINDS.SERVICOS;
const NEW = "__novo__";

export const SERVICE_TYPES = [
  ["hour", "Por hora", "/hora"],
  ["day", "Por dia", "/dia"],
  ["km", "Por km", "/km"],
  ["base", "Valor base", ""],
  ["un", "Despesa", "/un."],
];
export const unitSuffix = (type) => SERVICE_TYPES.find(([t]) => t === type)?.[2] ?? "";
export const typeLabel = (type) => SERVICE_TYPES.find(([t]) => t === type)?.[1] ?? type;

// Campo de valor que só grava ao sair do campo (ou Enter) — evita uma
// escrita por cada tecla.
const PriceInput = ({ value, onSave, suffix, autoFocus }) => {
  const [draft, setDraft] = useState(value ?? "");
  useEffect(() => setDraft(value ?? ""), [value]);
  const commit = () => {
    const next = draft === "" ? null : Number(String(draft).replace(",", "."));
    if (next !== (value ?? null) && !Number.isNaN(next)) onSave(next);
  };
  return (
    <div className="relative w-36 shrink-0">
      <Euro className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        inputMode="decimal"
        value={draft}
        autoFocus={autoFocus}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), e.currentTarget.blur())}
        placeholder="—"
        className="h-9 pl-7 pr-12 text-right tabular-nums"
        aria-label="Valor neste grupo"
      />
      {suffix && (
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  );
};

/**
 * Campo dos formulários de serviço: em que grupos entra e com que valor.
 * `value` = { [groupId]: valor | null } (só os grupos escolhidos).
 */
export const ServiceGroupPricesField = ({ groups, value, onChange, type }) => {
  const suffix = unitSuffix(type);
  const toggle = (id) => {
    const next = { ...value };
    if (id in next) delete next[id];
    else next[id] = null;
    onChange(next);
  };
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">Grupos e valores</label>
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ainda não há grupos. Crie-os em Serviços › Grupos e valores.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {groups.map((g) => {
            const on = g.id in value;
            return (
              <li key={g.id} className="flex items-center gap-3 px-3 py-2">
                <button
                  type="button"
                  onClick={() => toggle(g.id)}
                  aria-pressed={on}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                    on ? "border-primary bg-primary text-primary-foreground" : "border-input"
                  }`}
                >
                  {on && <Check className="h-3.5 w-3.5" />}
                </button>
                <button type="button" onClick={() => toggle(g.id)} className="flex-1 truncate text-left text-sm">
                  {g.nome}
                </button>
                {on && (
                  <div className="relative w-36">
                    <Euro className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      inputMode="decimal"
                      value={value[g.id] ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value.replace(",", ".");
                        onChange({ ...value, [g.id]: raw === "" ? null : raw });
                      }}
                      placeholder="Valor"
                      className="h-9 pl-7 pr-12 text-right tabular-nums"
                    />
                    {suffix && (
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        {suffix}
                      </span>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        O mesmo serviço pode estar em vários grupos, com um valor diferente em cada um.
      </p>
    </div>
  );
};

/** Grava as diferenças entre os valores atuais dos grupos e os escolhidos no formulário. */
export async function saveServiceGroupPrices(serviceId, groups, chosen) {
  const ops = [];
  for (const g of groups) {
    const was = serviceId in g.precos;
    const now = g.id in chosen;
    if (now) {
      const v = chosen[g.id] === null || chosen[g.id] === "" ? null : Number(chosen[g.id]);
      if (!was || (g.precos[serviceId] ?? null) !== (Number.isNaN(v) ? null : v)) {
        ops.push(setGroupPrice(KIND, g.id, serviceId, v));
      }
    } else if (was) {
      ops.push(removeFromGroup(KIND, g.id, serviceId));
    }
  }
  await Promise.all(ops);
}

const ServiceGroups = ({ services, groups, loading }) => {
  const confirm = useConfirm();
  const [selectedId, setSelectedId] = useState(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [renaming, setRenaming] = useState(null); // { id, nome }
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Linha "adicionar ao grupo"
  const [addId, setAddId] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("hour");

  const selected = groups.find((g) => g.id === selectedId) || groups[0] || null;
  const servicesById = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);

  const items = useMemo(() => {
    if (!selected) return [];
    const term = search.trim().toLowerCase();
    return Object.entries(selected.precos)
      .map(([id, valor]) => ({ service: servicesById.get(id), id, valor }))
      .filter((i) => i.service && (!term || i.service.name.toLowerCase().includes(term)))
      .sort((a, b) => comparePtPt(a.service.name, b.service.name));
  }, [selected, servicesById, search]);

  const available = useMemo(
    () =>
      selected
        ? services
            .filter((s) => !(s.id in selected.precos))
            .sort((a, b) => comparePtPt(a.name, b.name))
        : [],
    [services, selected]
  );

  // Valores do mesmo serviço noutros grupos — ajuda a reaproveitar.
  const otherPrices = (serviceId) =>
    groups
      .filter((g) => g.id !== selected?.id && g.precos[serviceId] != null)
      .map((g) => `${g.nome}: ${g.precos[serviceId]}€`);

  const run = async (fn) => {
    try {
      setBusy(true);
      setError(null);
      await fn();
    } catch (err) {
      console.error("Erro nos grupos de serviços:", err);
      setError("Não foi possível gravar. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  const nameTaken = (nome, exceptId) =>
    groups.some((g) => g.id !== exceptId && g.nome.trim().toLowerCase() === nome.trim().toLowerCase());

  const handleCreateGroup = (e) => {
    e.preventDefault();
    const nome = newGroupName.trim();
    if (!nome) return;
    if (nameTaken(nome)) return setError(`Já existe o grupo "${nome}".`);
    run(async () => {
      const id = await createGroup(KIND, nome);
      setNewGroupName("");
      setSelectedId(id);
    });
  };

  const handleDuplicate = (g) => {
    let nome = `${g.nome} (cópia)`;
    for (let i = 2; nameTaken(nome); i++) nome = `${g.nome} (cópia ${i})`;
    run(async () => setSelectedId(await createGroup(KIND, nome, g.precos)));
  };

  const handleRename = () => {
    const nome = renaming?.nome.trim();
    if (!nome) return;
    if (nameTaken(nome, renaming.id)) return setError(`Já existe o grupo "${nome}".`);
    run(async () => {
      await renameGroup(KIND, renaming.id, nome);
      setRenaming(null);
    });
  };

  const handleDeleteGroup = async (g) => {
    const ok = await confirm({
      title: `Apagar o grupo "${g.nome}"?`,
      description: "Os serviços continuam no catálogo e nos outros grupos; só se perdem os valores deste grupo.",
      confirmLabel: "Apagar grupo",
      destructive: true,
    });
    if (!ok) return;
    run(async () => {
      await deleteGroup(KIND, g.id);
      setSelectedId(null);
    });
  };

  const handleRemoveItem = async (item) => {
    const ok = await confirm({
      title: `Tirar "${item.service.name}" de ${selected.nome}?`,
      description: "O serviço continua no catálogo e nos outros grupos.",
      confirmLabel: "Tirar do grupo",
      destructive: true,
    });
    if (ok) run(() => removeFromGroup(KIND, selected.id, item.id));
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!selected) return;
    const price = addPrice === "" ? null : Number(String(addPrice).replace(",", "."));
    if (addId === NEW) {
      const name = newName.trim();
      if (!name) return;
      if (services.some((s) => s.name.trim().toLowerCase() === name.toLowerCase())) {
        return setError(`"${name}" já existe no catálogo — escolha-o na lista em vez de o criar outra vez.`);
      }
      run(async () => {
        const ref = await addDoc(collection(db, "servicos"), {
          name,
          type: newType,
          description: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await setGroupPrice(KIND, selected.id, ref.id, price);
        setNewName("");
        setAddPrice("");
        setAddId("");
      });
    } else if (addId) {
      run(async () => {
        await setGroupPrice(KIND, selected.id, addId, price);
        setAddId("");
        setAddPrice("");
      });
    }
  };

  const addSuffix = addId === NEW ? unitSuffix(newType) : unitSuffix(servicesById.get(addId)?.type);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      {/* Lista de grupos */}
      <aside className="surface h-fit p-3">
        <form onSubmit={handleCreateGroup} className="mb-3 flex gap-2">
          <Input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Novo grupo (ex: HOMAG)"
            className="h-9"
          />
          <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={busy || !newGroupName.trim()} aria-label="Criar grupo">
            <Plus />
          </Button>
        </form>

        {groups.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-muted-foreground">
            Ainda não há grupos. Crie o primeiro acima.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {groups.map((g) => {
              const active = selected?.id === g.id;
              const count = Object.keys(g.precos).length;
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(g.id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                      active ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    }`}
                  >
                    <FolderOpen className={`h-4 w-4 shrink-0 ${active ? "text-primary" : ""}`} />
                    <span className="flex-1 truncate font-medium">{g.nome}</span>
                    <Badge variant="muted" className="shrink-0 tabular-nums">{count}</Badge>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* Conteúdo do grupo */}
      {!selected ? (
        <EmptyState
          icon={FolderOpen}
          title="Crie um grupo para começar"
          description='Ex.: "HOMAG". Dentro do grupo adiciona as despesas e os serviços com os valores que se aplicam.'
        />
      ) : (
        <section className="surface overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
            {renaming?.id === selected.id ? (
              <form
                className="flex flex-1 items-center gap-2"
                onSubmit={(e) => (e.preventDefault(), handleRename())}
              >
                <Input
                  autoFocus
                  value={renaming.nome}
                  onChange={(e) => setRenaming({ ...renaming, nome: e.target.value })}
                  onKeyDown={(e) => e.key === "Escape" && setRenaming(null)}
                  className="h-9 max-w-xs"
                />
                <Button type="submit" size="icon" variant="ghost" className="h-9 w-9 text-primary" aria-label="Guardar nome">
                  <Check />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-9 w-9" onClick={() => setRenaming(null)} aria-label="Cancelar">
                  <X />
                </Button>
              </form>
            ) : (
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-semibold">{selected.nome}</h2>
                <p className="text-xs text-muted-foreground">
                  {Object.keys(selected.precos).length} serviço(s) e despesa(s) neste grupo
                </p>
              </div>
            )}
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setRenaming({ id: selected.id, nome: selected.nome })}>
                <Pencil /> Renomear
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDuplicate(selected)} disabled={busy}>
                <Copy /> Duplicar
              </Button>
              <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => handleDeleteGroup(selected)}>
                <Trash2 /> Apagar
              </Button>
            </div>
          </div>

          {/* Adicionar ao grupo */}
          <form onSubmit={handleAdd} className="space-y-3 border-b border-border bg-muted/30 p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <ListPlus className="h-4 w-4 text-primary" /> Adicionar a {selected.nome}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select value={addId} onValueChange={setAddId}>
                <SelectTrigger className="h-9 sm:flex-1">
                  <SelectValue placeholder="Escolher serviço ou despesa…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NEW} className="font-medium text-primary">
                    + Criar novo tipo…
                  </SelectItem>
                  {available.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Do catálogo</SelectLabel>
                      {available.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} <span className="text-muted-foreground">· {typeLabel(s.type)}</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>

              {addId === NEW && (
                <>
                  <Input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nome (ex: Deslocação, Hora técnica)"
                    className="h-9 sm:flex-1"
                  />
                  <Select value={newType} onValueChange={setNewType}>
                    <SelectTrigger className="h-9 sm:w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map(([t, label]) => (
                        <SelectItem key={t} value={t}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}

              {addId && (
                <div className="relative sm:w-36">
                  <Euro className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    inputMode="decimal"
                    value={addPrice}
                    onChange={(e) => setAddPrice(e.target.value)}
                    placeholder="Valor"
                    className="h-9 pl-7 pr-12 text-right tabular-nums"
                  />
                  {addSuffix && (
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      {addSuffix}
                    </span>
                  )}
                </div>
              )}

              <Button type="submit" className="h-9" disabled={busy || !addId || (addId === NEW && !newName.trim())}>
                {busy ? <Loader2 className="animate-spin" /> : <Plus />}
                Adicionar
              </Button>
            </div>
            {addId && addId !== NEW && otherPrices(addId).length > 0 && (
              <p className="text-xs text-muted-foreground">
                Noutros grupos: {otherPrices(addId).join(" · ")}
              </p>
            )}
          </form>

          {error && <p className="border-b border-border px-4 py-2 text-sm text-red-400">{error}</p>}

          {/* Itens do grupo */}
          {Object.keys(selected.precos).length > 6 && (
            <div className="border-b border-border p-3">
              <SearchInput value={search} onChange={setSearch} placeholder={`Procurar em ${selected.nome}…`} />
            </div>
          )}
          {items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              {search ? "Nada encontrado." : "Este grupo ainda está vazio. Adicione serviços e despesas acima."}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.service.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {typeLabel(item.service.type)}
                      {item.valor == null && <span className="ml-2 text-amber-400">sem valor</span>}
                    </p>
                  </div>
                  <PriceInput
                    value={item.valor}
                    suffix={unitSuffix(item.service.type)}
                    onSave={(v) => run(() => setGroupPrice(KIND, selected.id, item.id, v))}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-red-400"
                    onClick={() => handleRemoveItem(item)}
                    aria-label={`Tirar ${item.service.name} do grupo`}
                  >
                    <X />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
};

export default ServiceGroups;
