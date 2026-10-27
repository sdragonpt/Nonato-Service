// ManageDebtors.jsx - Clientes Devedores + Controlo de IVA (agregação global)
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { useClients } from "../../context/ClientsContext.jsx";
import { useOrcamentos } from "../../context/OrcamentosContext.jsx";
import { getCached } from "../../utils/sessionCache.js";
import {
  AlertTriangle,
  Loader2,
  Users,
  Euro,
  Download,
  MessageCircle,
  TrendingDown,
  Calendar,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";

import {
  calculateServiceFinancials,
  getPaymentStatus,
  formatPrice,
} from "../../utils/financialUtils";
import { PageHeader } from "../../components/app";

const buildWhatsAppLink = (phone, message) => {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 9) digits = `351${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
};

// ✅ "ordens" (isQuote) é lido por inteiro/filtrado no cliente. Cache de 5
// min partilhada com ManageAlerts.jsx e ManageClients.jsx (mesma chave
// "finances:ordensQuotes") — quem visita mais do que uma destas páginas na
// mesma sessão só paga a leitura uma vez. "orcamentos" vem do
// OrcamentosContext (cache partilhado por toda a app, tempo real).
const DEBTORS_CACHE_TTL = 5 * 60 * 1000;

const ManageDebtors = () => {
  const navigate = useNavigate();
  const { ensureClients } = useClients();
  const { ensureOrcamentos } = useOrcamentos();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [services, setServices] = useState([]);
  const [clientsMap, setClientsMap] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [partsSnap, closures, allClients] = await Promise.all([
          getCached("finances:ordensQuotes", DEBTORS_CACHE_TTL, () =>
            getDocs(query(collection(db, "ordens"), where("isQuote", "==", true)))
          ),
          ensureOrcamentos(),
          ensureClients(),
        ]);

        const cMap = {};
        allClients.forEach((client) => {
          cMap[client.id] = client;
        });
        setClientsMap(cMap);

        const allServices = [
          ...partsSnap.docs.map((d) => ({ id: d.id, type: "parts_budget", ...d.data() })),
          ...closures.map((o) => ({ type: "closure", ...o })),
        ].filter((service) => !service.eliminadoEm);
        setServices(allServices);
      } catch (err) {
        console.error("Erro ao carregar dados financeiros:", err);
        setError("Erro ao carregar dados financeiros.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ensureClients, ensureOrcamentos]);

  // Agregação por cliente (devedores)
  const debtorsByClient = useMemo(() => {
    const map = {};
    services.forEach((service) => {
      if (!service.clientId) return;
      const status = getPaymentStatus(service);
      if (status !== "overdue") return;

      const financials = calculateServiceFinancials(service);
      if (!map[service.clientId]) {
        map[service.clientId] = {
          clientId: service.clientId,
          count: 0,
          totalOverdue: 0,
        };
      }
      map[service.clientId].count += 1;
      map[service.clientId].totalOverdue += financials.totalWithVat;
    });

    return Object.values(map)
      .map((entry) => ({
        ...entry,
        client: clientsMap[entry.clientId],
      }))
      .sort((a, b) => b.totalOverdue - a.totalOverdue);
  }, [services, clientsMap]);

  // Agregação mensal (IVA)
  const vatByMonth = useMemo(() => {
    const map = {};
    services.forEach((service) => {
      const dateRaw = service.createdAt;
      const date = dateRaw?.toDate ? dateRaw.toDate() : new Date(dateRaw);
      if (!date || isNaN(date.getTime())) return;

      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const financials = calculateServiceFinancials(service);

      if (!map[monthKey]) {
        map[monthKey] = { month: monthKey, base: 0, vat: 0, total: 0, count: 0 };
      }
      map[monthKey].base += financials.totalBeforeVat;
      map[monthKey].vat += financials.vatAmount;
      map[monthKey].total += financials.totalWithVat;
      map[monthKey].count += 1;
    });

    return Object.values(map).sort((a, b) => b.month.localeCompare(a.month));
  }, [services]);

  const totalOverdueAll = debtorsByClient.reduce((sum, d) => sum + d.totalOverdue, 0);
  const totalVatAll = vatByMonth.reduce((sum, m) => sum + m.vat, 0);

  const exportVatCsv = () => {
    const rows = [
      ["Mês", "Base Tributável", "IVA", "Total c/ IVA", "Nº Documentos"],
      ...vatByMonth.map((m) => [
        m.month,
        m.base.toFixed(2),
        m.vat.toFixed(2),
        m.total.toFixed(2),
        m.count,
      ]),
    ];
    const csv = rows.map((r) => r.map((f) => `"${f}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "controlo-iva.csv";
    link.click();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <PageHeader
        title="Clientes Devedores &amp; Controlo de IVA"
        description="Vista agregada por cliente e por período, a partir de Orçamentos e Fechamentos"
        back="/app/manage-finances"
      />

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="devedores">
        <TabsList className="border">
          <TabsTrigger value="devedores">Clientes Devedores</TabsTrigger>
          <TabsTrigger value="iva">Controlo de IVA</TabsTrigger>
        </TabsList>

        {/* Devedores */}
        <TabsContent value="devedores" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4 sm:p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total em Dívida</p>
                  <p className="text-xl font-bold text-red-400">
                    {formatPrice(totalOverdueAll)}
                  </p>
                </div>
              </div>
              <Badge className="bg-muted text-foreground hover:bg-accent">
                {debtorsByClient.length} cliente(s)
              </Badge>
            </CardContent>
          </Card>

          {debtorsByClient.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-10 w-10 text-muted-foreground/70 mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum cliente com valores em atraso</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {debtorsByClient.map((entry) => {
                const phone = entry.client?.phone;
                const whatsappLink = buildWhatsAppLink(
                  phone,
                  `Olá ${entry.client?.name || ""}, aqui é da Nonato Service. Gostaríamos de relembrar que existe um valor pendente de ${formatPrice(entry.totalOverdue)} referente aos nossos serviços. Poderá entrar em contacto connosco para regularizar? Obrigado.`
                );
                return (
                  <Card key={entry.clientId}>
                    <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                      <div
                        className="min-w-0 cursor-pointer"
                        onClick={() => navigate(`/app/client/${entry.clientId}`)}
                      >
                        <p className="text-foreground font-medium truncate">
                          {entry.client?.name || "Cliente removido"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {entry.count} documento(s) em atraso
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-lg font-bold text-red-400">
                          {formatPrice(entry.totalOverdue)}
                        </p>
                        {whatsappLink && (
                          <Button
                            size="sm"
                            onClick={() => window.open(whatsappLink, "_blank")}
                           
                          >
                            <MessageCircle className="w-4 h-4" />
                            Cobrar
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* IVA */}
        <TabsContent value="iva" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4 sm:p-6 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Euro className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">IVA Total Acumulado</p>
                  <p className="text-xl font-bold text-blue-400">
                    {formatPrice(totalVatAll)}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={exportVatCsv}
               
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </Button>
            </CardContent>
          </Card>

          {vatByMonth.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground/70 mx-auto mb-3" />
                <p className="text-muted-foreground">Sem dados de IVA disponíveis</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">IVA por Mês</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {vatByMonth.map((m) => (
                  <div
                    key={m.month}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
                  >
                    <div>
                      <p className="text-foreground font-medium">{m.month}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.count} documento(s) · Base {formatPrice(m.base)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-blue-400 font-bold">{formatPrice(m.vat)}</p>
                      <p className="text-xs text-muted-foreground">
                        Total {formatPrice(m.total)}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ManageDebtors;
