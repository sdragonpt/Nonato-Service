// features/shopAccess/ManageShopAccess.jsx

import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  where,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { useAuth } from "../../hooks/useAuth";
import {
  Search,
  Plus,
  Loader2,
  Trash2,
  AlertTriangle,
  Store,
  RefreshCw,
  Copy,
  Shield,
  Mail,
  Phone,
  Building2,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";

// UI Components
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";

const generateToken = () => {
  // Gerar token de 8 caracteres alfanuméricos
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

let isMounted = true;

const ManageShopAccess = () => {
  const [accessTokens, setAccessTokens] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedToken, setCopiedToken] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    isMounted = true;
    // Função de limpeza para quando o componente for desmontado
    return () => {
      isMounted = false;
    };
  }, []);

  // Form state for new token
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    notes: "",
  });

  const { user, loading } = useAuth();

  const fetchAccessTokens = async () => {
    if (loading) return;

    try {
      setIsLoading(true);
      setError(null);

      let q;
      // Admin vê todos os tokens, outros usuários só veem os que criaram
      if (user?.role === "admin") {
        q = query(
          collection(db, "shop_access_tokens"),
          orderBy("createdAt", "desc")
        );
      } else {
        if (!user?.uid) {
          setError("Usuário não autenticado");
          setIsLoading(false);
          return;
        }

        q = query(
          collection(db, "shop_access_tokens"),
          where("createdBy", "==", user.uid),
          orderBy("createdAt", "desc")
        );
      }

      try {
        const snapshot = await getDocs(q);
        const tokensData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        if (isMounted) {
          setAccessTokens(tokensData);
        }
      } catch (err) {
        if (err.code === "failed-precondition" || err.code === "not-found") {
          setAccessTokens([]);
          console.log(
            "A coleção de tokens ainda não existe ou índices não estão prontos"
          );
        }
        if (isMounted) {
          throw err;
        }
      }
    } catch (err) {
      console.error("Erro ao buscar tokens de acesso:", err);
      // Verificar se o componente ainda está montado
      if (isMounted) {
        setError("Erro ao carregar dados. Por favor, tente novamente.");
      }
    } finally {
      if (isMounted) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!loading) {
      fetchAccessTokens();
    }
  }, [loading, user?.uid]);

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddToken = async () => {
    // Validação básica
    if (!formData.name || !formData.email) {
      setError("Nome e e-mail são obrigatórios.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Gerar token único
      const token = generateToken();

      // Adicionar token ao Firestore
      await addDoc(collection(db, "shop_access_tokens"), {
        token,
        name: formData.name,
        company: formData.company || "",
        email: formData.email,
        phone: formData.phone || "",
        notes: formData.notes || "",
        createdBy: user.uid,
        createdByName: user.displayName || "Usuário do sistema",
        createdAt: serverTimestamp(),
        status: "active", // active, revoked
      });

      // Limpar formulário e fechar diálogo
      setFormData({
        name: "",
        company: "",
        email: "",
        phone: "",
        notes: "",
      });
      setShowAddDialog(false);

      // Atualizar lista
      fetchAccessTokens();
    } catch (err) {
      console.error("Erro ao adicionar token de acesso:", err);
      setError("Erro ao adicionar token. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTokenStatus = async (tokenId, currentStatus) => {
    try {
      const newStatus = currentStatus === "active" ? "revoked" : "active";
      await updateDoc(doc(db, "shop_access_tokens", tokenId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      // Se estiver revogando o token, adicione campo de timestamp de revogação
      if (newStatus === "revoked") {
        await updateDoc(doc(db, "shop_access_tokens", tokenId), {
          revokedAt: serverTimestamp(),
        });
      }

      fetchAccessTokens();
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      setError("Erro ao atualizar status. Por favor, tente novamente.");
    }
  };

  const deleteToken = async (tokenId) => {
    if (
      !confirm(
        "Tem certeza que deseja excluir este token de acesso? Esta ação não pode ser desfeita e removerá o acesso à loja."
      )
    )
      return;

    try {
      await deleteDoc(doc(db, "shop_access_tokens", tokenId));
      fetchAccessTokens();
    } catch (err) {
      console.error("Erro ao excluir token:", err);
      setError("Erro ao excluir token. Por favor, tente novamente.");
    }
  };

  const copyToClipboard = (token) => {
    navigator.clipboard.writeText(token).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    });
  };

  const filteredTokens = accessTokens.filter((token) => {
    return (
      token.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.token?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Pagination
  const indexOfLastToken = currentPage * itemsPerPage;
  const indexOfFirstToken = indexOfLastToken - itemsPerPage;
  const currentTokens = filteredTokens.slice(
    indexOfFirstToken,
    indexOfLastToken
  );
  const totalPages = Math.ceil(filteredTokens.length / itemsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0);
  };

  if (loading || isLoading) {
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
            Acesso à Loja
          </h1>
          <p className="text-sm sm:text-base text-zinc-400">
            Gerencie tokens de acesso para a loja online
          </p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Token
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">
                Total de Tokens
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {accessTokens.length}
              </h3>
            </div>
            <Store className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Ativos</p>
              <h3 className="text-xl sm:text-2xl font-bold text-green-500 mt-1 sm:mt-2">
                {accessTokens.filter((t) => t.status === "active").length}
              </h3>
            </div>
            <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Revogados</p>
              <h3 className="text-xl sm:text-2xl font-bold text-red-500 mt-1 sm:mt-2">
                {accessTokens.filter((t) => t.status === "revoked").length}
              </h3>
            </div>
            <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Buscar por nome, email, empresa ou token..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>

            <Button
              variant="outline"
              onClick={fetchAccessTokens}
              className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-600"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
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

      {/* Tokens List */}
      {currentTokens.length === 0 ? (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-8 text-center">
            <Store className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2 text-white">
              Nenhum token de acesso encontrado
            </p>
            <p className="text-zinc-400">
              Adicione um novo token para permitir acesso à loja online
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {currentTokens.map((token) => (
            <Card key={token.id} className="bg-zinc-800 border-zinc-700">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{token.name}</h3>
                      <Badge
                        className={`${
                          token.status === "active"
                            ? "bg-green-500/10 text-green-500"
                            : "bg-red-500/10 text-red-500"
                        }`}
                      >
                        {token.status === "active" ? "Ativo" : "Revogado"}
                      </Badge>
                    </div>
                    {token.company && (
                      <p className="text-sm text-zinc-400 flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {token.company}
                      </p>
                    )}
                    <p className="text-sm text-zinc-400 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {token.email}
                    </p>
                    {token.phone && (
                      <p className="text-sm text-zinc-400 flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {token.phone}
                      </p>
                    )}
                    <div className="flex items-center mt-2">
                      <p className="text-sm font-medium text-white">
                        Token: <span className="font-mono">{token.token}</span>
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-6 px-2 text-zinc-400 hover:text-white"
                        onClick={() => copyToClipboard(token.token)}
                      >
                        {copiedToken === token.token ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Criado por: {token.createdByName} em{" "}
                      {formatDate(token.createdAt)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`${
                        token.status === "active"
                          ? "border-red-600 text-white hover:bg-red-500/20 bg-red-600"
                          : "border-green-600 text-white hover:bg-green-500/20 bg-green-600"
                      }`}
                      onClick={() => toggleTokenStatus(token.id, token.status)}
                    >
                      {token.status === "active" ? "Revogar" : "Ativar"}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                      onClick={() => deleteToken(token.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
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

          {currentPage > 3 && (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={() => paginate(1)}
                className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800"
              >
                1
              </Button>
              {currentPage > 4 && <span className="text-zinc-400">...</span>}
            </>
          )}

          {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
            let pageNumber;
            if (totalPages <= 5) {
              pageNumber = i + 1;
            } else if (currentPage <= 3) {
              pageNumber = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNumber = totalPages - 4 + i;
            } else {
              pageNumber = currentPage - 2 + i;
            }

            if (pageNumber >= 1 && pageNumber <= totalPages) {
              return (
                <Button
                  key={pageNumber}
                  variant={currentPage === pageNumber ? "secondary" : "outline"}
                  size="icon"
                  onClick={() => paginate(pageNumber)}
                  className={`border-zinc-700 ${
                    currentPage === pageNumber
                      ? "bg-zinc-700 text-white hover:bg-zinc-600"
                      : "text-white hover:bg-zinc-700 bg-zinc-800"
                  }`}
                >
                  {pageNumber}
                </Button>
              );
            }
            return null;
          })}

          {currentPage < totalPages - 2 && (
            <>
              {currentPage < totalPages - 3 && (
                <span className="text-zinc-400">...</span>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => paginate(totalPages)}
                className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800"
              >
                {totalPages}
              </Button>
            </>
          )}

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

      {/* Add Token Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-zinc-800 border-zinc-700 text-white">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Token de Acesso</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Preencha os dados para criar um novo token de acesso à loja online
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">
                  Nome*
                </label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="bg-zinc-700 border-zinc-600 text-white"
                  placeholder="Nome do responsável"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">
                  Empresa
                </label>
                <Input
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  className="bg-zinc-700 border-zinc-600 text-white"
                  placeholder="Nome da empresa (opcional)"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">
                  Email*
                </label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="bg-zinc-700 border-zinc-600 text-white"
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">
                  Telefone
                </label>
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="bg-zinc-700 border-zinc-600 text-white"
                  placeholder="Telefone (opcional)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Observações
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                className="w-full p-3 rounded-md border border-zinc-600 bg-zinc-700 text-white"
                placeholder="Observações (opcional)"
                rows="3"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              className="border-zinc-600 text-white hover:bg-zinc-700 bg-zin"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddToken}
              disabled={isSubmitting || !formData.name || !formData.email}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                "Gerar Token"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageShopAccess;
