// ManageExpenses.jsx - Comprovantes de Despesas (para IRS/contabilidade)
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, doc, deleteDoc, orderBy, query } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "../../firebase.jsx";
import { formatDate } from "../../utils/formatDate.js";
import {
  Plus,
  Loader2,
  AlertTriangle,
  Receipt,
  Trash2,
  Download,
  User,
  Home,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";

import { formatPrice } from "../../utils/financialUtils";

const months = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const ManageExpenses = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError(null);
      const q = query(collection(db, "comprovantesDespesas"), orderBy("date", "desc"));
      const snap = await getDocs(q);
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Erro ao carregar despesas:", err);
      setError("Erro ao carregar comprovantes de despesas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const filtered = useMemo(() => {
    return expenses.filter((exp) => {
      if (!exp.date) return false;
      const d = new Date(exp.date);
      const matchesMonth =
        d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      const matchesType = typeFilter === "all" || exp.type === typeFilter;
      return matchesMonth && matchesType;
    });
  }, [expenses, selectedMonth, selectedYear, typeFilter]);

  const total = filtered.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.receiptStoragePath) {
        try {
          await deleteObject(ref(storage, deleteTarget.receiptStoragePath));
        } catch {
          // comprovativo pode já não existir
        }
      }
      await deleteDoc(doc(db, "comprovantesDespesas", deleteTarget.id));
      setExpenses((prev) => prev.filter((e) => e.id !== deleteTarget.id));
    } catch (err) {
      console.error("Erro ao apagar despesa:", err);
      setError("Erro ao apagar despesa.");
    } finally {
      setDeleteTarget(null);
    }
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Comprovantes de Despesas
          </h1>
          <p className="text-sm text-zinc-400">
            Registo de despesas (cliente ou pessoais) para efeitos de IRS
          </p>
        </div>
        <Button
          onClick={() => navigate("/app/add-expense")}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Despesa
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      {/* Filtros */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="flex items-center bg-zinc-900 rounded-lg">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (selectedMonth === 0) {
                  setSelectedMonth(11);
                  setSelectedYear((prev) => prev - 1);
                } else {
                  setSelectedMonth((prev) => prev - 1);
                }
              }}
              className="text-zinc-400 hover:text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center px-4">
              <Calendar className="w-4 h-4 text-blue-400 mr-2" />
              <span className="text-white font-medium">
                {months[selectedMonth]} {selectedYear}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (selectedMonth === 11) {
                  setSelectedMonth(0);
                  setSelectedYear((prev) => prev + 1);
                } else {
                  setSelectedMonth((prev) => prev + 1);
                }
              }}
              className="text-zinc-400 hover:text-white"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              <SelectItem value="all" className="text-white hover:bg-zinc-700">
                Todas
              </SelectItem>
              <SelectItem value="cliente" className="text-white hover:bg-zinc-700">
                Ligadas a Cliente
              </SelectItem>
              <SelectItem value="pessoal" className="text-white hover:bg-zinc-700">
                Pessoais
              </SelectItem>
            </SelectContent>
          </Select>

          <div className="text-right">
            <p className="text-sm text-zinc-400">Total do período</p>
            <p className="text-xl font-bold text-white">{formatPrice(total)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      {filtered.length === 0 ? (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-8 sm:p-12 text-center">
            <Receipt className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2 text-white">
              Nenhuma despesa neste período
            </p>
            <p className="text-sm text-zinc-400">
              Use o botão &ldquo;Nova Despesa&rdquo; para registar uma
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((expense) => (
            <Card key={expense.id} className="bg-zinc-800 border-zinc-700">
              <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
                    {expense.type === "cliente" ? (
                      <User className="h-5 w-5 text-blue-400" />
                    ) : (
                      <Home className="h-5 w-5 text-purple-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">
                      {expense.description || "Sem descrição"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span>{formatDate(expense.date)}</span>
                      {expense.type === "cliente" && expense.clientName && (
                        <>
                          <span>·</span>
                          <span>{expense.clientName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    className={
                      expense.type === "cliente"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-purple-500/20 text-purple-400"
                    }
                  >
                    {expense.type === "cliente" ? "Cliente" : "Pessoal"}
                  </Badge>
                  <p className="text-white font-bold">{formatPrice(expense.amount)}</p>
                  {expense.receiptUrl && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(expense.receiptUrl, "_blank")}
                      className="text-zinc-400 hover:text-white hover:bg-zinc-700 h-8 w-8"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(expense)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar exclusão</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem a certeza que deseja apagar esta despesa? Esta ação não pode
              ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="border-zinc-700 text-white hover:text-white hover:bg-zinc-700 bg-zinc-600"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Apagar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageExpenses;
