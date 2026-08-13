// src/features/warehouseEquipment/ManageWarehouseEquipment.jsx
// Cadastro de Equipamentos do Armazém — inventário próprio da Nonato Service
// (distinto de "equipamentos", que são os equipamentos instalados nos clientes)
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { comparePtPt } from "../../utils/sortHelpers.js";
import {
  Search,
  Plus,
  Loader2,
  Trash2,
  Edit2,
  Eye,
  Wrench,
  Download,
  MapPin,
  Hash,
  Barcode,
  ArrowUpDown,
  ArrowDown,
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

const EquipmentCard = ({ item, onView, onEdit, onDelete }) => {
  const meta = ESTADO_META[item.estado] || ESTADO_META.operacional;

  return (
    <Card
      onClick={() => onView(item.id)}
      className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer"
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center shrink-0 overflow-hidden">
              {item.fotoPerfilUrl ? (
                <img
                  src={item.fotoPerfilUrl}
                  alt={item.nome}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Wrench className="h-5 w-5 text-orange-400" />
              )}
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
          {item.equipmentCode && (
            <Badge variant="outline" className="border-zinc-600 text-zinc-300 shrink-0">
              <Barcode className="w-3 h-3 mr-1" />
              ID: {item.equipmentCode}
            </Badge>
          )}
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

        <div className="space-y-1.5 mb-3">
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

        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            onClick={() => onView(item.id)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-xs sm:text-sm"
          >
            <Eye className="w-3.5 h-3.5 mr-1.5" />
            Visualizar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(item.id)}
            className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-900 text-xs sm:text-sm"
          >
            <Edit2 className="w-3.5 h-3.5 mr-1.5" />
            Editar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(item.id)}
            className="border-red-500/30 text-red-400 hover:bg-red-500/10 bg-zinc-900"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
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
  const [sortOrder, setSortOrder] = useState("asc");
  // Scroll infinito: lista pequena e sempre lida por inteiro, por isso não
  // há paginação por cursor à Firestore aqui — só se controla quantos dos
  // que já estão em memória são mostrados de cada vez.
  const PAGE_SIZE = 10;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // ✅ Tempo real (onSnapshot): a lista de equipamentos do armazém
  // atualiza-se sozinha quando alguém adiciona/edita/remove um equipamento,
  // sem precisar de um botão "Atualizar" manual nem de reler a coleção a
  // cada troca de ordenação (isso agora é feito em memória, ver sortedItems).
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onSnapshot(
      collection(db, "equipamentosArmazem"),
      (snapshot) => {
        setItems(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        console.error("Erro ao carregar equipamentos do armazém:", err);
        setError("Erro ao carregar equipamentos do armazém. Por favor, tente novamente.");
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const sortedItems = useMemo(() => {
    const list = [...items];
    list.sort((a, b) => {
      const cmp = comparePtPt(a.nome, b.nome);
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return list;
  }, [items, sortOrder]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchTerm, estadoFilter, sortOrder]);

  const handleView = (id) => navigate(`/app/warehouse-equipment/${id}`);
  const handleEdit = (id) => navigate(`/app/edit-warehouse-equipment/${id}`);
  const handleDelete = (id) => {
    setItemToDelete(items.find((i) => i.id === id));
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, "equipamentosArmazem", itemToDelete.id));
      // A lista atualiza-se sozinha via onSnapshot
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (err) {
      console.error("Erro ao excluir equipamento:", err);
      setError("Erro ao excluir equipamento. Por favor, tente novamente.");
    }
  };

  const filteredItems = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return sortedItems.filter((i) => {
      const matchesSearch =
        (i.nome && i.nome.toLowerCase().includes(searchLower)) ||
        (i.equipmentCode && i.equipmentCode.toLowerCase().includes(searchLower)) ||
        (i.marca && i.marca.toLowerCase().includes(searchLower)) ||
        (i.modelo && i.modelo.toLowerCase().includes(searchLower)) ||
        (i.numeroSerie && i.numeroSerie.toLowerCase().includes(searchLower)) ||
        (i.localizacao && i.localizacao.toLowerCase().includes(searchLower));
      const matchesEstado = estadoFilter === "all" || i.estado === estadoFilter;
      return matchesSearch && matchesEstado;
    });
  }, [sortedItems, searchTerm, estadoFilter]);

  const currentItems = filteredItems.slice(0, visibleCount);
  const hasMoreVisible = visibleCount < filteredItems.length;

  const loadMoreVisible = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredItems.length));
  }, [filteredItems.length]);

  const exportToCSV = () => {
    const csvContent = [
      ["ID", "Nome", "Categoria", "Marca", "Modelo", "Nº Série", "Localização", "Estado"],
      ...filteredItems.map((i) => [
        i.equipmentCode || "",
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
                placeholder="Pesquisar por ID, nome, marca, modelo, nº série ou localização..."
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
                className="flex-1 sm:flex-none bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-700"
              >
                <ArrowUpDown className="w-4 h-4 mr-2" />
                {sortOrder === "asc" ? "A-Z" : "Z-A"}
              </Button>
              <Button
                variant="outline"
                onClick={exportToCSV}
                className="flex-1 sm:flex-none bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4 pt-4 border-t border-zinc-700">
            <span className="text-sm text-zinc-400">
              A mostrar {currentItems.length} de {filteredItems.length} equipamento(s)
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
            onView={handleView}
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

      {/* Carregar mais */}
      {hasMoreVisible && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={loadMoreVisible}
            className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800 gap-2"
          >
            <ArrowDown className="h-4 w-4" />
            Carregar mais
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
              className="bg-zinc-900 border-zinc-600 text-zinc-300 hover:bg-zinc-700"
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
