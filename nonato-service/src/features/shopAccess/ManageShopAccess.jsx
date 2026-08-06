// ManageShopAccess.jsx - Atualizado com recursos de aprovação

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
  Mail,
  Phone,
  Building2,
  ChevronLeft,
  ChevronRight,
  Check,
  Share2,
  ExternalLink,
  Clock,
  Calendar,
  User,
  Info,
  XCircle,
  CheckCircle2,
  Clock8,
} from "lucide-react";
import QRCode from "react-qr-code";

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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible.jsx";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.jsx";

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
  const [activeTab, setActiveTab] = useState("all");
  const itemsPerPage = 10;

  // Novos estados para compartilhamento
  const [tokenToShare, setTokenToShare] = useState(null);
  const [shareUrl, setShareUrl] = useState("");
  const [showShareDialog, setShowShareDialog] = useState(false);

  // Estados para modais de aprovação/rejeição
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [tokenToApprove, setTokenToApprove] = useState(null);
  const [tokenToReject, setTokenToReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [tokenToDelete, setTokenToDelete] = useState(null);

  // Estado para exibição de detalhes do token
  const [expandedTokens, setExpandedTokens] = useState({});

  useEffect(() => {
    isMounted = true;
    // Função de limpeza para quando o componente for desmontado
    return () => {
      isMounted = false;
    };
  }, []);

  // Form state for new token - Agora simplificado com apenas nome
  const [formData, setFormData] = useState({
    name: "",
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
      hour: "2-digit",
      minute: "2-digit",
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
    if (!formData.name) {
      setError("Nome é obrigatório.");
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
        company: "",
        email: "",
        phone: "",
        notes: "",
        createdBy: user.uid,
        createdByName: user.displayName || "Usuário do sistema",
        createdAt: serverTimestamp(),
        status: "active", // active, revoked
        isComplete: false, // Indica se o usuário já preencheu suas informações
        accessStatus: null, // null, pending, approved, rejected
      });

      // Limpar formulário e fechar diálogo
      setFormData({
        name: "",
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

  const approveAccess = async () => {
    if (!tokenToApprove) return;

    try {
      setIsSubmitting(true);
      await updateDoc(doc(db, "shop_access_tokens", tokenToApprove.id), {
        accessStatus: "approved",
        approvedAt: serverTimestamp(),
        approvedBy: user.uid,
        approvedByName: user.displayName || "Administrador",
        updatedAt: serverTimestamp(),
      });

      setShowApproveDialog(false);
      setTokenToApprove(null);
      fetchAccessTokens();

      // Opcional: Enviar notificação para o usuário
      // await sendApprovalNotification(tokenToApprove.email);
    } catch (error) {
      console.error("Erro ao aprovar acesso:", error);
      setError("Erro ao aprovar acesso. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const rejectAccess = async () => {
    if (!tokenToReject) return;

    try {
      setIsSubmitting(true);
      await updateDoc(doc(db, "shop_access_tokens", tokenToReject.id), {
        accessStatus: "rejected",
        rejectedAt: serverTimestamp(),
        rejectedBy: user.uid,
        rejectedByName: user.displayName || "Administrador",
        rejectionReason: rejectionReason,
        updatedAt: serverTimestamp(),
      });

      setShowRejectDialog(false);
      setTokenToReject(null);
      setRejectionReason("");
      fetchAccessTokens();

      // Opcional: Enviar notificação para o usuário
      // await sendRejectionNotification(tokenToReject.email, rejectionReason);
    } catch (error) {
      console.error("Erro ao rejeitar acesso:", error);
      setError("Erro ao rejeitar acesso. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteToken = (token) => {
    setTokenToDelete(token);
    setShowDeleteDialog(true);
  };

  const deleteToken = async () => {
    if (!tokenToDelete) return;

    try {
      await deleteDoc(doc(db, "shop_access_tokens", tokenToDelete.id));
      setShowDeleteDialog(false);
      setTokenToDelete(null);
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

  // Nova função para compartilhar token
  const handleShareToken = (token) => {
    // Criar um link de acesso direto com o token
    const shopUrl = `${window.location.origin}/loja?token=${token.token}`;

    // Verificar se a API de compartilhamento está disponível (dispositivos móveis)
    if (navigator.share) {
      navigator
        .share({
          title: "Acesso à Loja Nonato Service",
          text: `Olá ${token.name}, aqui está seu link de acesso à loja Nonato Service. Basta clicar no link abaixo:`,
          url: shopUrl,
        })
        .then(() => console.log("Token compartilhado com sucesso"))
        .catch((error) => console.error("Erro ao compartilhar:", error));
    } else {
      // Fallback para dispositivos que não suportam a API de compartilhamento
      // Mostrar diálogo com QR Code e outras opções
      setTokenToShare(token);
      setShareUrl(shopUrl);
      setShowShareDialog(true);
    }
  };

  // Toggle para expandir/contrair detalhes do token
  const toggleExpandToken = (tokenId) => {
    setExpandedTokens((prev) => ({
      ...prev,
      [tokenId]: !prev[tokenId],
    }));
  };

  // Obter contagens para as abas
  const getPendingCount = () => {
    return accessTokens.filter((t) => t.accessStatus === "pending").length;
  };

  const getApprovedCount = () => {
    return accessTokens.filter((t) => t.accessStatus === "approved").length;
  };

  const getRejectedCount = () => {
    return accessTokens.filter((t) => t.accessStatus === "rejected").length;
  };

  const getUncompletedCount = () => {
    return accessTokens.filter((t) => !t.isComplete).length;
  };

  // Filtragem por abas e termo de busca
  const filteredTokens = accessTokens.filter((token) => {
    // Filtrar por aba selecionada
    if (activeTab === "pending" && token.accessStatus !== "pending")
      return false;
    if (activeTab === "approved" && token.accessStatus !== "approved")
      return false;
    if (activeTab === "rejected" && token.accessStatus !== "rejected")
      return false;
    if (activeTab === "uncompleted" && token.isComplete) return false;

    // Filtrar por termo de busca
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

  // Renderizar badge de status de acesso
  const renderAccessStatusBadge = (token) => {
    if (!token.isComplete) {
      return (
        <Badge className="bg-zinc-500/10 text-zinc-400">Não Preenchido</Badge>
      );
    }

    if (token.accessStatus === "pending") {
      return (
        <Badge className="bg-amber-500/10 text-amber-500 flex items-center gap-1">
          <Clock8 className="h-3 w-3" />
          Pendente
        </Badge>
      );
    }

    if (token.accessStatus === "approved") {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-500 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Aprovado
        </Badge>
      );
    }

    if (token.accessStatus === "rejected") {
      return (
        <Badge className="bg-red-500/10 text-red-500 flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Rejeitado
        </Badge>
      );
    }

    return null;
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
              <p className="text-sm font-medium text-zinc-400">Pendentes</p>
              <h3 className="text-xl sm:text-2xl font-bold text-amber-500 mt-1 sm:mt-2">
                {getPendingCount()}
              </h3>
            </div>
            <Clock8 className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Aprovados</p>
              <h3 className="text-xl sm:text-2xl font-bold text-emerald-500 mt-1 sm:mt-2">
                {getApprovedCount()}
              </h3>
            </div>
            <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Rejeitados</p>
              <h3 className="text-xl sm:text-2xl font-bold text-red-500 mt-1 sm:mt-2">
                {getRejectedCount()}
              </h3>
            </div>
            <XCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">
                Não Preenchidos
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-zinc-400 mt-1 sm:mt-2">
                {getUncompletedCount()}
              </h3>
            </div>
            <User className="h-6 w-6 sm:h-8 sm:w-8 text-zinc-400" />
          </CardContent>
        </Card>
      </div>

      {/* Search and Tabs */}
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

          <Tabs
            defaultValue="all"
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="w-full grid grid-cols-5 bg-zinc-900 border border-zinc-700">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-zinc-700"
              >
                Todos
              </TabsTrigger>
              <TabsTrigger
                value="pending"
                className="data-[state=active]:bg-zinc-700"
              >
                Pendentes ({getPendingCount()})
              </TabsTrigger>
              <TabsTrigger
                value="approved"
                className="data-[state=active]:bg-zinc-700"
              >
                Aprovados ({getApprovedCount()})
              </TabsTrigger>
              <TabsTrigger
                value="rejected"
                className="data-[state=active]:bg-zinc-700"
              >
                Rejeitados ({getRejectedCount()})
              </TabsTrigger>
              <TabsTrigger
                value="uncompleted"
                className="data-[state=active]:bg-zinc-700"
              >
                Não Preenchidos ({getUncompletedCount()})
              </TabsTrigger>
            </TabsList>
          </Tabs>
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
              {searchTerm
                ? "Tente ajustar os filtros ou buscar por outro termo."
                : "Adicione um novo token para permitir acesso à loja online."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {currentTokens.map((token) => (
            <Collapsible
              key={token.id}
              open={expandedTokens[token.id]}
              onOpenChange={() => toggleExpandToken(token.id)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden transition-all duration-200"
            >
              <div className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
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

                      {renderAccessStatusBadge(token)}
                    </div>
                    {token.isComplete && token.company && (
                      <p className="text-sm text-zinc-400 flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {token.company}
                      </p>
                    )}
                    {token.isComplete && token.email && (
                      <p className="text-sm text-zinc-400 flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {token.email}
                      </p>
                    )}
                    {token.isComplete && token.phone && (
                      <p className="text-sm text-zinc-400 flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {token.phone}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center mt-2 gap-2">
                      <p className="text-sm font-medium text-white">
                        Token: <span className="font-mono">{token.token}</span>
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-zinc-400 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(token.token);
                        }}
                      >
                        {copiedToken === token.token ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>

                      {/* Botão de compartilhamento */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-zinc-400 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShareToken(token);
                        }}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500">
                      <span className="flex items-center">
                        <Calendar className="h-3.5 w-3.5 mr-1" />
                        Criado: {formatDate(token.createdAt)}
                      </span>

                      {token.requestedAt && (
                        <span className="flex items-center">
                          <Clock className="h-3.5 w-3.5 mr-1" />
                          Solicitado: {formatDate(token.requestedAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <CollapsibleTrigger
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-700"
                      >
                        <Info className="h-4 w-4 mr-1" />
                        {expandedTokens[token.id] ? "Ocultar" : "Detalhes"}
                      </Button>
                    </CollapsibleTrigger>

                    {/* Botões de aprovação/rejeição para solicitações pendentes */}
                    {token.accessStatus === "pending" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-emerald-600 text-white bg-emerald-600 hover:bg-emerald-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTokenToApprove(token);
                            setShowApproveDialog(true);
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-600 text-white bg-red-600 hover:bg-red-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTokenToReject(token);
                            setShowRejectDialog(true);
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Rejeitar
                        </Button>
                      </>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className={`${
                        token.status === "active"
                          ? "border-red-600 text-white hover:bg-red-500/20 bg-red-600"
                          : "border-green-600 text-white hover:bg-green-500/20 bg-green-600"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTokenStatus(token.id, token.status);
                      }}
                    >
                      {token.status === "active" ? "Revogar" : "Ativar"}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDeleteToken(token);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </div>

              {/* Conteúdo expandido com detalhes do token */}
              <CollapsibleContent>
                <div className="px-4 pb-4 pt-2 border-t border-zinc-700 bg-zinc-800/50">
                  <div className="space-y-4">
                    {token.isComplete ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-zinc-400">
                              Informações do Contato
                            </p>
                            <div className="bg-zinc-900/50 rounded-lg p-3 space-y-2">
                              <div>
                                <p className="text-xs text-zinc-500">Nome</p>
                                <p className="text-sm text-white">
                                  {token.name || "Não informado"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-zinc-500">Email</p>
                                <p className="text-sm text-white">
                                  {token.email || "Não informado"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-zinc-500">
                                  Telemóvel
                                </p>
                                <p className="text-sm text-white">
                                  {token.phone || "Não informado"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-zinc-500">Empresa</p>
                                <p className="text-sm text-white">
                                  {token.company || "Não informado"}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <p className="text-sm font-medium text-zinc-400">
                              Observações
                            </p>
                            <div className="bg-zinc-900/50 rounded-lg p-3 min-h-[100px]">
                              <p className="text-sm text-white whitespace-pre-line">
                                {token.notes || "Nenhuma observação fornecida."}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-sm font-medium text-zinc-400">
                            Histórico de Acesso
                          </p>
                          <div className="bg-zinc-900/50 rounded-lg p-3">
                            <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs">
                              <div>
                                <p className="text-zinc-500">Criado por:</p>
                                <p className="text-white">
                                  {token.createdByName || "Sistema"}
                                </p>
                                <p className="text-white">
                                  {formatDate(token.createdAt)}
                                </p>
                              </div>

                              {token.requestedAt && (
                                <div>
                                  <p className="text-zinc-500">
                                    Acesso solicitado em:
                                  </p>
                                  <p className="text-white">
                                    {formatDate(token.requestedAt)}
                                  </p>
                                </div>
                              )}

                              {token.accessStatus === "approved" &&
                                token.approvedAt && (
                                  <div>
                                    <p className="text-zinc-500">
                                      Aprovado por:
                                    </p>
                                    <p className="text-white">
                                      {token.approvedByName || "Administrador"}
                                    </p>
                                    <p className="text-white">
                                      {formatDate(token.approvedAt)}
                                    </p>
                                  </div>
                                )}

                              {token.accessStatus === "rejected" &&
                                token.rejectedAt && (
                                  <div>
                                    <p className="text-zinc-500">
                                      Rejeitado por:
                                    </p>
                                    <p className="text-white">
                                      {token.rejectedByName || "Administrador"}
                                    </p>
                                    <p className="text-white">
                                      {formatDate(token.rejectedAt)}
                                    </p>
                                  </div>
                                )}

                              {token.updatedAt && (
                                <div>
                                  <p className="text-zinc-500">
                                    Última atualização:
                                  </p>
                                  <p className="text-white">
                                    {formatDate(token.updatedAt)}
                                  </p>
                                </div>
                              )}

                              {token.lastAccess && (
                                <div>
                                  <p className="text-zinc-500">
                                    Último acesso:
                                  </p>
                                  <p className="text-white">
                                    {formatDate(token.lastAccess)}
                                  </p>
                                </div>
                              )}

                              {token.revokedAt && (
                                <div>
                                  <p className="text-zinc-500">Revogado em:</p>
                                  <p className="text-white">
                                    {formatDate(token.revokedAt)}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {token.accessStatus === "rejected" &&
                          token.rejectionReason && (
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-zinc-400">
                                Motivo da Rejeição
                              </p>
                              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                <p className="text-sm text-white whitespace-pre-line">
                                  {token.rejectionReason}
                                </p>
                              </div>
                            </div>
                          )}
                      </>
                    ) : (
                      <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/30">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-yellow-400 mb-1">
                              Aguardando preenchimento
                            </p>
                            <p className="text-sm text-zinc-400">
                              Este token ainda não foi usado. Quando o usuário
                              acessar a loja pela primeira vez, ele preencherá
                              suas informações completas que serão exibidas
                              aqui.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
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
              Preencha o nome para criar um novo token de acesso à loja online
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Nome da Pessoa*
              </label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="bg-zinc-700 border-zinc-600 text-white"
                placeholder="Nome do responsável"
              />
              <p className="text-xs text-zinc-400">
                Ao primeiro acesso, o usuário será solicitado a completar seu
                cadastro com suas informações.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              className="border-zinc-600 text-white hover:bg-zinc-700 bg-zinc-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddToken}
              disabled={isSubmitting || !formData.name}
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

      {/* Share Token Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="bg-zinc-800 border-zinc-700 text-white">
          <DialogHeader>
            <DialogTitle>Compartilhar Acesso à Loja</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Compartilhe o link de acesso direto através de diferentes métodos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* QR Code do link */}
            <div className="flex flex-col items-center justify-center">
              <div className="bg-white p-3 rounded-md mb-2">
                <QRCode value={shareUrl} size={200} />
              </div>
              <p className="text-sm text-zinc-300">
                Escaneie com a câmera do celular
              </p>
            </div>

            {/* Link de acesso direto */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Link de acesso direto
              </label>
              <div className="flex">
                <Input
                  value={shareUrl}
                  readOnly
                  className="bg-zinc-700 border-zinc-600 text-white"
                />
                <Button
                  variant="outline"
                  className="ml-2 border-zinc-600"
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    alert("Link copiado!");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Botões de compartilhamento para apps específicos */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Compartilhar via
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    window.open(
                      `https://wa.me/?text=${encodeURIComponent(
                        `Olá ${
                          tokenToShare?.name || ""
                        }, aqui está seu link de acesso à loja Nonato Service: ${shareUrl}`
                      )}`,
                      "_blank"
                    );
                  }}
                >
                  <span className="mr-2">WhatsApp</span>
                </Button>

                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    window.open(
                      `sms:${
                        tokenToShare?.phone || ""
                      }?body=${encodeURIComponent(
                        `Olá ${
                          tokenToShare?.name || ""
                        }, aqui está seu link de acesso à loja Nonato Service: ${shareUrl}`
                      )}`,
                      "_blank"
                    );
                  }}
                >
                  <span className="mr-2">SMS</span>
                </Button>

                <Button
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={() => {
                    window.open(
                      `mailto:${
                        tokenToShare?.email || ""
                      }?subject=${encodeURIComponent(
                        "Acesso à Loja Nonato Service"
                      )}&body=${encodeURIComponent(
                        `Olá ${
                          tokenToShare?.name || ""
                        },\n\nAqui está seu link de acesso à loja Nonato Service:\n${shareUrl}\n\nAtenciosamente,\nEquipe Nonato Service`
                      )}`,
                      "_blank"
                    );
                  }}
                >
                  <span className="mr-2">Email</span>
                </Button>
              </div>
            </div>

            {/* Abrir diretamente */}
            <div className="pt-2 border-t border-zinc-700">
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  window.open(shareUrl, "_blank");
                  setShowShareDialog(false);
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir Link no Navegador
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowShareDialog(false)}
              className="border-zinc-600 text-white hover:bg-zinc-700 bg-zinc-800"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Access Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="bg-zinc-800 border-zinc-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <CheckCircle2 className="h-5 w-5 mr-2 text-emerald-500" />
              Aprovar Acesso
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Confirmar aprovação de acesso à loja para {tokenToApprove?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="p-4 border border-zinc-700 rounded-md bg-zinc-900/50">
              <div className="space-y-2 text-sm">
                <div className="flex">
                  <span className="font-medium w-28 text-zinc-400">Nome:</span>
                  <span className="text-white">{tokenToApprove?.name}</span>
                </div>
                {tokenToApprove?.email && (
                  <div className="flex">
                    <span className="font-medium w-28 text-zinc-400">
                      Email:
                    </span>
                    <span className="text-white">{tokenToApprove?.email}</span>
                  </div>
                )}
                {tokenToApprove?.company && (
                  <div className="flex">
                    <span className="font-medium w-28 text-zinc-400">
                      Empresa:
                    </span>
                    <span className="text-white">
                      {tokenToApprove?.company}
                    </span>
                  </div>
                )}
                {tokenToApprove?.phone && (
                  <div className="flex">
                    <span className="font-medium w-28 text-zinc-400">
                      Telemóvel:
                    </span>
                    <span className="text-white">{tokenToApprove?.phone}</span>
                  </div>
                )}
                <div className="flex">
                  <span className="font-medium w-28 text-zinc-400">
                    Solicitado em:
                  </span>
                  <span className="text-white">
                    {tokenToApprove?.requestedAt
                      ? formatDate(tokenToApprove.requestedAt)
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 bg-emerald-500/10 p-4 rounded-md border border-emerald-500/30">
              <p className="text-sm text-emerald-400">
                Ao aprovar este pedido, o usuário terá acesso imediato à loja
                online. O sistema enviará uma notificação informando que o
                acesso foi aprovado.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowApproveDialog(false);
                setTokenToApprove(null);
              }}
              className="border-zinc-600 text-white hover:bg-zinc-700 bg-zinc-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={approveAccess}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Aprovando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirmar Aprovação
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Access Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="bg-zinc-800 border-zinc-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <XCircle className="h-5 w-5 mr-2 text-red-500" />
              Rejeitar Acesso
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Informe o motivo da rejeição de acesso para {tokenToReject?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="p-4 border border-zinc-700 rounded-md bg-zinc-900/50 mb-4">
              <div className="space-y-2 text-sm">
                <div className="flex">
                  <span className="font-medium w-28 text-zinc-400">Nome:</span>
                  <span className="text-white">{tokenToReject?.name}</span>
                </div>
                {tokenToReject?.email && (
                  <div className="flex">
                    <span className="font-medium w-28 text-zinc-400">
                      Email:
                    </span>
                    <span className="text-white">{tokenToReject?.email}</span>
                  </div>
                )}
                {tokenToReject?.company && (
                  <div className="flex">
                    <span className="font-medium w-28 text-zinc-400">
                      Empresa:
                    </span>
                    <span className="text-white">{tokenToReject?.company}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Motivo da Rejeição *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full rounded-md border border-zinc-600 bg-zinc-700 px-3 py-2 text-white"
                rows="4"
                placeholder="Informe o motivo pelo qual este pedido está sendo rejeitado..."
              />
            </div>

            <div className="mt-4 bg-red-500/10 p-4 rounded-md border border-red-500/30">
              <p className="text-sm text-red-400">
                Ao rejeitar este pedido, o usuário não poderá acessar a loja
                online. O sistema notificará o usuário sobre a rejeição e o
                motivo informado acima.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setTokenToReject(null);
                setRejectionReason("");
              }}
              className="border-zinc-600 text-white hover:bg-zinc-700 bg-zinc-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={rejectAccess}
              disabled={isSubmitting || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rejeitando...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Confirmar Rejeição
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Token Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-zinc-800 border-zinc-700 text-white">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem a certeza que deseja excluir o token de acesso de{" "}
              <span className="font-semibold text-white">{tokenToDelete?.name}</span>?
              Esta ação não pode ser desfeita e removerá o acesso à loja.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setTokenToDelete(null);
              }}
              className="border-zinc-600 text-white hover:bg-zinc-700 bg-zinc-800"
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={deleteToken} className="bg-red-600 hover:bg-red-700">
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageShopAccess;
