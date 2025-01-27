import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase.jsx";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Loader2,
  MoreVertical,
  Edit2,
  Trash2,
  Settings,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Layers,
  ListChecks,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ChecklistTypeCard = ({
  type,
  onDelete,
  onEdit,
  onToggleExpand,
  isExpanded,
}) => (
  <Card className="bg-zinc-800 border-zinc-700">
    <div
      className="cursor-pointer hover:bg-zinc-700 transition-colors"
      onClick={onToggleExpand}
    >
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center flex-grow min-w-0 gap-4">
          <div className="h-12 w-12 rounded-full bg-green-600 flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0 flex-grow">
            <div className="flex items-center">
              <h3 className="font-semibold text-white truncate">{type.type}</h3>
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-zinc-400 ml-2" />
              ) : (
                <ChevronRight className="w-5 h-5 text-zinc-400 ml-2" />
              )}
            </div>
            <div className="flex items-center text-zinc-400 text-sm">
              <Layers className="w-4 h-4 mr-1" />
              <span>{type.groups?.length || 0} grupo(s)</span>
              <ListChecks className="w-4 h-4 ml-3 mr-1" />
              <span>
                {type.groups?.reduce(
                  (total, group) =>
                    total + (group.characteristics?.length || 0),
                  0
                )}{" "}
                característica(s)
              </span>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-zinc-800 text-white hover:text-white/50"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-zinc-800 border-zinc-700"
          >
            <DropdownMenuItem
              onClick={onEdit}
              className="text-white hover:bg-zinc-700"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              className="text-red-400 hover:bg-zinc-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </div>

    {isExpanded && type.groups && type.groups.length > 0 && (
      <div className="border-t border-zinc-700">
        {type.groups.map((group, index) => (
          <div
            key={index}
            className="p-4 hover:bg-zinc-700 border-b last:border-b-0 border-zinc-700"
          >
            <h4 className="text-white font-medium mb-2">{group.name}</h4>
            <div className="pl-4 space-y-1">
              {group.characteristics?.map((char, charIndex) => (
                <div key={charIndex} className="text-zinc-400 text-sm">
                  • {char}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )}
  </Card>
);

const ManageChecklist = () => {
  const [types, setTypes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTypes, setExpandedTypes] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        setIsLoading(true);
        const q = query(
          collection(db, "checklist_machines"),
          orderBy("type", "asc")
        );
        const snapshot = await getDocs(q);
        setTypes(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setError(null);
      } catch (err) {
        console.error("Erro ao carregar tipos:", err);
        setError("Erro ao carregar tipos. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTypes();
  }, []);

  const handleDelete = async (typeId, e) => {
    e.stopPropagation();
    if (!window.confirm("Tem certeza que deseja deletar este tipo?")) return;

    try {
      await deleteDoc(doc(db, "checklist_machines", typeId));
      setTypes(types.filter((type) => type.id !== typeId));
    } catch (error) {
      console.error("Erro ao deletar tipo:", error);
      setError("Erro ao deletar tipo. Por favor, tente novamente.");
    }
  };

  const toggleExpand = (typeId) => {
    setExpandedTypes((prev) => ({ ...prev, [typeId]: !prev[typeId] }));
  };

  const filteredTypes = types.filter((type) =>
    type.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4">
      <Card className="mb-8 bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-white">
            Checklist
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Buscar tipos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
            />
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

          <div className="flex justify-between items-center">
            <span className="text-zinc-400 text-sm">
              {filteredTypes.length} tipo(s)
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4 mb-24">
        {filteredTypes.length > 0 ? (
          filteredTypes.map((type) => (
            <ChecklistTypeCard
              key={type.id}
              type={type}
              isExpanded={expandedTypes[type.id]}
              onToggleExpand={() => toggleExpand(type.id)}
              onEdit={(e) => {
                e.stopPropagation();
                navigate(`/app/edit-checklist-type/${type.id}`);
              }}
              onDelete={(e) => handleDelete(type.id, e)}
            />
          ))
        ) : (
          <Card className="py-12 bg-zinc-800 border-zinc-700">
            <CardContent className="text-center">
              <Search className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2 text-white">
                Nenhum tipo encontrado
              </p>
              <p className="text-zinc-400">
                Tente ajustar sua busca ou adicione um novo tipo
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="fixed bottom-6 right-6">
        <Button
          size="lg"
          onClick={() => navigate("/app/add-checklist-type")}
          className="rounded-full shadow-lg bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-5 h-5 md:mr-2" />
          <span className="hidden md:inline">Novo Tipo</span>
        </Button>
      </div>
    </div>
  );
};

export default ManageChecklist;
