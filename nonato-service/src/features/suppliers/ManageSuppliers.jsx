// src/features/suppliers/ManageSuppliers.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { searchIncludes } from "../../utils/normalizeSearch.js";
import { getInitials } from "../../utils/getInitials.js";
import { comparePtPt } from "../../utils/sortHelpers.js";
import {
  Search,
  Plus,
  Loader2,
  MoreVertical,
  Eye,
  Trash2,
  Edit2,
  Truck,
  Download,
  MapPin,
  CreditCard,
  Mail,
  ArrowUpDown,
  ArrowDown,
  Building2,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import { PageHeader, StatCard } from "../../components/app";

const SupplierCard = ({ supplier, onEdit, onDelete, onView }) => {
  const confirmDelete = (e) => {
    e.stopPropagation();
    onDelete(supplier.id);
  };

  return (
    <Card
      onClick={() => onView(supplier.id)}
      className="hover:bg-accent transition-colors cursor-pointer"
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
              <AvatarFallback className="bg-muted text-foreground/90">
                {getInitials(supplier.nomeEmpresa)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-foreground truncate" title={supplier.nomeEmpresa}>
                {supplier.nomeEmpresa || "Sem nome"}
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                {supplier.telefones || "Sem telefone"}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem onClick={() => onView(supplier.id)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver Detalhes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(supplier.id)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={confirmDelete} className="text-red-400">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-1.5">
          {supplier.localidade && (
            <p className="text-muted-foreground text-xs sm:text-sm truncate flex items-center gap-2">
              <MapPin className="w-4 h-4 shrink-0" />
              {supplier.localidade}
            </p>
          )}
          {supplier.numeroContribuicaoFiscal && (
            <p className="text-muted-foreground text-xs sm:text-sm truncate flex items-center gap-2">
              <CreditCard className="w-4 h-4 shrink-0" />
              NIF: {supplier.numeroContribuicaoFiscal}
            </p>
          )}
          {supplier.email && (
            <p className="text-muted-foreground text-xs sm:text-sm truncate flex items-center gap-2">
              <Mail className="w-4 h-4 shrink-0" />
              {supplier.email}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const ManageSuppliers = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  // Scroll infinito: lista pequena e sempre lida por inteiro (fornecedores),
  // por isso não há paginação por cursor à Firestore aqui — só se controla
  // quantos dos que já estão em memória são mostrados de cada vez.
  const PAGE_SIZE = 10;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // ✅ Tempo real (onSnapshot): a lista atualiza-se sozinha quando um
  // fornecedor é criado/editado/removido, sem precisar de um botão
  // "Atualizar" manual. A ordenação é feita em memória (ver sortedSuppliers).
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onSnapshot(
      collection(db, "fornecedores"),
      (snapshot) => {
        setSuppliers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        console.error("Erro ao carregar fornecedores:", err);
        setError("Erro ao carregar fornecedores. Por favor, tente novamente.");
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const sortedSuppliers = useMemo(() => {
    const list = [...suppliers];
    list.sort((a, b) => {
      const cmp = comparePtPt(a.nomeEmpresa, b.nomeEmpresa);
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return list;
  }, [suppliers, sortOrder]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchTerm, sortOrder]);

  const handleEdit = (id) => navigate(`/app/edit-supplier/${id}`);
  const handleView = (id) => navigate(`/app/supplier/${id}`);
  const handleDelete = (id) => {
    setSupplierToDelete(suppliers.find((s) => s.id === id));
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!supplierToDelete) return;
    try {
      await deleteDoc(doc(db, "fornecedores", supplierToDelete.id));
      // A lista atualiza-se sozinha via onSnapshot
      setDeleteDialogOpen(false);
      setSupplierToDelete(null);
    } catch (err) {
      console.error("Erro ao excluir fornecedor:", err);
      setError("Erro ao excluir fornecedor. Por favor, tente novamente.");
    }
  };

  const filteredSuppliers = useMemo(() => {
    return sortedSuppliers.filter(
      (s) =>
        searchIncludes(s.nomeEmpresa, searchTerm) ||
        searchIncludes(s.localidade, searchTerm) ||
        (s.numeroContribuicaoFiscal && s.numeroContribuicaoFiscal.includes(searchTerm)) ||
        searchIncludes(s.email, searchTerm) ||
        (s.telefones && s.telefones.includes(searchTerm))
    );
  }, [sortedSuppliers, searchTerm]);

  const currentSuppliers = filteredSuppliers.slice(0, visibleCount);
  const hasMoreVisible = visibleCount < filteredSuppliers.length;

  const loadMoreVisible = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredSuppliers.length));
  }, [filteredSuppliers.length]);

  const exportToCSV = () => {
    const csvContent = [
      ["Nome da Empresa", "Localidade", "Telefone", "Email", "NIF", "IBAN"],
      ...filteredSuppliers.map((s) => [
        s.nomeEmpresa || "",
        s.localidade || "",
        s.telefones || "",
        s.email || "",
        s.numeroContribuicaoFiscal || "",
        s.iban || "",
      ]),
    ]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "fornecedores.csv";
    link.click();
  };

  if (isLoading) {
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
        icon={Truck}
        title="Fornecedores"
        description="Gerencie os fornecedores da Nonato Service"
        actions={
          <>
            <Button
            onClick={() => navigate("/app/add-supplier")}
            className="hidden sm:flex"
          >
            <Plus className="w-4 h-4" />
            Novo Fornecedor
          </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label="Total de Fornecedores"
          value={suppliers.length}
          icon={Truck}
          tone="info"
        />

        <StatCard
          label="Com IBAN registado"
          value={suppliers.filter((s) => s.iban).length}
          icon={Building2}
        />

        <StatCard
          label="Resultados da Pesquisa"
          value={filteredSuppliers.length}
          icon={Search}
          tone="muted"
          className="col-span-2 md:col-span-1"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome, localidade, NIF, email ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-muted"
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                className="flex-1 sm:flex-none"
              >
                <ArrowUpDown className="w-4 h-4" />
                {sortOrder === "asc" ? "A-Z" : "Z-A"}
              </Button>
              <Button
                variant="outline"
                onClick={exportToCSV}
                className="flex-1 sm:flex-none"
              >
                <Download className="w-4 h-4" />
                Exportar
              </Button>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
            <span className="text-sm text-muted-foreground">
              A mostrar {currentSuppliers.length} de {filteredSuppliers.length} fornecedor(es)
            </span>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentSuppliers.map((supplier) => (
          <SupplierCard
            key={supplier.id}
            supplier={supplier}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
          />
        ))}
      </div>

      {filteredSuppliers.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Truck className="h-12 w-12 text-muted-foreground/70 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {searchTerm ? "Nenhum fornecedor encontrado" : "Nenhum fornecedor cadastrado"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm
              ? "Tente ajustar os termos de pesquisa"
              : "Comece adicionando o seu primeiro fornecedor"}
          </p>
          {!searchTerm && (
            <Button
              onClick={() => navigate("/app/add-supplier")}
            >
              <Plus className="w-4 h-4" />
              Adicionar Fornecedor
            </Button>
          )}
        </div>
      )}

      {/* Carregar mais */}
      {hasMoreVisible && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={loadMoreVisible}
            className="gap-2"
          >
            <ArrowDown className="h-4 w-4" />
            Carregar mais
          </Button>
        </div>
      )}

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirmar Exclusão</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Tem a certeza que deseja excluir o fornecedor "{supplierToDelete?.nomeEmpresa}"?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="text-foreground/90"
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FAB Mobile */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 sm:hidden">
        <Button
          onClick={() => navigate("/app/add-supplier")}
          size="icon"
          className="rounded-full shadow-lg"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default ManageSuppliers;
