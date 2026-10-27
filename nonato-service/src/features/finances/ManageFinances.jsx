// src/features/finances/ManageFinances.jsx - Atualizado com sistema de lucro
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { useOrcamentos } from "../../context/OrcamentosContext.jsx";
import {
  TrendingUp,
  TrendingDown,
  Euro,
  PieChart,
  BarChart3,
  Calendar,
  Download,
  Loader2,
  AlertTriangle,
  Package,
  Wrench,
  Calculator,
  Percent,
} from "lucide-react";

// UI Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";

// Financial utils
import {
  calculateFinancialSummary,
  calculateFinancialMetrics,
  groupServicesByType,
  formatPrice,
  formatPercentage,
} from "../../utils/financialUtils";
import { PageHeader } from "../../components/app";

const ManageFinances = () => {
  const navigate = useNavigate();
  const { ensureOrcamentos } = useOrcamentos();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Financial data
  const [partsBudgets, setPartsBudgets] = useState([]);
  const [closures, setClosures] = useState([]);

  // Fetch all financial data
  const fetchFinancialData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Buscar orçamentos de peças (isQuote: true)
      const partsBudgetsQuery = query(
        collection(db, "ordens"),
        where("isQuote", "==", true)
      );

      // Buscar fechamentos (orçamentos regulares) — via cache partilhado
      // (OrcamentosContext) em vez de um getDocs próprio desta página.
      const [partsBudgetsSnapshot, closuresData] = await Promise.all([
        getDocs(partsBudgetsQuery),
        ensureOrcamentos(),
      ]);

      const partsBudgetsData = partsBudgetsSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          type: "parts_budget",
          ...doc.data(),
        }))
        .filter((service) => !service.eliminadoEm);

      const closuresList = closuresData.map((o) => ({
        type: "closure",
        ...o,
      }));

      setPartsBudgets(partsBudgetsData);
      setClosures(closuresList);
    } catch (err) {
      console.error("Erro ao carregar dados financeiros:", err);
      setError(
        "Erro ao carregar dados financeiros. Por favor, tente novamente."
      );
    } finally {
      setIsLoading(false);
    }
  }, [ensureOrcamentos]);

  useEffect(() => {
    fetchFinancialData();
  }, [fetchFinancialData]);

  // Filter data by selected period
  const filteredData = useMemo(() => {
    if (!partsBudgets.length && !closures.length)
      return { current: [], previous: [] };

    const allServices = [...partsBudgets, ...closures];
    const now = new Date();

    let currentPeriodStart,
      currentPeriodEnd,
      previousPeriodStart,
      previousPeriodEnd;

    switch (selectedPeriod) {
      case "week":
        currentPeriodStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 7
        );
        currentPeriodEnd = now;
        previousPeriodStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 14
        );
        previousPeriodEnd = currentPeriodStart;
        break;
      case "month":
        currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        previousPeriodStart = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1
        );
        previousPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "quarter": {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        currentPeriodStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
        currentPeriodEnd = new Date(
          now.getFullYear(),
          (currentQuarter + 1) * 3,
          0
        );
        previousPeriodStart = new Date(
          now.getFullYear(),
          (currentQuarter - 1) * 3,
          1
        );
        previousPeriodEnd = new Date(now.getFullYear(), currentQuarter * 3, 0);
        break;
      }
      case "year":
        currentPeriodStart = new Date(selectedYear, 0, 1);
        currentPeriodEnd = new Date(selectedYear, 11, 31);
        previousPeriodStart = new Date(selectedYear - 1, 0, 1);
        previousPeriodEnd = new Date(selectedYear - 1, 11, 31);
        break;
      default:
        return { current: allServices, previous: [] };
    }

    const current = allServices.filter((service) => {
      const serviceDate = service.createdAt?.toDate
        ? service.createdAt.toDate()
        : new Date(service.createdAt);
      return (
        serviceDate >= currentPeriodStart && serviceDate <= currentPeriodEnd
      );
    });

    const previous = allServices.filter((service) => {
      const serviceDate = service.createdAt?.toDate
        ? service.createdAt.toDate()
        : new Date(service.createdAt);
      return (
        serviceDate >= previousPeriodStart && serviceDate <= previousPeriodEnd
      );
    });

    return { current, previous };
  }, [partsBudgets, closures, selectedPeriod, selectedYear]);

  // Calculate financial metrics
  const metrics = useMemo(() => {
    if (!filteredData.current.length) return null;
    return calculateFinancialMetrics(
      filteredData.current,
      filteredData.previous
    );
  }, [filteredData]);

  // Group services by type for analysis
  const serviceGroups = useMemo(() => {
    return groupServicesByType(filteredData.current);
  }, [filteredData]);

  // Calculate metrics for each service type
  const partsBudgetsMetrics = useMemo(() => {
    return calculateFinancialSummary(serviceGroups.partsBudgets);
  }, [serviceGroups]);

  const closuresMetrics = useMemo(() => {
    return calculateFinancialSummary(serviceGroups.closures);
  }, [serviceGroups]);

  // Export financial data
  const exportFinancialData = () => {
    if (!metrics) return;

    const csvContent = [
      ["Métrica", "Valor"],
      ["Faturamento Total", formatPrice(metrics.totalRevenue)],
      ["Vendas (sem margem)", formatPrice(metrics.totalSales)],
      ["Lucro (margens)", formatPrice(metrics.totalProfit)],
      ["IVA Total", formatPrice(metrics.totalVat)],
      ["Valores Recebidos", formatPrice(metrics.paidAmount)],
      ["Valores Pendentes", formatPrice(metrics.pendingAmount)],
      ["Valores em Atraso", formatPrice(metrics.overdueAmount)],
      ["Margem Média", formatPercentage(metrics.profitMargin)],
      ["", ""],
      ["Orçamentos de Peças", ""],
      ["Faturamento", formatPrice(partsBudgetsMetrics.totalRevenue)],
      ["Vendas", formatPrice(partsBudgetsMetrics.totalSales)],
      ["Lucro", formatPrice(partsBudgetsMetrics.totalProfit)],
      ["", ""],
      ["Fechamentos", ""],
      ["Faturamento", formatPrice(closuresMetrics.totalRevenue)],
      ["Vendas", formatPrice(closuresMetrics.totalSales)],
    ]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-financeiro-${selectedPeriod}-${selectedYear}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Gestão Financeira"
        description="Análise completa do desempenho financeiro com separação de vendas e lucros"
        actions={
          <>
            <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/app/clientes-devedores")}
              className="border-red-600 hover:bg-red-700 bg-red-600"
            >
              <TrendingDown className="w-4 h-4" />
              Clientes Devedores &amp; IVA
            </Button>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32 bg-muted">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Semana</SelectItem>
                <SelectItem value="month">Mês</SelectItem>
                <SelectItem value="quarter">Trimestre</SelectItem>
                <SelectItem value="year">Ano</SelectItem>
              </SelectContent>
            </Select>
  
            {selectedPeriod === "year" && (
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger className="w-20 bg-muted">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(
                    { length: 5 },
                    (_, i) => new Date().getFullYear() - i
                  ).map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
  
            <Button
              variant="outline"
              onClick={exportFinancialData}
              disabled={!metrics}
             
            >
              <Download className="w-4 h-4" />
              Exportar
            </Button>
          </div>
          </>
        }
      />

      {!metrics ? (
        <Card>
          <CardContent className="p-12 text-center">
            <PieChart className="h-12 w-12 text-muted-foreground/70 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2 text-foreground">
              Nenhum dado financeiro encontrado
            </p>
            <p className="text-muted-foreground">
              Não há dados para o período selecionado
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Main Financial Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="flex items-center justify-between p-4 sm:p-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Faturamento Total
                  </p>
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground mt-1 sm:mt-2">
                    {formatPrice(metrics.totalRevenue)}
                  </h3>
                  {metrics.revenueGrowth !== 0 && (
                    <div
                      className={`flex items-center gap-1 mt-1 ${
                        metrics.revenueGrowth > 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {metrics.revenueGrowth > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span className="text-xs">
                        {formatPercentage(Math.abs(metrics.revenueGrowth))}
                      </span>
                    </div>
                  )}
                </div>
                <Euro className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center justify-between p-4 sm:p-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Vendas (Base)
                  </p>
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground mt-1 sm:mt-2">
                    {formatPrice(metrics.totalSales)}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Sem margens</p>
                </div>
                <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center justify-between p-4 sm:p-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Lucro (Margens)
                  </p>
                  <h3 className="text-xl sm:text-2xl font-bold text-purple-400 mt-1 sm:mt-2">
                    {formatPrice(metrics.totalProfit)}
                  </h3>
                  {metrics.profitGrowth !== 0 && (
                    <div
                      className={`flex items-center gap-1 mt-1 ${
                        metrics.profitGrowth > 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {metrics.profitGrowth > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span className="text-xs">
                        {formatPercentage(Math.abs(metrics.profitGrowth))}
                      </span>
                    </div>
                  )}
                </div>
                <Percent className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center justify-between p-4 sm:p-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Margem Média
                  </p>
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground mt-1 sm:mt-2">
                    {formatPercentage(metrics.profitMargin)}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ticket: {formatPrice(metrics.averageTicket)}
                  </p>
                </div>
                <Calculator className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" />
              </CardContent>
            </Card>
          </div>

          {/* Payment Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="flex items-center justify-between p-4 sm:p-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Valores Recebidos
                  </p>
                  <h3 className="text-xl sm:text-2xl font-bold text-green-500 mt-1 sm:mt-2">
                    {formatPrice(metrics.paidAmount)}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatPercentage(metrics.conversionRate)} conversão
                  </p>
                </div>
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center justify-between p-4 sm:p-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Valores Pendentes
                  </p>
                  <h3 className="text-xl sm:text-2xl font-bold text-yellow-500 mt-1 sm:mt-2">
                    {formatPrice(metrics.pendingAmount)}
                  </h3>
                </div>
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center justify-between p-4 sm:p-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Valores em Atraso
                  </p>
                  <h3 className="text-xl sm:text-2xl font-bold text-red-500 mt-1 sm:mt-2">
                    {formatPrice(metrics.overdueAmount)}
                  </h3>
                </div>
                <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
              </CardContent>
            </Card>
          </div>

          {/* Service Type Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Parts Budgets Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Orçamentos de Peças ({serviceGroups.partsBudgets.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Faturamento</p>
                    <p className="text-lg font-bold text-foreground">
                      {formatPrice(partsBudgetsMetrics.totalRevenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vendas Base</p>
                    <p className="text-lg font-bold text-foreground">
                      {formatPrice(partsBudgetsMetrics.totalSales)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lucro</p>
                    <p className="text-lg font-bold text-purple-400">
                      {formatPrice(partsBudgetsMetrics.totalProfit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">IVA</p>
                    <p className="text-lg font-bold text-blue-400">
                      {formatPrice(partsBudgetsMetrics.totalVat)}
                    </p>
                  </div>
                </div>

                {partsBudgetsMetrics.totalProfit > 0 && (
                  <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <p className="text-sm text-purple-400">
                      ✨ Os orçamentos de peças geraram{" "}
                      {formatPrice(partsBudgetsMetrics.totalProfit)} em lucro
                      líquido
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Closures Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Fechamentos ({serviceGroups.closures.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Faturamento</p>
                    <p className="text-lg font-bold text-foreground">
                      {formatPrice(closuresMetrics.totalRevenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vendas</p>
                    <p className="text-lg font-bold text-foreground">
                      {formatPrice(closuresMetrics.totalSales)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">IVA</p>
                    <p className="text-lg font-bold text-blue-400">
                      {formatPrice(closuresMetrics.totalVat)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ticket Médio</p>
                    <p className="text-lg font-bold text-foreground">
                      {formatPrice(closuresMetrics.averageTicket)}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm text-blue-400">
                    💼 Fechamentos representam serviços completos (valor cobrado
                    com IVA incluído)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Actions */}
          <div className="flex justify-center gap-4">
            <Button
              onClick={() => navigate("/app/parts-budgets")}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Package className="w-4 h-4" />
              Gerir Orçamentos de Peças
            </Button>
            <Button
              onClick={() => navigate("/app/manage-budgets")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Wrench className="w-4 h-4" />
              Gerir Fechamentos
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default ManageFinances;
