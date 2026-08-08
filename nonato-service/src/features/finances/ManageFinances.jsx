// src/features/finances/ManageFinances.jsx - Atualizado com sistema de lucro
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
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

const ManageFinances = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Financial data
  const [partsBudgets, setPartsBudgets] = useState([]);
  const [closures, setClosures] = useState([]);
  const [financialMetrics, setFinancialMetrics] = useState(null);

  // Fetch all financial data
  const fetchFinancialData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Buscar orçamentos de peças (isQuote: true)
      const partsBudgetsQuery = query(
        collection(db, "ordens"),
        where("isQuote", "==", true)
      );

      // Buscar fechamentos (orçamentos regulares)
      const closuresQuery = collection(db, "orcamentos");

      const [partsBudgetsSnapshot, closuresSnapshot] = await Promise.all([
        getDocs(partsBudgetsQuery),
        getDocs(closuresQuery),
      ]);

      const partsBudgetsData = partsBudgetsSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          type: "parts_budget",
          ...doc.data(),
        }))
        .filter((service) => !service.eliminadoEm);

      const closuresData = closuresSnapshot.docs.map((doc) => ({
        id: doc.id,
        type: "closure",
        ...doc.data(),
      }));

      setPartsBudgets(partsBudgetsData);
      setClosures(closuresData);
    } catch (err) {
      console.error("Erro ao carregar dados financeiros:", err);
      setError(
        "Erro ao carregar dados financeiros. Por favor, tente novamente."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, []);

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
      case "quarter":
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
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Gestão Financeira
          </h1>
          <p className="text-sm sm:text-base text-zinc-400">
            Análise completa do desempenho financeiro com separação de vendas e
            lucros
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/app/clientes-devedores")}
            className="border-red-600 text-white hover:bg-red-700 bg-red-600"
          >
            <TrendingDown className="w-4 h-4 mr-2" />
            Clientes Devedores &amp; IVA
          </Button>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32 bg-zinc-700 border-zinc-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
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
              <SelectTrigger className="w-20 bg-zinc-700 border-zinc-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
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
            className="border-zinc-700 text-white hover:bg-zinc-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {!metrics ? (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-12 text-center">
            <PieChart className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2 text-white">
              Nenhum dado financeiro encontrado
            </p>
            <p className="text-zinc-400">
              Não há dados para o período selecionado
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Main Financial Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-zinc-800 border-zinc-700">
              <CardContent className="flex items-center justify-between p-4 sm:p-6">
                <div>
                  <p className="text-sm font-medium text-zinc-400">
                    Faturamento Total
                  </p>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
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

            <Card className="bg-zinc-800 border-zinc-700">
              <CardContent className="flex items-center justify-between p-4 sm:p-6">
                <div>
                  <p className="text-sm font-medium text-zinc-400">
                    Vendas (Base)
                  </p>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                    {formatPrice(metrics.totalSales)}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">Sem margens</p>
                </div>
                <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
              </CardContent>
            </Card>

            <Card className="bg-zinc-800 border-zinc-700">
              <CardContent className="flex items-center justify-between p-4 sm:p-6">
                <div>
                  <p className="text-sm font-medium text-zinc-400">
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

            <Card className="bg-zinc-800 border-zinc-700">
              <CardContent className="flex items-center justify-between p-4 sm:p-6">
                <div>
                  <p className="text-sm font-medium text-zinc-400">
                    Margem Média
                  </p>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                    {formatPercentage(metrics.profitMargin)}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Ticket: {formatPrice(metrics.averageTicket)}
                  </p>
                </div>
                <Calculator className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" />
              </CardContent>
            </Card>
          </div>

          {/* Payment Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-zinc-800 border-zinc-700">
              <CardContent className="flex items-center justify-between p-4 sm:p-6">
                <div>
                  <p className="text-sm font-medium text-zinc-400">
                    Valores Recebidos
                  </p>
                  <h3 className="text-xl sm:text-2xl font-bold text-green-500 mt-1 sm:mt-2">
                    {formatPrice(metrics.paidAmount)}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    {formatPercentage(metrics.conversionRate)} conversão
                  </p>
                </div>
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
              </CardContent>
            </Card>

            <Card className="bg-zinc-800 border-zinc-700">
              <CardContent className="flex items-center justify-between p-4 sm:p-6">
                <div>
                  <p className="text-sm font-medium text-zinc-400">
                    Valores Pendentes
                  </p>
                  <h3 className="text-xl sm:text-2xl font-bold text-yellow-500 mt-1 sm:mt-2">
                    {formatPrice(metrics.pendingAmount)}
                  </h3>
                </div>
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
              </CardContent>
            </Card>

            <Card className="bg-zinc-800 border-zinc-700">
              <CardContent className="flex items-center justify-between p-4 sm:p-6">
                <div>
                  <p className="text-sm font-medium text-zinc-400">
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
            <Card className="bg-zinc-800 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Orçamentos de Peças ({serviceGroups.partsBudgets.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-zinc-400">Faturamento</p>
                    <p className="text-lg font-bold text-white">
                      {formatPrice(partsBudgetsMetrics.totalRevenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">Vendas Base</p>
                    <p className="text-lg font-bold text-white">
                      {formatPrice(partsBudgetsMetrics.totalSales)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">Lucro</p>
                    <p className="text-lg font-bold text-purple-400">
                      {formatPrice(partsBudgetsMetrics.totalProfit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">IVA</p>
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
            <Card className="bg-zinc-800 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Fechamentos ({serviceGroups.closures.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-zinc-400">Faturamento</p>
                    <p className="text-lg font-bold text-white">
                      {formatPrice(closuresMetrics.totalRevenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">Vendas</p>
                    <p className="text-lg font-bold text-white">
                      {formatPrice(closuresMetrics.totalSales)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">IVA</p>
                    <p className="text-lg font-bold text-blue-400">
                      {formatPrice(closuresMetrics.totalVat)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">Ticket Médio</p>
                    <p className="text-lg font-bold text-white">
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
              <Package className="w-4 h-4 mr-2" />
              Gerir Orçamentos de Peças
            </Button>
            <Button
              onClick={() => navigate("/app/manage-budgets")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Wrench className="w-4 h-4 mr-2" />
              Gerir Fechamentos
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default ManageFinances;
