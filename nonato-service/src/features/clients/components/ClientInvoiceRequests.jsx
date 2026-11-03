// ClientInvoiceRequests.jsx
// Lista dos pedidos de fatura de um cliente (separador Documentos). Cada um
// pode ser gerado outra vez — com os mesmos dados — ou apagado. Antes de
// gerar verifica-se se o orçamento de peças / OS de origem ainda existe; se
// foi apagado, mostra-se um aviso e o pedido é apagado (ver invoiceRequests.js).

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, FileText, Loader2, Receipt, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import { useConfirm } from "../../../components/app";
import { formatDateTime } from "../../../utils/formatDate.js";
import {
  listInvoiceRequests,
  deleteInvoiceRequest,
  invoiceSourceExists,
} from "../invoiceRequests.js";
import {
  generateSolicitacaoFaturaPDF,
  invoiceAmounts,
  formatEuro,
  TIPOS_FATURA,
} from "../pdf/solicitacaoFaturaPDF.js";

const num = (v) => Number(String(v ?? "").replace(",", ".")) || 0;

const ClientInvoiceRequests = ({ clientId, refreshKey = 0 }) => {
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [orphan, setOrphan] = useState(null); // pedido cuja origem foi apagada

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setItems(await listInvoiceRequests(clientId));
    } catch (err) {
      console.error("Erro ao carregar pedidos de fatura:", err);
      setError("Não foi possível carregar os pedidos de fatura.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const regenerate = async (req) => {
    try {
      setBusyId(req.id);
      setError(null);
      if (!(await invoiceSourceExists(req))) {
        // A origem foi apagada: o pedido deixa de valer — avisa e apaga.
        await deleteInvoiceRequest(req.id);
        setItems((prev) => prev.filter((i) => i.id !== req.id));
        setOrphan(req);
        return;
      }
      await generateSolicitacaoFaturaPDF({
        client: req.cliente || {},
        data: req.data,
        texto: req.texto,
        valor: num(req.valor),
        comIva: !!req.comIva,
        taxaIva: num(req.taxaIva),
        nota: req.nota,
        tipo: req.tipo,
        referencia: req.referencia,
        maquinas: req.maquinas || [],
      });
    } catch (err) {
      console.error("Erro ao gerar o pedido de fatura:", err);
      setError("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (req) => {
    const ok = await confirm({
      title: "Apagar este pedido de fatura?",
      description: `${TIPOS_FATURA[req.tipo] || "Avulsa"}${req.referencia ? ` ${req.referencia}` : ""} · ${formatEuro(
        invoiceAmounts({ valor: num(req.valor), comIva: req.comIva, taxaIva: num(req.taxaIva) }).total
      )}. Sai do histórico do cliente.`,
      confirmLabel: "Apagar",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteInvoiceRequest(req.id);
      setItems((prev) => prev.filter((i) => i.id !== req.id));
    } catch (err) {
      console.error("Erro ao apagar o pedido de fatura:", err);
      setError("Não foi possível apagar. Tente novamente.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Pedidos de fatura ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {error && <p className="text-sm text-red-400">{error}</p>}
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ainda não há pedidos de fatura. Use o botão &quot;Solicitar fatura&quot; no topo.
          </p>
        ) : (
          items.map((req) => {
            const { total } = invoiceAmounts({ valor: num(req.valor), comIva: req.comIva, taxaIva: num(req.taxaIva) });
            return (
              <div key={req.id} className="surface-muted flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={req.tipo === "avulsa" ? "muted" : "info"}>{TIPOS_FATURA[req.tipo] || "Avulsa"}</Badge>
                    {req.referencia && <span className="font-mono text-sm">{req.referencia}</span>}
                    <span className="text-sm font-semibold tabular-nums">{formatEuro(total)}</span>
                    {req.comIva && <span className="text-xs text-muted-foreground">IVA incluído</span>}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {formatDateTime(req.createdAt, "")}
                    {req.nota ? ` · ${req.nota}` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => regenerate(req)} disabled={busyId === req.id}>
                    {busyId === req.id ? <Loader2 className="animate-spin" /> : <FileText />}
                    Gerar de novo
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-muted-foreground hover:text-red-400"
                    onClick={() => remove(req)}
                    aria-label="Apagar pedido"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>

      {/* Origem apagada */}
      <Dialog open={!!orphan} onOpenChange={(open) => !open && setOrphan(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Não é possível gerar este pedido
            </DialogTitle>
            <DialogDescription>
              {orphan?.tipo === "pecas" ? "O orçamento de peças" : "A ordem de serviço"}{" "}
              <strong className="text-foreground">{orphan?.referencia}</strong> a que este pedido de fatura estava
              associado foi apagado{orphan?.tipo === "pecas" ? "" : "a"}. Por isso o pedido foi removido do histórico do
              cliente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setOrphan(null)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ClientInvoiceRequests;
