import React, { useState, useEffect, useCallback } from "react";
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
  UserPlus,
  Loader2,
  Edit2,
  Trash2,
  ArrowUpDown,
  AlertTriangle,
  Phone,
  Map,
  MoreVertical,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ManageClients = () => {
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const navigate = useNavigate();

  const fetchClients = useCallback(async () => {
    try {
      setIsLoading(true);
      const q = query(collection(db, "clientes"), orderBy("name", sortOrder));
      const snapshot = await getDocs(q);
      setClients(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setError(null);
    } catch (err) {
      console.error("Erro ao buscar clientes:", err);
      setError("Erro ao carregar clientes. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [sortOrder]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleDelete = async (clientId, e) => {
    e.stopPropagation();
    if (!window.confirm("Tem certeza que deseja deletar este cliente?")) return;

    try {
      await deleteDoc(doc(db, "clientes", clientId));
      setClients((prev) => prev.filter((client) => client.id !== clientId));
    } catch (error) {
      console.error("Erro ao deletar cliente:", error);
      setError("Erro ao deletar cliente. Por favor, tente novamente.");
    }
  };

  const filteredClients = clients.filter(
    (client) =>
      client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone?.includes(searchTerm) ||
      client.address?.toLowerCase().includes(searchTerm.toLowerCase())
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
            Gerenciar Clientes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Buscar por nome, telefone ou endereço..."
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
            <Button
              variant="ghost"
              onClick={() =>
                setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
              }
              className="gap-2 text-white hover:text-white bg-green-600 hover:bg-green-700"
            >
              <ArrowUpDown className="w-4 h-4" />
              <span>{sortOrder === "asc" ? "A-Z" : "Z-A"}</span>
            </Button>
            <span className="text-zinc-400 text-sm">
              {filteredClients.length} cliente(s)
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3 mb-24">
        {filteredClients.map((client) => (
          <Card
            key={client.id}
            onClick={() => navigate(`/app/client/${client.id}`)}
            className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="relative w-14 h-14 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                <img
                  src={client.profilePic || "/nonato.png"}
                  alt={client.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = "/nonato.png";
                    e.target.onerror = null;
                  }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg text-white truncate">
                  {client.name}
                </h3>
                <div className="space-y-1">
                  {client.phone && (
                    <p className="text-zinc-400 text-sm truncate flex items-center gap-2">
                      <Phone className="w-4 h-4 shrink-0" />
                      {client.phone}
                    </p>
                  )}
                  {client.address && (
                    <p className="text-zinc-400 text-sm truncate flex items-center gap-2">
                      <Map className="w-4 h-4 shrink-0" />
                      {client.address}
                    </p>
                  )}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger
                  asChild
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full hover:bg-zinc-800 text-white hover:text-white/50"
                  >
                    <span className="sr-only">Abrir menu</span>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onClick={(e) => e.stopPropagation()}
                  className="bg-zinc-800 border-zinc-700"
                >
                  <DropdownMenuItem
                    onClick={() => navigate(`/app/edit-client/${client.id}`)}
                    className="text-white hover:bg-zinc-700"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-400 hover:bg-zinc-700 focus:text-red-400"
                    onClick={(e) => handleDelete(client.id, e)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        ))}

        {filteredClients.length === 0 && (
          <Card className="py-12 bg-zinc-800 border-zinc-700">
            <CardContent className="text-center">
              <Search className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2 text-white">
                Nenhum cliente encontrado
              </p>
              <p className="text-zinc-400">
                Tente ajustar sua busca ou adicione um novo cliente
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          onClick={() => navigate("/app/add-client")}
          className="rounded-full shadow-lg bg-green-600 hover:bg-green-700"
        >
          <UserPlus className="w-5 h-5 md:mr-2" />
          <span className="hidden md:inline">Novo Cliente</span>
        </Button>
      </div>
    </div>
  );
};

export default ManageClients;
