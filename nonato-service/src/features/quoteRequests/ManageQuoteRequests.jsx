// ManageQuoteRequests.jsx
// Lista dos "Pedidos de Orçamento Avulsos" (ver quoteRequestsStore.js):
// pesquisa, abrir/editar, gerar o PDF e apagar.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileQuestion, FileText, Loader2, Plus, Trash2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import {
  PageHeader,
  FilterBar,
  SearchInput,
  EmptyState,
  PageLoader,
  Fab,
  useConfirm,
} from "../../components/app";
import { searchIncludes } from "../../utils/normalizeSearch.js";
import { formatDate } from "../../utils/formatDate.js";
import { listQuoteRequests, deleteQuoteRequest } from "./quoteRequestsStore.js";
import { generateQuoteRequestPDF } from "./generateQuoteRequestPDF.js";

const NEW_PATH = "/app/pedidos-orcamento/novo";

const ManageQuoteRequests = () => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [pdfId, setPdfId] = useState(null);

  useEffect(() => {
    listQuoteRequests()
      .then(setDocs)
      .catch((err) => {
        console.error("Erro ao carregar pedidos de orçamento:", err);
        setError("Não foi possível carregar os pedidos de orçamento.");
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return docs;
    return docs.filter((d) =>
      [d.number, d.fornecedor?.nome, d.clientName, d.equipment?.model,
        ...(d.itens || []).flatMap((i) => [i.nome, i.referencia, i.marca])]
        .filter(Boolean)
        .some((t) => searchIncludes(t, search))
    );
  }, [docs, search]);

  const makePdf = async (d) => {
    try {
      setPdfId(d.id);
      setError(null);
      await generateQuoteRequestPDF(d);
    } catch (err) {
      console.error("Erro ao gerar o PDF:", err);
      setError("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setPdfId(null);
    }
  };

  const remove = async (d) => {
    const ok = await confirm({
      title: `Apagar ${d.number || "este pedido"}?`,
      description: "O pedido de orçamento e a lista de peças são apagados. Esta ação não pode ser desfeita.",
      confirmLabel: "Apagar",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteQuoteRequest(d.id);
      setDocs((prev) => prev.filter((x) => x.id !== d.id));
    } catch (err) {
      console.error("Erro ao apagar:", err);
      setError("Não foi possível apagar. Tente novamente.");
    }
  };

  if (loading) return <PageLoader label="A carregar…" />;

  return (
    <div className="space-y-6 pb-24 sm:pb-6">
      <PageHeader
        icon={FileQuestion}
        title="Pedidos de Orçamento Avulsos"
        description="Pedir preços a fornecedores por peças que não são do nosso catálogo"
        actions={
          <Button onClick={() => navigate(NEW_PATH)} className="hidden sm:inline-flex">
            <Plus /> Novo pedido
          </Button>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <FilterBar footer={<span>{filtered.length} pedido(s)</span>}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Procurar por nº, fornecedor, cliente ou peça…"
          className="lg:max-w-none"
        />
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileQuestion}
          title={docs.length ? "Nada encontrado" : "Ainda não há pedidos de orçamento"}
          description={docs.length ? "Ajuste a pesquisa." : "Crie o primeiro com o botão “Novo pedido”."}
          action={
            !docs.length && (
              <Button onClick={() => navigate(NEW_PATH)}>
                <Plus /> Novo pedido
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((d) => {
            const qtd = (d.itens || []).reduce((t, i) => t + (Number(i.quantidade) || 0), 0);
            const open = () => navigate(`/app/pedidos-orcamento/${d.id}`);
            return (
              <div
                key={d.id}
                role="button"
                tabIndex={0}
                onClick={open}
                onKeyDown={(e) => e.key === "Enter" && open()}
                className="surface flex cursor-pointer flex-col gap-3 p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-primary">{d.number}</p>
                    <p className="flex items-center gap-1.5 truncate font-medium">
                      <Truck className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {d.fornecedor?.nome || "Sem fornecedor"}
                    </p>
                    {d.clientName && <p className="truncate text-sm text-muted-foreground">Para: {d.clientName}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDate(d.createdAt)}</span>
                </div>
                <Badge variant="info" className="w-fit">
                  {(d.itens || []).length} peça(s) · {qtd} un.
                </Badge>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="outline" onClick={() => makePdf(d)} disabled={pdfId === d.id}>
                    {pdfId === d.id ? <Loader2 className="animate-spin" /> : <FileText />}
                    PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-muted-foreground hover:text-red-400"
                    onClick={() => remove(d)}
                  >
                    <Trash2 /> Apagar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Fab actions={[{ icon: Plus, label: "Novo pedido", onClick: () => navigate(NEW_PATH) }]} />
    </div>
  );
};

export default ManageQuoteRequests;
