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
  ArrowLeft,
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
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/app/manage-finances")}
          className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Clientes Devedores &amp; Controlo de IVA
          </h1>
          <p className="text-sm text-zinc-400">
            Vista agregada por cliente e por período, a partir de Orçamentos e
            Fechamentos
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="devedores">
        <TabsList className="bg-zinc-800 border border-zinc-700">
          <TabsTrigger value="devedores">Clientes Devedores</TabsTrigger>
          <TabsTrigger value="iva">Controlo de IVA</TabsTrigger>
        </TabsList>

        {/* Devedores */}
        <TabsContent value="devedores" className="space-y-4 mt-4">
          <Card className="bg-zinc-800 border-zinc-700">
            <CardContent className="p-4 sm:p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Total em Dívida</p>
                  <p className="text-xl font-bold text-red-400">
                    {formatPrice(totalOverdueAll)}
                  </p>
                </div>
              </div>
              <Badge className="bg-zinc-700 text-white hover:bg-zinc-700">
                {debtorsByClient.length} cliente(s)
              </Badge>
            </CardContent>
          </Card>

          {debtorsByClient.length === 0 ? (
            <Card className="bg-zinc-800 border-zinc-700">
              <CardContent className="p-8 text-center">
                <Users className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400">Nenhum cliente com valores em atraso</p>
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
                  <Card key={entry.clientId} className="bg-zinc-800 border-zinc-700">
                    <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                      <div
                        className="min-w-0 cursor-pointer"
                        onClick={() => navigate(`/app/client/${entry.clientId}`)}
                      >
                        <p className="text-white font-medium truncate">
                          {entry.client?.name || "Cliente removido"}
                        </p>
                        <p className="text-sm text-zinc-400">
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
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
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
          <Card className="bg-zinc-800 border-zinc-700">
            <CardContent className="p-4 sm:p-6 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Euro className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">IVA Total Acumulado</p>
                  <p className="text-xl font-bold text-blue-400">
                    {formatPrice(totalVatAll)}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={exportVatCsv}
                className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-900"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </CardContent>
          </Card>

          {vatByMonth.length === 0 ? (
            <Card className="bg-zinc-800 border-zinc-700">
              <CardContent className="p-8 text-center">
                <Calendar className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400">Sem dados de IVA disponíveis</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-zinc-800 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-base text-white">IVA por Mês</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {vatByMonth.map((m) => (
                  <div
                    key={m.month}
                    className="flex items-center justify-between p-3 bg-zinc-700/30 rounded-lg border border-zinc-600"
                  >
                    <div>
                      <p className="text-white font-medium">{m.month}</p>
                      <p className="text-xs text-zinc-400">
                        {m.count} documento(s) · Base {formatPrice(m.base)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-blue-400 font-bold">{formatPrice(m.vat)}</p>
                      <p className="text-xs text-zinc-500">
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
