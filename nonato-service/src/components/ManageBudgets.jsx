import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import generateBudgetPDF from "./generateBudgetPDF";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  getDoc,
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
} from "lucide-react";

const ManageBudgets = () => {
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [clientNames, setClientNames] = useState({});

  // Buscar orçamentos
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
        setBudgets(budgetsData);

        // Buscar nomes dos clientes
        const clientIds = [
          ...new Set(budgetsData.map((budget) => budget.clientId)),
        ];
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

  // Fecha o menu quando clicar fora
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const regeneratePDF = async (budget, e) => {
    e.stopPropagation();
    try {
      setActiveMenu(null);

      // Buscar dados necessários
      const clientDoc = await getDoc(doc(db, "clientes", budget.clientId));
      const orderDoc = await getDoc(doc(db, "ordens", budget.orderId));

      if (!clientDoc.exists() || !orderDoc.exists()) {
        setError("Erro ao carregar dados do orçamento");
        return;
      }

      const client = { id: clientDoc.id, ...clientDoc.data() };
      const order = { id: orderDoc.id, ...orderDoc.data() };

      // Gerar PDF usando os dados salvos
      await generateBudgetPDF(
        order,
        client,
        budget.services,
        budget.orderNumber
      );
    } catch (error) {
      setError("Erro ao gerar PDF");
      console.error("Erro ao gerar PDF:", error);
    }
  };

  const handleDelete = async (budgetId, e) => {
    e.stopPropagation();
    if (window.confirm("Tem certeza que deseja deletar este orçamento?")) {
      try {
        await deleteDoc(doc(db, "orcamentos", budgetId));
        setBudgets((prev) => prev.filter((budget) => budget.id !== budgetId));
        setActiveMenu(null);
      } catch (error) {
        setError("Erro ao deletar orçamento");
        console.error(error);
      }
    }
  };

  const toggleMenu = (e, budgetId) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === budgetId ? null : budgetId);
  };

  const filteredBudgets = budgets.filter(
    (budget) =>
      clientNames[budget.clientId]
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      budget.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <h2 className="text-2xl font-semibold text-center text-white mb-6">
        Gerenciar Orçamentos
      </h2>

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500 rounded-lg">
          <p className="text-red-500">{error}</p>
        </div>
      )}

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar orçamentos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 pl-10 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div className="mb-4 flex justify-between items-center">
        <span className="text-gray-400">
          {filteredBudgets.length} orçamento(s)
        </span>
      </div>

      <div className="space-y-4 mb-32">
        {filteredBudgets.length > 0 ? (
          filteredBudgets.map((budget) => (
            <div
              key={budget.id}
              className="group flex items-center p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors relative"
            >
              <div className="flex items-center flex-grow min-w-0">
                <div className="h-12 w-12 rounded-full bg-[#117d49] flex items-center justify-center mr-4">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0 flex-grow">
                  <h3 className="font-semibold text-white truncate">
                    {clientNames[budget.clientId]}
                  </h3>
                  <div className="flex items-center text-gray-400">
                    <span>
                      Orçamento #{budget.orderNumber} -{" "}
                      {new Date(budget.createdAt.toDate()).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mt-1">
                    Total: {budget.total.toFixed(2)}€
                  </p>
                </div>
              </div>

              <button
                onClick={(e) => toggleMenu(e, budget.id)}
                className="p-2 ml-2 text-gray-400 hover:text-white rounded-full focus:outline-none"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {activeMenu === budget.id && (
                <div
                  className="absolute right-0 top-full mt-2 w-48 bg-gray-800 rounded-lg shadow-lg z-50 py-1 border border-gray-700"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => handleDelete(budget.id, e)}
                    className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700 flex items-center"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </button>
                  <button
                    onClick={(e) => regeneratePDF(budget, e)}
                    className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 flex items-center"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver PDF
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-white text-center py-8">
            <p className="mb-2">Nenhum orçamento encontrado.</p>
            <p className="text-gray-400">
              Tente ajustar sua busca ou adicione um novo orçamento.
            </p>
          </div>
        )}
      </div>

      <div className="fixed bottom-4 left-0 right-0 flex justify-center items-center md:left-64">
        <button
          onClick={() => navigate("/app/add-budget")}
          className="h-16 px-6 bg-[#117d49] text-white font-medium flex items-center justify-center rounded-full shadow-lg hover:bg-[#0d6238] transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Orçamento
        </button>
      </div>
    </div>
  );
};

export default ManageBudgets;
