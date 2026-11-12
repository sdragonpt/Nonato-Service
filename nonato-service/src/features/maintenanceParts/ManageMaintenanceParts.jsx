// ManageMaintenanceParts.jsx
// Lista dos documentos "Peças para Manutenção" (ver maintenancePartsStore.js):
// pesquisa, abrir/editar, gerar o PDF e apagar.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, FileText, Loader2, Plus, Trash2, Wrench } from "lucide-react";
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
import { listMaintenanceDocs, deleteMaintenanceDoc } from "./maintenancePartsStore.js";
import { generateMaintenancePartsPDF } from "./generateMaintenancePartsPDF.js";

const ManageMaintenanceParts = () => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [pdfId, setPdfId] = useState(null);

  useEffect(() => {
    listMaintenanceDocs()
      .then(setDocs)
      .catch((err) => {
        console.error("Erro ao carregar documentos de peças para manutenção:", err);
        setError("Não foi possível carregar os documentos.");
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return docs;
    return docs.filter((d) =>
      [d.number, d.clientName, d.titulo, d.equipment?.brand, d.equipment?.model, d.equipment?.serialNumber,
        ...(d.itens || []).flatMap((i) => [i.code, i.name])]
        .filter(Boolean)
        .some((t) => searchIncludes(t, search))
    );
  }, [docs, search]);

  const makePdf = async (d) => {
    try {
      setPdfId(d.id);
      setError(null);
      await generateMaintenancePartsPDF(d);
    } catch (err) {
      console.error("Erro ao gerar o PDF:", err);
      setError("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setPdfId(null);
    }
  };

  const remove = async (d) => {
    const ok = await confirm({
      title: `Apagar ${d.number || "este documento"}?`,
      description: "O documento e a lista de peças são apagados. Esta ação não pode ser desfeita.",
      confirmLabel: "Apagar",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteMaintenanceDoc(d.id);
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
        icon={ClipboardList}
        title="Peças para Manutenção"
        description="Lista de peças necessárias para a manutenção de um equipamento, com código e imagem (sem preços)"
        actions={
          <Button onClick={() => navigate("/app/pecas-manutencao/nova")} className="hidden sm:inline-flex">
            <Plus /> Novo documento
          </Button>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <FilterBar footer={<span>{filtered.length} documento(s)</span>}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Procurar por nº, cliente, equipamento ou peça…"
          className="lg:max-w-none"
        />
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={docs.length ? "Nada encontrado" : "Ainda não há documentos"}
          description={docs.length ? "Ajuste a pesquisa." : "Crie o primeiro com o botão “Novo documento”."}
          action={
            !docs.length && (
              <Button onClick={() => navigate("/app/pecas-manutencao/nova")}>
                <Plus /> Novo documento
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((d) => {
            const eq = [d.equipment?.brand, d.equipment?.model].filter(Boolean).join(" ");
            const qtd = (d.itens || []).reduce((t, i) => t + (Number(i.quantity) || 0), 0);
            return (
              <div
                key={d.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/app/pecas-manutencao/${d.id}`)}
                onKeyDown={(e) => e.key === "Enter" && navigate(`/app/pecas-manutencao/${d.id}`)}
                className="surface flex cursor-pointer flex-col gap-3 p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-primary">{d.number}</p>
                    <p className="truncate font-medium">{d.clientName || "Sem cliente"}</p>
                    {d.titulo && <p className="truncate text-sm text-muted-foreground">{d.titulo}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDate(d.createdAt)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {eq && (
                    <Badge variant="muted" className="gap-1">
                      <Wrench className="h-3 w-3" />
                      {eq}
                      {d.equipment?.serialNumber ? ` · ${d.equipment.serialNumber}` : ""}
                    </Badge>
                  )}
                  <Badge variant="info">
                    {(d.itens || []).length} peça(s) · {qtd} un.
                  </Badge>
                </div>
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

      <Fab actions={[{ icon: Plus, label: "Novo documento", onClick: () => navigate("/app/pecas-manutencao/nova") }]} />
    </div>
  );
};

export default ManageMaintenanceParts;
