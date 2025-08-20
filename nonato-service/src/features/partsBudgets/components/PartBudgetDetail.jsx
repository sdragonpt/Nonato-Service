import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../../firebase";
import generateQuotePDF from "./pdf/generateQuotePDF";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { FileOpener } from "@capacitor-community/file-opener";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  FileText,
  Edit2,
  CheckSquare,
  Calendar,
  Printer,
  Settings,
  PackageOpen,
  UserCheck,
  UserX,
  Trash2,
  ShoppingCart,
  Package,
  Euro,
  Mail,
  Phone,
  Building2,
} from "lucide-react";

// UI Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";

const PartBudgetDetail = () => {
  const { quoteId } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [client, setClient] = useState(null);
  const [equipment, setEquipment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [quoteDoc, clientsSnapshot, equipmentsSnapshot] = await Promise.all(
        [
          getDoc(doc(db, "ordens", quoteId)),
          getDocs(collection(db, "clientes")),
          getDocs(collection(db, "equipamentos")),
        ]
      );

      if (!quoteDoc.exists()) {
        setError("Orçamento de peças não encontrado");
        return;
      }

      const quoteData = quoteDoc.data();

      // Verificar se é realmente um orçamento de peças
      if (!quoteData.isQuote) {
        setError("Este documento não é um orçamento de peças");
        return;
      }

      setQuote({ id: quoteDoc.id, ...quoteData });

      // Buscar dados do cliente (registrado ou não)
      if (!quoteData.isUnregisteredClient && quoteData.clientId) {
        const clientDoc = await getDoc(doc(db, "clientes", quoteData.clientId));
        if (clientDoc.exists()) {
          setClient({ id: clientDoc.id, ...clientDoc.data() });
        }
      }

      // Buscar dados do equipamento (registrado ou manual)
      if (!quoteData.manualEquipment?.model && quoteData.equipmentId) {
        const equipmentDoc = await getDoc(
          doc(db, "equipamentos", quoteData.equipmentId)
        );
        if (equipmentDoc.exists()) {
          setEquipment({ id: equipmentDoc.id, ...equipmentDoc.data() });
        }
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      setError("Erro ao carregar dados. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [quoteId]);

  const handleGeneratePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      setError(null);

      const fileName = `OrcamentoPecas_${
        quote.isUnregisteredClient
          ? quote.unregisteredClient?.name || "Cliente"
          : client?.name || "Cliente"
      }_${quoteId}.pdf`;

      // Preparar dados para o PDF
      const clientData = quote.isUnregisteredClient
        ? {
            name: quote.unregisteredClient?.name || "",
            email: quote.unregisteredClient?.email || "",
            phone: quote.unregisteredClient?.phone || "",
            company: quote.unregisteredClient?.company || "",
          }
        : {
            name: client?.name || "",
            email: client?.email || "",
            phone: client?.phone || "",
            company: client?.company || "",
          };

      const formattedQuote = {
        ...quote,
        clientInfo: clientData,
        items: quote.partsQuoteItems || quote.items || [],
      };

      const pdfResult = await generateQuotePDF(
        quoteId,
        formattedQuote,
        quote.isUnregisteredClient ? null : client,
        fileName
      );

      // Handle mobile or web download
      if (window?.Capacitor?.isNative) {
        try {
          const reader = new FileReader();
          reader.readAsDataURL(pdfResult.blob);
          reader.onloadend = async () => {
            const base64Data = reader.result.split(",")[1];

            await Filesystem.writeFile({
              path: fileName,
              data: base64Data,
              directory: Directory.Documents,
            });

            const { uri } = await Filesystem.getUri({
              directory: Directory.Documents,
              path: fileName,
            });

            await FileOpener.open({
              filePath: uri,
              contentType: "application/pdf",
            });
          };
        } catch (error) {
          console.error("Erro ao salvar/abrir arquivo:", error);
          throw error;
        }
      } else {
        // Web download
        const url = URL.createObjectURL(pdfResult.blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      setError("Erro ao gerar PDF. Por favor, tente novamente.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);

      await deleteDoc(doc(db, "ordens", quoteId));
      navigate("/app/parts-budgets");
    } catch (err) {
      console.error("Erro ao deletar orçamento:", err);
      setError("Erro ao deletar orçamento. Por favor, tente novamente.");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const updateQuoteStatus = async (newStatus) => {
    try {
      await updateDoc(doc(db, "ordens", quoteId), {
        status: newStatus,
        lastUpdated: new Date(),
      });

      setQuote((prev) => ({ ...prev, status: newStatus }));
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      setError("Erro ao atualizar status. Por favor, tente novamente.");
    }
  };

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

  const formatPrice = (price) => {
    return `€ ${parseFloat(price || 0).toFixed(2)}`;
  };

  const calculateTotal = () => {
    const items = quote.partsQuoteItems || quote.items || [];
    return items.reduce((total, item) => {
      return total + item.quantity * (item.price || 0);
    }, 0);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-white">
            Orçamento não encontrado
          </p>
          <Button
            onClick={() => navigate("/app/parts-budgets")}
            className="mt-4 bg-green-600 hover:bg-green-700"
          >
            Voltar à Lista
          </Button>
        </div>
      </div>
    );
  }

  const statusColors = {
    Aberto: "bg-yellow-500/10 text-yellow-400",
    "Em Andamento": "bg-blue-500/10 text-blue-400",
    Fechado: "bg-green-500/10 text-green-400",
  };

  const statusLabels = {
    Aberto: "Em Análise",
    "Em Andamento": "Em Andamento",
    Fechado: "Concluído",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Orçamento de Peças #{quoteId.substring(0, 8)}...
          </h1>
          <p className="text-sm text-zinc-400">
            Visualize e gerencie os detalhes do orçamento de peças
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/app/parts-budgets")}
          className="h-10 w-10 rounded-full border-zinc-700 text-white hover:bg-green-700 bg-green-600"
        >
          <ArrowLeft className="h-4 w-4 text-white" />
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      {/* Status and Actions Card */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Status Badges */}
            <div className="flex flex-wrap gap-2">
              {quote.isUnregisteredClient && (
                <Badge className="bg-blue-500/10 text-blue-400">
                  Cliente Não Registrado
                </Badge>
              )}
              <Badge className={statusColors[quote.status]}>
                {statusLabels[quote.status] || quote.status}
              </Badge>
              {quote.originalQuoteId && (
                <Badge className="bg-purple-500/10 text-purple-400">
                  Originado da Loja Online
                </Badge>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              {quote.status !== "Fechado" && (
                <>
                  <Button
                    onClick={() => setDeleteDialogOpen(true)}
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700 flex-1 sm:flex-none"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Excluir
                  </Button>

                  <Button
                    onClick={() => updateQuoteStatus("Fechado")}
                    className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                  >
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Concluir
                  </Button>
                </>
              )}

              <Button
                onClick={handleGeneratePDF}
                className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none"
                disabled={isGeneratingPDF}
              >
                {isGeneratingPDF ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                Gerar PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quote Details Card */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2 text-purple-400" />
            Detalhes do Orçamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cliente */}
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-zinc-700/30 rounded-lg">
                <div className="flex-shrink-0">
                  {quote.isUnregisteredClient ? (
                    <UserX className="h-5 w-5 text-blue-400 mt-1" />
                  ) : (
                    <UserCheck className="h-5 w-5 text-green-400 mt-1" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-medium text-zinc-300">Cliente</p>
                    <Badge
                      variant="outline"
                      className={
                        quote.isUnregisteredClient
                          ? "border-blue-500/50 text-blue-400"
                          : "border-green-500/50 text-green-400"
                      }
                    >
                      {quote.isUnregisteredClient
                        ? "Não Registrado"
                        : "Registrado"}
                    </Badge>
                  </div>

                  {quote.isUnregisteredClient ? (
                    <div className="space-y-1">
                      <p className="text-white font-medium">
                        {quote.unregisteredClient?.name || "N/A"}
                      </p>
                      {quote.unregisteredClient?.email && (
                        <p className="text-sm text-zinc-400 flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          {quote.unregisteredClient.email}
                        </p>
                      )}
                      {quote.unregisteredClient?.phone && (
                        <p className="text-sm text-zinc-400 flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          {quote.unregisteredClient.phone}
                        </p>
                      )}
                      {quote.unregisteredClient?.company && (
                        <p className="text-sm text-zinc-400 flex items-center gap-2">
                          <Building2 className="h-3 w-3" />
                          {quote.unregisteredClient.company}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-white font-medium">
                        {client?.name || "N/A"}
                      </p>
                      {client?.email && (
                        <p className="text-sm text-zinc-400 flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          {client.email}
                        </p>
                      )}
                      {client?.phone && (
                        <p className="text-sm text-zinc-400 flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          {client.phone}
                        </p>
                      )}
                      {client?.company && (
                        <p className="text-sm text-zinc-400 flex items-center gap-2">
                          <Building2 className="h-3 w-3" />
                          {client.company}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Data e Tipo de Serviço */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-zinc-400" />
                  <div>
                    <p className="text-sm text-zinc-400">Data de Criação</p>
                    <p className="text-white">
                      {formatDate(quote.createdAt || quote.date)}
                    </p>
                  </div>
                </div>

                {quote.serviceType && (
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-zinc-400" />
                    <div>
                      <p className="text-sm text-zinc-400">Tipo de Serviço</p>
                      <p className="text-white">{quote.serviceType}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Equipamento */}
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-zinc-700/30 rounded-lg">
                <div className="flex-shrink-0">
                  <Printer className="h-5 w-5 text-orange-400 mt-1" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-medium text-zinc-300">
                      Equipamento
                    </p>
                    <Badge
                      variant="outline"
                      className="border-orange-500/50 text-orange-400"
                    >
                      {quote.manualEquipment?.model ? "Manual" : "Registrado"}
                    </Badge>
                  </div>

                  {quote.manualEquipment?.model ? (
                    <div className="space-y-1">
                      <p className="text-white font-medium">
                        {quote.manualEquipment.brand} -{" "}
                        {quote.manualEquipment.model}
                      </p>
                      {quote.manualEquipment.serialNumber && (
                        <p className="text-sm text-zinc-400">
                          Nº Série: {quote.manualEquipment.serialNumber}
                        </p>
                      )}
                    </div>
                  ) : equipment ? (
                    <div className="space-y-1">
                      <p className="text-white font-medium">
                        {equipment.brand} - {equipment.model}
                      </p>
                      {equipment.serialNumber && (
                        <p className="text-sm text-zinc-400">
                          Nº Série: {equipment.serialNumber}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-zinc-400">
                      Equipamento não especificado
                    </p>
                  )}
                </div>
              </div>

              {/* Resumo Total */}
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-400">Total do Orçamento</p>
                    <p className="text-2xl font-bold text-green-400">
                      {formatPrice(calculateTotal())}
                    </p>
                  </div>
                  <Euro className="h-8 w-8 text-green-400" />
                </div>
                <div className="mt-2">
                  <p className="text-xs text-zinc-500">
                    {(quote.partsQuoteItems || quote.items || []).length}{" "}
                    item(s)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items List */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center">
            <Package className="h-5 w-5 mr-2 text-purple-400" />
            Peças Solicitadas
            <Badge className="ml-2 bg-purple-500/20 text-purple-400">
              {(quote.partsQuoteItems || quote.items || []).length} item(s)
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(quote.partsQuoteItems || quote.items || []).length > 0 ? (
            <div className="space-y-3">
              {(quote.partsQuoteItems || quote.items || []).map(
                (item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-zinc-700/30 rounded-lg border border-zinc-600"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="h-4 w-4 text-purple-400" />
                        <span className="font-medium text-white">
                          {item.name}
                        </span>
                        {item.code && (
                          <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                            {item.code}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-zinc-400">
                        Quantidade: {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      {item.price > 0 ? (
                        <>
                          <p className="text-sm text-zinc-400">
                            {formatPrice(item.price)} / unidade
                          </p>
                          <p className="text-lg font-medium text-green-400">
                            {formatPrice(item.quantity * item.price)}
                          </p>
                        </>
                      ) : (
                        <p className="text-orange-400 font-medium">A definir</p>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <PackageOpen className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400">Nenhuma peça encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes Card */}
      {(quote.description ||
        quote.resultDescription ||
        quote.pontosEmAberto) && (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">Observações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {quote.description && (
              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-2">
                  Descrição
                </h4>
                <p className="text-white bg-zinc-700/50 rounded-lg p-3">
                  {quote.description}
                </p>
              </div>
            )}
            {quote.resultDescription && (
              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-2">
                  Observações
                </h4>
                <p className="text-white bg-zinc-700/50 rounded-lg p-3">
                  {quote.resultDescription}
                </p>
              </div>
            )}
            {quote.pontosEmAberto && (
              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-2">
                  Pontos em Aberto
                </h4>
                <p className="text-white bg-zinc-700/50 rounded-lg p-3">
                  {quote.pontosEmAberto}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar exclusão</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem certeza que deseja excluir este orçamento de peças? Esta ação
              não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-zinc-700 text-white hover:text-white hover:bg-zinc-700 bg-zinc-600"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fixed Action Buttons */}
      <div className="fixed bottom-6 right-6 flex gap-2">
        <Button
          onClick={() => navigate("/app/parts-budgets")}
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </Button>
        <Button
          onClick={() => navigate(`/app/edit-part-budget/${quoteId}`)}
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full border-zinc-700 bg-green-600 hover:bg-green-700"
        >
          <Edit2 className="h-5 w-5 text-white" />
        </Button>
      </div>
    </div>
  );
};

export default PartBudgetDetail;
