// ManageServices.jsx
// Cadastro de serviços e valores, em dois separadores:
// - "Grupos e valores": tabelas de preços (ex.: HOMAG) com os serviços e
//   despesas de cada grupo e o valor que se aplica nesse grupo;
// - "Catálogo": a lista partilhada de nomes de serviços/despesas (o tipo diz
//   a unidade — hora, dia, km…). Um serviço pode estar em vários grupos.
import { useState, useEffect, useMemo, useRef } from "react";
import { collection, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { comparePtPt } from "../../utils/sortHelpers.js";
import { useNavigate } from "react-router-dom";
import {
  useGroups,
  GROUP_KINDS,
  migrateLegacyServiceGroups,
} from "../../services/groupsStore.js";
import {
  Plus,
  Edit2,
  Trash2,
  Wrench,
  MoreVertical,
  Download,
  FolderOpen,
  ClipboardList,
  Search,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import {
  PageHeader,
  StatCard,
  StatGrid,
  FilterBar,
  SearchInput,
  EmptyState,
  PageLoader,
  LoadMoreButton,
  Fab,
  useConfirm,
} from "../../components/app";
import ServiceGroups, { SERVICE_TYPES, typeLabel, unitSuffix } from "./components/ServiceGroups.jsx";

const PAGE_SIZE = 18;
const TAB_KEY = "servicos.tab";

const ManageServices = () => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(() => {
    try {
      return localStorage.getItem(TAB_KEY) || "grupos";
    } catch {
      return "grupos";
    }
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterGroup, setFilterGroup] = useState("all"); // "all" | "none" | id do grupo
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { groups, byId: groupsById, loading: groupsLoading } = useGroups(GROUP_KINDS.SERVICOS);

  // Tempo real: a lista atualiza-se sozinha quando alguém mexe nos serviços.
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "servicos"),
      (snapshot) => {
        setServices(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        console.error("Erro ao buscar serviços:", err);
        setError("Erro ao carregar serviços. Por favor, tente novamente.");
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Serviços antigos com um só grupo (grupoId) passam a fazer parte desse
  // grupo, sem valor. Corre uma vez por visita e só escreve o que falta.
  const migrated = useRef(false);
  useEffect(() => {
    if (migrated.current || isLoading || groupsLoading || !services.length) return;
    migrated.current = true;
    migrateLegacyServiceGroups(services, groupsById).catch((err) =>
      console.error("Erro ao migrar grupos antigos dos serviços:", err)
    );
  }, [isLoading, groupsLoading, services, groupsById]);

  const changeTab = (value) => {
    setTab(value);
    try {
      localStorage.setItem(TAB_KEY, value);
    } catch {
      /* sem armazenamento local: fica só nesta visita */
    }
  };

  // Grupos em que cada serviço está, com o valor em cada um.
  const groupsOf = useMemo(() => {
    const map = new Map();
    for (const g of groups) {
      for (const [sid, valor] of Object.entries(g.precos)) {
        if (!map.has(sid)) map.set(sid, []);
        map.get(sid).push({ id: g.id, nome: g.nome, valor });
      }
    }
    return map;
  }, [groups]);

  const filteredServices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return services
      .filter((s) => {
        const inGroups = groupsOf.get(s.id) || [];
        return (
          (!term || (s.name || "").toLowerCase().includes(term)) &&
          (filterType === "all" || s.type === filterType) &&
          (filterGroup === "all" ||
            (filterGroup === "none" ? inGroups.length === 0 : inGroups.some((g) => g.id === filterGroup)))
        );
      })
      .sort((a, b) => comparePtPt(a.name || "", b.name || ""));
  }, [services, groupsOf, searchTerm, filterType, filterGroup]);

  useEffect(() => setVisibleCount(PAGE_SIZE), [searchTerm, filterType, filterGroup]);

  const handleDelete = async (service) => {
    const inGroups = groupsOf.get(service.id) || [];
    const ok = await confirm({
      title: `Apagar "${service.name}"?`,
      description: inGroups.length
        ? `Está em ${inGroups.length} grupo(s) (${inGroups.map((g) => g.nome).join(", ")}) e deixa de aparecer neles. Esta ação não pode ser desfeita.`
        : "Esta ação não pode ser desfeita.",
      confirmLabel: "Apagar",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "servicos", service.id));
    } catch (err) {
      console.error("Erro ao apagar serviço:", err);
      setError("Erro ao apagar o serviço. Por favor, tente novamente.");
    }
  };

  const exportCSV = () => {
    const rows = [["Grupo", "Nome", "Tipo", "Valor"]];
    for (const g of groups) {
      for (const [sid, valor] of Object.entries(g.precos)) {
        const s = services.find((x) => x.id === sid);
        if (s) rows.push([g.nome, s.name, typeLabel(s.type), valor ?? ""]);
      }
    }
    for (const s of services) {
      if (!groupsOf.has(s.id)) rows.push(["", s.name, typeLabel(s.type), ""]);
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "servicos-e-valores.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <PageLoader label="A carregar serviços…" />;

  const currentServices = filteredServices.slice(0, visibleCount);
  const withoutValue = groups.reduce(
    (n, g) => n + Object.values(g.precos).filter((v) => v == null).length,
    0
  );

  return (
    <div className="space-y-6 pb-24 sm:pb-6">
      <PageHeader
        icon={Wrench}
        title="Serviços e Valores"
        description="Grupos com os valores de cada serviço e despesa, e o catálogo partilhado"
        actions={
          <>
            <Button variant="outline" onClick={exportCSV} className="hidden sm:inline-flex">
              <Download /> Exportar CSV
            </Button>
            <Button onClick={() => navigate("/app/add-service")} className="hidden sm:inline-flex">
              <Plus /> Novo Serviço
            </Button>
          </>
        }
      />

      <StatGrid cols={3}>
        <StatCard label="Grupos" value={groups.length} icon={FolderOpen} />
        <StatCard label="Serviços no catálogo" value={services.length} icon={ClipboardList} tone="info" />
        <StatCard
          label="Sem valor definido"
          value={withoutValue}
          icon={Wrench}
          tone={withoutValue ? "warning" : "muted"}
          hint="Itens nos grupos ainda sem valor"
          className="col-span-2 lg:col-span-1"
        />
      </StatGrid>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={tab} onValueChange={changeTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="grupos">Grupos e valores</TabsTrigger>
          <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
        </TabsList>

        <TabsContent value="grupos" className="mt-0">
          <ServiceGroups services={services} groups={groups} loading={groupsLoading} />
        </TabsContent>

        <TabsContent value="catalogo" className="mt-0 space-y-4">
          <FilterBar
            footer={
              <span className="text-sm text-muted-foreground">
                A mostrar {currentServices.length} de {filteredServices.length} serviço(s)
              </span>
            }
          >
            <div className="grid gap-3 lg:grid-cols-[1fr_14rem_14rem]">
              <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Procurar serviços…" />
              <Select value={filterGroup} onValueChange={setFilterGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os grupos</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                  ))}
                  <SelectItem value="none" className="text-muted-foreground">Sem grupo</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {SERVICE_TYPES.map(([t, label]) => (
                    <SelectItem key={t} value={t}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </FilterBar>

          {filteredServices.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Nenhum serviço encontrado"
              description="Ajuste os filtros ou adicione um novo serviço."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {currentServices.map((service) => {
                const inGroups = groupsOf.get(service.id) || [];
                return (
                  <div key={service.id} className="surface flex gap-3 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <Wrench className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{service.name}</p>
                      <p className="text-xs text-muted-foreground">{typeLabel(service.type)}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {inGroups.length === 0 ? (
                          <Badge variant="muted">Sem grupo</Badge>
                        ) : (
                          inGroups.map((g) => (
                            <Badge key={g.id} variant={g.valor == null ? "warning" : "success"} className="tabular-nums">
                              {g.nome}
                              {g.valor != null && ` · ${g.valor}€${unitSuffix(service.type)}`}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full" aria-label="Mais ações">
                          <MoreVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/app/edit-service/${service.id}`)}>
                          <Edit2 className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-400 focus:text-red-400" onClick={() => handleDelete(service)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Apagar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}

          {visibleCount < filteredServices.length && (
            <LoadMoreButton onClick={() => setVisibleCount((n) => n + PAGE_SIZE)} />
          )}
        </TabsContent>
      </Tabs>

      <Fab
        actions={[
          { icon: Download, label: "Exportar CSV", onClick: exportCSV },
          { icon: Plus, label: "Novo Serviço", onClick: () => navigate("/app/add-service") },
        ]}
      />
    </div>
  );
};

export default ManageServices;
