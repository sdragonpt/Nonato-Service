// src/features/warehouseEquipment/ManageWarehouseEquipment.jsx
// Cadastro de Equipamentos do Armazém — inventário próprio da Nonato Service
// (distinto de "equipamentos", que são os equipamentos instalados nos clientes)
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase.jsx";
import {
  Search,
  Plus,
  Loader2,
  MoreVertical,
  Trash2,
  Edit2,
  Wrench,
  Download,
  RefreshCw,
  MapPin,
  Hash,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Layers,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
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

export const ESTADO_META = {
  operacional: { label: "Operacional", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  manutencao: { label: "Em Manutenção", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  avariado: { label: "Avariado", className: "bg-red-500/20 text-red-400 border-red-500/30" },
  fora_servico: { label: "Fora de Serviço", className: "bg-zinc-600/40 text-zinc-400 border-zinc-600" },
};

const EquipmentCard = ({ item, onEdit, onDelete }) => {
  const meta = ESTADO_META[item.estado] || ESTADO_META.operacional;

  const confirmDelete = (e) => {
    e.stopPropagation();
    onDelete(item.id);
  };

  return (
    <Card
      onClick={() => onEdit(item.id)}
      className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer"
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
              <Wrench className="h-5 w-5 text-orange-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-white truncate" title={item.nome}>
                {item.nome || "Sem nome"}
              </h3>
              <p className="text-sm text-zinc-400 truncate">
                {item.marca} {item.modelo}
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
              className="bg-zinc-800 border-zinc-700"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem onClick={() => onEdit(item.id)}>
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

        <div className="flex items-center gap-2 flex-wrap mb-2">
          <Badge className={`${meta.className} border`}>{meta.label}</Badge>
          {item.familyName && (
            <Badge variant="outline" className="border-zinc-600 text-zinc-400 text-xs">
              <Layers className="w-3 h-3 mr-1" />
              {item.familyName}
              {item.groupName ? ` > ${item.groupName}` : ""}
            </Badge>
          )}
        </div>

        <div className="space-y-1.5">
          {item.localizacao && (
            <p className="text-zinc-400 text-xs sm:text-sm truncate flex items-center gap-2">
              <MapPin className="w-4 h-4 shrink-0" />
              {item.localizacao}
            </p>
          )}
          {item.numeroSerie && (
            <p className="text-zinc-400 text-xs sm:text-sm truncate flex items-center gap-2">
              <Hash className="w-4 h-4 shrink-0" />
              {item.numeroSerie}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const ManageWarehouseEquipment = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState("asc");
  const itemsPerPage = 12;

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const q = query(collection(db, "equipamentosArmazem"), orderBy("nome", sortOrder));
      const snapshot = await getDocs(q);
      setItems(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Erro ao carregar equipamentos do armazém:", err);
      setError("Erro ao carregar equipamentos do armazém. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [sortOrder]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, estadoFilter, sortOrder]);

  const handleEdit = (id) => navigate(`/app/edit-warehouse-equipment/${id}`);
  const handleDelete = (id) => {
    setItemToDelete(items.find((i) => i.id === id));
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, "equipamentosArmazem", itemToDelete.id));
      setItems((prev) => prev.filter((i) => i.id !== itemToDelete.id));
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (err) {
      console.error("Erro ao excluir equipamento:", err);
      setError("Erro ao excluir equipamento. Por favor, tente novamente.");
    }
  };

  const filteredItems = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return items.filter((i) => {
      const matchesSearch =
        (i.nome && i.nome.toLowerCase().includes(searchLower)) ||
        (i.marca && i.marca.toLowerCase().includes(searchLower)) ||
        (i.modelo && i.modelo.toLowerCase().includes(searchLower)) ||
        (i.numeroSerie && i.numeroSerie.toLowerCase().includes(searchLower)) ||
        (i.localizacao && i.localizacao.toLowerCase().includes(searchLower));
      const matchesEstado = estadoFilter === "all" || i.estado === estadoFilter;
      return matchesSearch && matchesEstado;
    });
  }, [items, searchTerm, estadoFilter]);

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const paginate = (page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const exportToCSV = () => {
    const csvContent = [
      ["Nome", "Categoria", "Marca", "Modelo", "Nº Série", "Localização", "Estado"],
      ...filteredItems.map((i) => [
        i.nome || "",
        i.categoria || "",
        i.marca || "",
        i.modelo || "",
        i.numeroSerie || "",
        i.localizacao || "",
        ESTADO_META[i.estado]?.label || "",
      ]),
    ]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "equipamentos-armazem.csv";
    link.click();
  };

  if (isLoading) {
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
            Equipamentos do Armazém
          </h1>
          <p className="text-sm sm:text-base text-zinc-400">
            Inventário de equipamento industrial próprio da Nonato Service
          </p>
        </div>
        <div className="hidden sm:flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/app/equipment-families")}
            className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-900"
          >
            <Layers className="w-4 h-4 mr-2" />
            Famílias / Grupos
          </Button>
          <Button
            onClick={() => navigate("/app/add-warehouse-equipment")}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Equipamento
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Total</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {items.length}
              </h3>
            </div>
            <Wrench className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Operacionais</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {items.filter((i) => i.estado === "operacional").length}
              </h3>
            </div>
            <Wrench className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Em Manutenção/Avariados</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {items.filter((i) => i.estado === "manutencao" || i.estado === "avariado").length}
              </h3>
            </div>
            <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Resultados</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {filteredItems.length}
              </h3>
            </div>
            <Search className="h-6 w-6 sm:h-8 sm:w-8 text-zinc-500" />
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Pesquisar por nome, marca, modelo, nº série ou localização..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-700 border-zinc-600 text-white placeholder:text-zinc-400"
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto flex-wrap">
              <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                <SelectTrigger className="w-full sm:w-48 bg-zinc-900 border-zinc-700 text-white">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectItem value="all">Todos os estados</SelectItem>
                  {Object.entries(ESTADO_META).map(([value, meta]) => (
                    <SelectItem key={value} value={value}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                className="flex-1 sm:flex-none border-zinc-700 text-white hover:bg-zinc-700"
              >
                <ArrowUpDown className="w-4 h-4 mr-2" />
                {sortOrder === "asc" ? "A-Z" : "Z-A"}
              </Button>
              <Button
                variant="outline"
                onClick={fetchItems}
                className="flex-1 sm:flex-none border-zinc-700 text-white hover:bg-zinc-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
              <Button
                variant="outline"
                onClick={exportToCSV}
                className="flex-1 sm:flex-none border-zinc-700 text-white hover:bg-zinc-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4 pt-4 border-t border-zinc-700">
            <span className="text-sm text-zinc-400">
              {filteredItems.length} equipamento(s) encontrado(s) - Página {currentPage} de{" "}
              {totalPages || 1}
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
        {currentItems.map((item) => (
          <EquipmentCard
            key={item.id}
            item={item}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {filteredItems.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Wrench className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            {searchTerm || estadoFilter !== "all"
              ? "Nenhum equipamento encontrado"
              : "Nenhum equipamento cadastrado"}
          </h3>
          <p className="text-zinc-400 mb-4">
            {searchTerm || estadoFilter !== "all"
              ? "Tente ajustar os termos de pesquisa ou o filtro"
              : "Comece adicionando o primeiro equipamento do armazém"}
          </p>
          {!searchTerm && estadoFilter === "all" && (
            <Button
              onClick={() => navigate("/app/add-warehouse-equipment")}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Equipamento
            </Button>
          )}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
            className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <Button
              key={i + 1}
              variant={currentPage === i + 1 ? "secondary" : "outline"}
              size="icon"
              onClick={() => paginate(i + 1)}
              className={`border-zinc-700 ${
                currentPage === i + 1
                  ? "bg-zinc-700 text-white hover:bg-zinc-600"
                  : "text-white hover:bg-zinc-700 bg-zinc-800"
              }`}
            >
              {i + 1}
            </Button>
          ))}
          <Button
            variant="outline"
            size="icon"
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800 disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar Exclusão</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem a certeza que deseja excluir o equipamento &ldquo;{itemToDelete?.nome}&rdquo;?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-zinc-600 text-zinc-300 hover:bg-zinc-700"
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
          onClick={() => navigate("/app/add-warehouse-equipment")}
          size="icon"
          className="rounded-full shadow-lg bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default ManageWarehouseEquipment;
