import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import generateBudgetPDF from "./generateBudgetPDF";
import generateSimpleBudgetPDF from "./generateSimpleBudgetPDF";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  getDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase.jsx";
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
} from "lucide-react";

const BudgetCard = ({ budget, onDelete, onViewPDF, clientName }) => {
  const [activeMenu, setActiveMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="group flex items-center p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors relative">
      <div className="flex items-center flex-grow min-w-0">
        <div className="h-12 w-12 rounded-full bg-[#117d49] flex items-center justify-center mr-4">
          <FileText className="w-6 h-6 text-white" />
        </div>
        <div className="min-w-0 flex-grow">
          <h3 className="font-semibold text-white truncate">{clientName}</h3>
          <div className="flex items-center text-gray-400">
            <span className="truncate">
              #{budget.budgetNumber || budget.orderNumber} -{" "}
              {budget.createdAt?.toDate().toLocaleDateString()}
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Total: {budget.total.toFixed(2)}€
          </p>
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          setActiveMenu(!activeMenu);
        }}
        className="p-2 ml-2 text-gray-400 hover:text-white rounded-full focus:outline-none"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {activeMenu && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-2 w-48 bg-gray-800 rounded-lg shadow-lg z-50 py-1 border border-gray-700"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(budget.id);
              setActiveMenu(false);
            }}
            className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700 flex items-center"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewPDF(budget);
              setActiveMenu(false);
            }}
            className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 flex items-center"
          >
            <Eye className="w-4 h-4 mr-2" />
            Ver PDF
          </button>
        </div>
      )}
    </div>
  );
};

const DateFilter = ({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  onClear,
}) => (
  <div className="bg-gray-800 p-4 rounded-lg mb-4">
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1">
        <label className="block text-sm text-gray-400 mb-2">Data Início</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartChange(e.target.value)}
          className="w-full p-2 bg-gray-700 text-white rounded-lg border border-gray-600"
        />
      </div>
      <div className="flex-1">
        <label className="block text-sm text-gray-400 mb-2">Data Fim</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndChange(e.target.value)}
          className="w-full p-2 bg-gray-700 text-white rounded-lg border border-gray-600"
        />
      </div>
      {(startDate || endDate) && (
        <div className="flex items-end">
          <button
            onClick={onClear}
            className="p-2 text-gray-400 hover:text-white rounded-lg border border-gray-600"
          >
            Limpar Filtros
          </button>
        </div>
      )}
    </div>
  </div>
);

const ManageBudgets = () => {
  const navigate = useNavigate();
  const [simpleBudgets, setSimpleBudgets] = useState([]);
  const [regularBudgets, setRegularBudgets] = useState([]);
  // Remover estados não utilizados
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clientNames, setClientNames] = useState({});
  const [activeTab, setActiveTab] = useState("simple");

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
        setError("Erro ao carregar orçamentos");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBudgets();
  }, []);

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
      if (budget.clientData) {
        await generateSimpleBudgetPDF(budget);
      } else {
        const clientDoc = await getDoc(doc(db, "clientes", budget.clientId));
        const orderDoc = await getDoc(doc(db, "ordens", budget.orderId));

        if (!clientDoc.exists() || !orderDoc.exists()) {
          setError("Erro ao carregar dados do orçamento");
          return;
        }

        const client = { id: clientDoc.id, ...clientDoc.data() };
        const order = { id: orderDoc.id, ...orderDoc.data() };

        await generateBudgetPDF(
          order,
          client,
          budget.services,
          budget.orderNumber
        );
      }
    } catch (error) {
      setError("Erro ao gerar PDF");
      console.error("Erro ao gerar PDF:", error);
    }
  };

  const filteredSimpleBudgets = simpleBudgets.filter(
    (budget) =>
      budget.clientData.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (budget.budgetNumber || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  const filteredRegularBudgets = regularBudgets.filter(
    (budget) =>
      (clientNames[budget.clientId] || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (budget.orderNumber || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <h2 className="text-2xl font-semibold text-center text-white mb-6">
        Gerenciar Orçamentos
      </h2>

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500 rounded-lg">
          <p className="text-red-500">{error}</p>
        </div>
      )}

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar orçamentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 pl-10 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <button
            onClick={() => {
              const reversed = [...simpleBudgets].reverse();
              setSimpleBudgets(reversed);
              const reversedRegular = [...regularBudgets].reverse();
              setRegularBudgets(reversedRegular);
            }}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center sm:w-auto"
          >
            <Calendar className="w-5 h-5 mr-2" />
            Inverter Ordem
          </button>
        </div>
      </div>

      {/* Tabs para mobile e tablet */}
      <div className="lg:hidden flex rounded-lg bg-gray-800 p-1 mb-4">
        <button
          onClick={() => setActiveTab("simple")}
          className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md ${
            activeTab === "simple"
              ? "bg-[#117d49] text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <UserSquare className="w-4 h-4 mr-2" />
          Sem Cadastro ({filteredSimpleBudgets.length})
        </button>
        <button
          onClick={() => setActiveTab("regular")}
          className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md ${
            activeTab === "regular"
              ? "bg-[#117d49] text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Com Cadastro ({filteredRegularBudgets.length})
        </button>
      </div>

      {/* Grid para desktop, lista única para mobile/tablet */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orçamentos Simples */}
        <div
          className={`space-y-4 ${
            activeTab !== "simple" ? "hidden lg:block" : ""
          }`}
        >
          <h3 className="text-xl font-semibold text-white mb-4 hidden lg:block">
            Orçamentos sem Cadastro ({filteredSimpleBudgets.length})
          </h3>
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
            <div className="text-white text-center py-8 bg-gray-800 rounded-lg">
              <p className="mb-2">Nenhum orçamento encontrado.</p>
            </div>
          )}
        </div>

        {/* Orçamentos Regulares */}
        <div
          className={`space-y-4 ${
            activeTab !== "regular" ? "hidden lg:block" : ""
          }`}
        >
          <h3 className="text-xl font-semibold text-white mb-4 hidden lg:block">
            Orçamentos com Cadastro ({filteredRegularBudgets.length})
          </h3>
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
            <div className="text-white text-center py-8 bg-gray-800 rounded-lg">
              <p className="mb-2">Nenhum orçamento encontrado.</p>
            </div>
          )}
        </div>
      </div>

      {/* Botões fixos */}
      <div className="fixed bottom-4 inset-x-0 flex justify-center items-center gap-4 px-4 md:px-0 md:left-64">
        <button
          onClick={() => navigate("/app/add-simple-budget")}
          className="flex-1 md:flex-none h-14 md:h-16 px-4 md:px-6 bg-[#117d49] text-white font-medium flex items-center justify-center rounded-full shadow-lg hover:bg-[#0d6238] transition-colors text-sm md:text-base"
        >
          <Plus className="w-5 h-5 mr-2" />
          <span className="whitespace-nowrap">Sem Cadastro</span>
        </button>
        <button
          onClick={() => navigate("/app/add-budget")}
          className="flex-1 md:flex-none h-14 md:h-16 px-4 md:px-6 bg-[#117d49] text-white font-medium flex items-center justify-center rounded-full shadow-lg hover:bg-[#0d6238] transition-colors text-sm md:text-base"
        >
          <Plus className="w-5 h-5 mr-2" />
          <span className="whitespace-nowrap">Com Cadastro</span>
        </button>
      </div>
    </div>
  );
};

export default ManageBudgets;
