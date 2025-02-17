import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import generateSimpleBudgetPDF from "./components/pdf/generateSimpleBudgetPDF";
import generateBudgetPDF from "./components/pdf/generateBudgetPDF";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { FileOpener } from "@capacitor-community/file-opener";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebase.jsx";
import {
  Search,
  Plus,
  Loader2,
  MoreVertical,
  FileText,
  Trash2,
  Eye,
  UserPlus,
  UserSquare,
  Calendar,
  Receipt,
  FileCheck,
  AlertTriangle,
  Edit,
} from "lucide-react";

// UI Components
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  calculateTotalsWithIVA,
  formatCurrency,
} from "@/utils/formatters/budgetCalculations";

const BudgetCard = ({ budget, onDelete, onViewPDF, onEdit, clientName }) => {
  const Icon =
    budget.type === "simple"
      ? budget.isExpense
        ? Receipt
        : FileCheck
      : FileText;

  const totalsData = calculateTotalsWithIVA(
    budget.services,
    budget.ivaRate || 0
  );

  return (
    <Card className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center">
            <Icon className="w-5 h-5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-white truncate">
              {clientName}
            </h3>
            <p className="text-zinc-400 text-sm">
              #{budget.budgetNumber || budget.orderNumber}
            </p>
            <p className="text-zinc-400 text-sm">
              {budget.createdAt?.toDate().toLocaleDateString()}
            </p>
            <div className="text-zinc-400 text-sm mt-1">
              <p>Subtotal: {formatCurrency(totalsData.subtotal)}€</p>
              {budget.ivaRate > 0 && (
                <p>
                  IVA ({budget.ivaRate}%):{" "}
                  {formatCurrency(totalsData.ivaAmount)}€
                </p>
              )}
              <p className="font-medium text-white">
                Total: {formatCurrency(totalsData.total)}€
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-zinc-700 text-white"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-zinc-800 border-zinc-700"
            >
              <DropdownMenuItem
                onClick={() => onViewPDF(budget, true)}
                className="text-white hover:bg-zinc-700 cursor-pointer"
              >
                <Eye className="w-4 h-4 mr-2" />
                Ver PDF com IVA
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onViewPDF(budget, false)}
                className="text-white hover:bg-zinc-700 cursor-pointer"
              >
                <Eye className="w-4 h-4 mr-2" />
                Ver PDF sem IVA
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onEdit(budget)}
                className="text-white hover:bg-zinc-700 cursor-pointer"
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-400 hover:bg-zinc-700 focus:text-red-400 cursor-pointer"
                onClick={() => onDelete(budget.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};

const ManageBudgets = () => {
  const navigate = useNavigate();
  const [simpleBudgets, setSimpleBudgets] = useState([]);
  const [regularBudgets, setRegularBudgets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clientNames, setClientNames] = useState({});
  const [activeTab, setActiveTab] = useState("simple");
  const [, setIsGeneratingPDF] = useState(false);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [documentTypeFilter, setDocumentTypeFilter] = useState(() => {
    const saved = localStorage.getItem("documentTypeFilter");
    return saved || "all";
  });

  useEffect(() => {
    localStorage.setItem("documentTypeFilter", documentTypeFilter);
  }, [documentTypeFilter]);

  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        setIsLoading(true);
        const budgetsRef = collection(db, "orcamentos");
        const q = query(budgetsRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const budgetsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Separar orçamentos simples e regulares
        const simple = [];
        const regular = [];
        budgetsData.forEach((budget) => {
          if (budget.clientData) {
            simple.push(budget);
          } else if (budget.clientId) {
            regular.push(budget);
          }
        });

        setSimpleBudgets(simple);
        setRegularBudgets(regular);

        // Buscar nomes dos clientes apenas para orçamentos regulares
        const clientIds = [...new Set(regular.map((b) => b.clientId))];
        const clientData = {};

        await Promise.all(
          clientIds.map(async (clientId) => {
            const clientDoc = await getDoc(doc(db, "clientes", clientId));
            if (clientDoc.exists()) {
              clientData[clientId] = clientDoc.data().name;
            }
          })
        );

        setClientNames(clientData);
      } catch (err) {
        console.error("Error fetching budgets:", err);
        setError("Erro ao carregar orçamentos");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBudgets();
  }, []);

  const handleFilterChange = async (newFilter) => {
    try {
      setIsFilterLoading(true);
      setDocumentTypeFilter(newFilter);
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error("Error changing filter:", error);
      setDocumentTypeFilter("all");
    } finally {
      setIsFilterLoading(false);
    }
  };

  const handleDelete = async (budgetId) => {
    if (window.confirm("Tem certeza que deseja deletar este orçamento?")) {
      try {
        await deleteDoc(doc(db, "orcamentos", budgetId));
        setSimpleBudgets((prev) => prev.filter((b) => b.id !== budgetId));
        setRegularBudgets((prev) => prev.filter((b) => b.id !== budgetId));
      } catch (error) {
        setError("Erro ao deletar orçamento");
        console.error(error);
      }
    }
  };

  const handleViewPDF = async (budget) => {
    try {
      setIsGeneratingPDF(true);

      // Define mobile environment first
      const isMobile = window?.Capacitor?.isNative;

      // Determine if this is a regular budget (with registration) or simple budget
      const isRegularBudget = Boolean(budget.clientId);
      let pdfBlob;

      if (isRegularBudget) {
        // Handle regular budget (com cadastro)
        const formattedServices = budget.services.map((service) => ({
          ...service,
          value: parseFloat(service.value || 0),
          quantity: parseFloat(service.quantity || 1),
          total:
            parseFloat(service.value || 0) * parseFloat(service.quantity || 1),
        }));

        const clientData = {
          name: clientNames[budget.clientId] || "Cliente não encontrado",
        };

        pdfBlob = await generateBudgetPDF(
          budget,
          clientData,
          formattedServices,
          budget.orderNumber
        );

        if (!isMobile || !pdfBlob) {
          return;
        }
      } else {
        // Handle simple budget (sem cadastro)
        const formattedServices = budget.services.map((service) => ({
          name: service.name || "",
          type: service.type || "un",
          value: parseFloat(service.value || 0),
          quantity: parseFloat(service.quantity || 1),
          total:
            parseFloat(service.value || 0) * parseFloat(service.quantity || 1),
        }));

        const formattedBudget = {
          ...budget,
          budgetNumber: budget.budgetNumber || "",
          clientData: {
            name: budget.clientData?.name || "",
            phone: budget.clientData?.phone || "",
            address: budget.clientData?.address || "",
          },
          services: formattedServices,
          total: formattedServices.reduce(
            (acc, service) => acc + service.total,
            0
          ),
          createdAt: budget.createdAt || new Date(),
          isExpense: budget.isExpense || false,
        };

        pdfBlob = await generateSimpleBudgetPDF(formattedBudget);
      }

      // Handle file saving/opening based on platform
      if (isMobile) {
        try {
          const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(pdfBlob);
          });

          const fileName = isRegularBudget
            ? `Fechamento_${clientNames[budget.clientId]}_${
                budget.orderNumber
              }.pdf`
            : `${budget.isExpense ? "Despesa" : "Orçamento"}_${
                budget.clientData?.name
              }_${budget.budgetNumber}.pdf`;

          await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Documents,
            recursive: true,
          });

          const { uri } = await Filesystem.getUri({
            directory: Directory.Documents,
            path: fileName,
          });

          await FileOpener.open({
            filePath: uri,
            contentType: "application/pdf",
          });
        } catch (error) {
          console.error("Error saving/opening file on device:", error);
          throw error;
        }
      } else {
        // Web download handling
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = url;
        const fileName = isRegularBudget
          ? `Fechamento_${clientNames[budget.clientId]}_${
              budget.orderNumber
            }.pdf`
          : `${budget.isExpense ? "Despesa" : "Orçamento"}_${
              budget.clientData?.name
            }_${budget.budgetNumber}.pdf`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      setError("Erro ao gerar PDF. Por favor, tente novamente.");
      console.error("Error generating PDF:", error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const filteredSimpleBudgets = useMemo(() => {
    try {
      return simpleBudgets.filter((budget) => {
        const matchesSearch =
          budget.clientData?.name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (budget.budgetNumber || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase());

        switch (documentTypeFilter) {
          case "budget":
            return matchesSearch && !budget.isExpense;
          case "expense":
            return matchesSearch && budget.isExpense;
          case "all":
          default:
            return matchesSearch;
        }
      });
    } catch (error) {
      console.error("Error filtering budgets:", error);
      return [];
    }
  }, [simpleBudgets, searchTerm, documentTypeFilter]);

  const filteredRegularBudgets = regularBudgets.filter(
    (budget) =>
      (clientNames[budget.clientId] || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (budget.orderNumber || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  if (isLoading || isFilterLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Gerenciar Orçamentos
          </h1>
          <p className="text-sm sm:text-base text-zinc-400">
            Gerencie todos os seus orçamentos e despesas em um só lugar
          </p>
        </div>
        <div className="hidden sm:flex gap-2">
          <Button
            onClick={() => navigate("/app/add-simple-budget")}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Sem Cadastro
          </Button>
          <Button
            onClick={() => navigate("/app/add-budget")}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Com Cadastro
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">
                Total de Documentos
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {simpleBudgets.length + regularBudgets.length}
              </h3>
            </div>
            <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Sem Cadastro</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {simpleBudgets.length}
              </h3>
            </div>
            <UserSquare className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Com Cadastro</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {regularBudgets.length}
              </h3>
            </div>
            <UserPlus className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
          </CardContent>
        </Card>
      </div>

      {/* Filters Card */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="space-y-4 p-3 sm:p-6">
          {/* Search */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Buscar documentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => handleFilterChange("all")}
                className={`gap-2 border-zinc-700 ${
                  documentTypeFilter === "all"
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "text-white hover:bg-zinc-700 bg-zinc-600"
                }`}
              >
                <FileText className="w-4 h-4" />
                Todos
              </Button>
              <Button
                variant="outline"
                onClick={() => handleFilterChange("budget")}
                className={`gap-2 border-zinc-700 ${
                  documentTypeFilter === "budget"
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "text-white hover:bg-zinc-700 bg-zinc-600"
                }`}
              >
                <FileCheck className="w-4 h-4" />
                Orçamentos
              </Button>
              <Button
                variant="outline"
                onClick={() => handleFilterChange("expense")}
                className={`gap-2 border-zinc-700 ${
                  documentTypeFilter === "expense"
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "text-white hover:bg-zinc-700 bg-zinc-600"
                }`}
              >
                <Receipt className="w-4 h-4" />
                Despesas
              </Button>
            </div>
          </div>

          {error && (
            <Alert
              variant="destructive"
              className="border-red-500 bg-red-500/10"
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions - Desktop Only */}
      <div className="hidden sm:flex gap-2">
        <Button
          variant="outline"
          onClick={() => {
            const reversed = [...simpleBudgets].reverse();
            setSimpleBudgets(reversed);
            const reversedRegular = [...regularBudgets].reverse();
            setRegularBudgets(reversedRegular);
          }}
          className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-600"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Inverter Ordem
        </Button>
      </div>

      {/* Tabs */}
      <div className="lg:hidden flex flex-col sm:flex-row gap-2 rounded-lg bg-zinc-800 p-2 mb-4">
        <Button
          onClick={() => setActiveTab("simple")}
          variant="ghost"
          className={`flex items-center justify-center h-12 sm:h-10 ${
            activeTab === "simple"
              ? "bg-green-600 text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <UserSquare className="w-4 h-4 mr-2" />
          <span className="text-sm truncate">
            {documentTypeFilter === "all" && "Orçamentos e Despesas"}
            {documentTypeFilter === "budget" && "Orçamentos"}
            {documentTypeFilter === "expense" && "Despesas"}
            {` (${filteredSimpleBudgets.length})`}
          </span>
        </Button>
        <Button
          onClick={() => setActiveTab("regular")}
          variant="ghost"
          className={`flex items-center justify-center h-12 sm:h-10 ${
            activeTab === "regular"
              ? "bg-green-600 text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          <span className="text-sm truncate">
            Fechamentos ({regularBudgets.length})
          </span>
        </Button>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Simple Budgets */}
        <div
          className={`space-y-4 ${
            activeTab !== "simple" ? "hidden lg:block" : ""
          }`}
        >
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            {documentTypeFilter === "all" && "Orçamentos e Despesas"}
            {documentTypeFilter === "budget" && "Orçamentos"}
            {documentTypeFilter === "expense" && "Despesas"}
            {` (${filteredSimpleBudgets.length})`}
          </h3>

          <div className="grid grid-cols-1 gap-4">
            {filteredSimpleBudgets.length > 0 ? (
              filteredSimpleBudgets.map((budget) => (
                <BudgetCard
                  key={budget.id}
                  budget={budget}
                  clientName={budget.clientData.name}
                  onDelete={handleDelete}
                  onViewPDF={handleViewPDF}
                />
              ))
            ) : (
              <Card className="bg-zinc-800 border-zinc-700">
                <CardContent className="p-8 sm:p-12 text-center">
                  <Search className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-600 mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2 text-white">
                    Nenhum documento encontrado
                  </p>
                  <p className="text-sm sm:text-base text-zinc-400">
                    Tente ajustar seus filtros ou adicione um novo documento
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Regular Budgets */}
        <div
          className={`space-y-4 ${
            activeTab !== "regular" ? "hidden lg:block" : ""
          }`}
        >
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            Fechamentos de Ordens de Serviço ({filteredRegularBudgets.length})
          </h3>

          <div className="grid grid-cols-1 gap-4">
            {filteredRegularBudgets.length > 0 ? (
              filteredRegularBudgets.map((budget) => (
                <BudgetCard
                  key={budget.id}
                  budget={budget}
                  clientName={clientNames[budget.clientId]}
                  onDelete={handleDelete}
                  onViewPDF={handleViewPDF}
                />
              ))
            ) : (
              <Card className="bg-zinc-800 border-zinc-700">
                <CardContent className="p-8 sm:p-12 text-center">
                  <Search className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-600 mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2 text-white">
                    Nenhum documento encontrado
                  </p>
                  <p className="text-sm sm:text-base text-zinc-400">
                    Tente ajustar seus filtros ou adicione um novo documento
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Mobile FAB Menu */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 sm:hidden z-50">
        <Button
          onClick={() => {
            const reversed = [...simpleBudgets].reverse();
            setSimpleBudgets(reversed);
            const reversedRegular = [...regularBudgets].reverse();
            setRegularBudgets(reversedRegular);
          }}
          size="icon"
          className="rounded-full shadow-lg bg-zinc-700 hover:bg-zinc-600"
        >
          <Calendar className="h-5 w-5" />
        </Button>

        <Button
          onClick={() => navigate("/app/add-simple-budget")}
          size="icon"
          className="rounded-full shadow-lg bg-green-600 hover:bg-green-700"
        >
          <UserSquare className="h-5 w-5" />
        </Button>

        <Button
          onClick={() => navigate("/app/add-budget")}
          size="icon"
          className="rounded-full shadow-lg bg-green-600 hover:bg-green-700"
        >
          <UserPlus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default ManageBudgets;
