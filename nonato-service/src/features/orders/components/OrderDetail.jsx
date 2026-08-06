import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../../firebase";
import generateServiceOrderPDF from "./pdf/generateServiceOrderPDF";
import generateQuotePDF from "./pdf/generateQuotePDF";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { FileOpener } from "@capacitor-community/file-opener";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Plus,
  Trash2,
  FileText,
  Edit2,
  CheckSquare,
  Calendar,
  Printer,
  Settings,
  AlertCircle,
  PackageOpen,
  UserCheck,
  UserX,
  ShoppingCart,
  Package,
  Receipt,
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

const OrderDetail = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [client, setClient] = useState(null);
  const [equipment, setEquipment] = useState(null);
  const [workdays, setWorkdays] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingQuotePDF, setIsGeneratingQuotePDF] = useState(false);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // ✅ FUNÇÃO PARA FORMATAR PREÇO
  const formatPrice = (price) => {
    return `€ ${parseFloat(price || 0).toFixed(2)}`;
  };

  // ✅ CALCULAR TOTAIS DO ORÇAMENTO
  const calculateQuoteTotals = () => {
    if (!order?.partsQuoteItems?.length) {
      return {
        subtotal: 0,
        shipping: 0,
        vatAmount: 0,
        totalWithVat: 0,
        totalBeforeVat: 0,
      };
    }

    const subtotal = order.partsQuoteItems.reduce((total, item) => {
      return total + item.quantity * (item.price || 0);
    }, 0);

    const shipping = parseFloat(order.shippingPrice) || 0;
    const totalBeforeVat = subtotal + shipping;

    const vatAmount =
      order.includeVat && order.vatRate
        ? (totalBeforeVat * order.vatRate) / 100
        : 0;

    const totalWithVat = totalBeforeVat + vatAmount;

    return {
      subtotal,
      shipping,
      vatAmount,
      totalWithVat,
      totalBeforeVat,
    };
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [orderDoc, workdaysSnapshot] = await Promise.all([
        getDoc(doc(db, "ordens", orderId)),
        getDocs(
          query(collection(db, "workdays"), where("orderId", "==", orderId))
        ),
      ]);

      if (!orderDoc.exists()) {
        setError("Ordem de serviço não encontrada");
        return;
      }

      const orderData = orderDoc.data();
      setOrder({ id: orderDoc.id, ...orderData });

      // ✅ BUSCAR DADOS DO CLIENTE (REGISTRADO OU NÃO)
      if (!orderData.isUnregisteredClient && orderData.clientId) {
        const clientDoc = await getDoc(doc(db, "clientes", orderData.clientId));
        if (clientDoc.exists()) {
          setClient({ id: clientDoc.id, ...clientDoc.data() });
        }
      }

      // ✅ BUSCAR DADOS DO EQUIPAMENTO (REGISTRADO OU MANUAL)
      if (!orderData.manualEquipment?.model && orderData.equipmentId) {
        const equipmentDoc = await getDoc(
          doc(db, "equipamentos", orderData.equipmentId)
        );
        if (equipmentDoc.exists()) {
          setEquipment({ id: equipmentDoc.id, ...equipmentDoc.data() });
        }
      }

      // Process workdays
      const workdaysList = workdaysSnapshot.docs
        .map((doc) => {
          const data = doc.data();
          const workDate = data.workDate?.toDate
            ? data.workDate.toDate()
            : new Date(data.workDate);
          return {
            id: doc.id,
            ...data,
            workDate,
          };
        })
        .sort((a, b) => b.workDate - a.workDate);

      setWorkdays(workdaysList);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      setError("Erro ao carregar dados. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [orderId]);

  const handleGeneratePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      setError(null);

      const fileName = `OrdemServico_${
        order.isUnregisteredClient
          ? order.unregisteredClient?.name || "Cliente"
          : client?.name || "Cliente"
      }_${orderId}.pdf`;

      // ✅ FORMATTEDDATA CORRIGIDO - Incluindo partsQuoteItems
      const formattedData = {
        orderId,
        orderNumber: order.orderNumber || orderId,
        clientData: order.isUnregisteredClient
          ? {
              name: order.unregisteredClient?.name || "",
              phone: order.unregisteredClient?.phone || "",
              address: order.unregisteredClient?.company || "",
            }
          : {
              name: client?.name || "",
              phone: client?.phone || "",
              address: client?.address || "",
            },
        equipmentData: order.manualEquipment?.model
          ? {
              brand: order.manualEquipment.brand || "",
              model: order.manualEquipment.model || "",
              serialNumber: order.manualEquipment.serialNumber || "",
            }
          : {
              brand: equipment?.brand || "",
              model: equipment?.model || "",
              serialNumber: equipment?.serialNumber || "",
            },
        date: order.date,
        serviceType: order.serviceType || "",
        status: order.status || "",
        priority: order.priority || "",
        resultDescription: order.resultDescription || "",
        pontosEmAberto: order.pontosEmAberto || "",
        checklist: order.checklist || {},
        workdays: workdays.map((workday) => ({
          ...workday,
          workDate: new Date(workday.workDate).toLocaleDateString(),
        })),
        partsQuoteItems: order.partsQuoteItems || [],
      };

      const pdfResult = await generateServiceOrderPDF(
        orderId,
        formattedData,
        order.isUnregisteredClient ? order.unregisteredClient : client,
        order.manualEquipment?.model ? order.manualEquipment : equipment,
        workdays,
        fileName
      );

      // Handle mobile or web download
      if (window?.Capacitor?.isNative) {
        try {
          // Convert Blob to Base64
          const reader = new FileReader();
          reader.readAsDataURL(pdfResult.blob);
          reader.onloadend = async () => {
            const base64Data = reader.result.split(",")[1];

            // Save file
            await Filesystem.writeFile({
              path: fileName,
              data: base64Data,
              directory: Directory.Documents,
            });

            // Get file URI
            const { uri } = await Filesystem.getUri({
              directory: Directory.Documents,
              path: fileName,
            });

            // Open file
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

  // ✅ FUNÇÃO PARA GERAR PDF DO ORÇAMENTO
  const handleGenerateQuotePDF = async () => {
    try {
      setIsGeneratingQuotePDF(true);
      setError(null);

      const clientName = order.isUnregisteredClient
        ? order.unregisteredClient?.name || "Cliente"
        : client?.name || "Cliente";

      const fileName = `Orcamento_${clientName}_${orderId}.pdf`;

      // ✅ PREPARAR DADOS DO ORÇAMENTO
      const quoteData = {
        ...order,
        items: order.partsQuoteItems || [],
        clientInfo: order.isUnregisteredClient
          ? {
              name: order.unregisteredClient?.name || "",
              email: order.unregisteredClient?.email || "",
              phone: order.unregisteredClient?.phone || "",
              company: order.unregisteredClient?.company || "",
            }
          : {
              name: client?.name || "",
              email: client?.email || "",
              phone: client?.phone || "",
              company: client?.company || "",
            },
      };

      const pdfResult = await generateQuotePDF(
        orderId,
        quoteData,
        order.isUnregisteredClient ? order.unregisteredClient : client,
        fileName
      );

      // Handle mobile or web download
      if (window?.Capacitor?.isNative) {
        try {
          // Convert Blob to Base64
          const reader = new FileReader();
          reader.readAsDataURL(pdfResult.blob);
          reader.onloadend = async () => {
            const base64Data = reader.result.split(",")[1];

            // Save file
            await Filesystem.writeFile({
              path: pdfResult.fileName,
              data: base64Data,
              directory: Directory.Documents,
            });

            // Get file URI
            const { uri } = await Filesystem.getUri({
              directory: Directory.Documents,
              path: pdfResult.fileName,
            });

            // Open file
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
        link.download = pdfResult.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Erro ao gerar PDF do orçamento:", err);
      setError("Erro ao gerar PDF do orçamento. Por favor, tente novamente.");
    } finally {
      setIsGeneratingQuotePDF(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);

      // Soft-delete: move para a Reciclagem (os dias de trabalho ficam
      // preservados, para o caso de a ordem ser restaurada)
      await updateDoc(doc(db, "ordens", orderId), {
        eliminadoEm: new Date(),
      });
      navigate("/app/manage-orders");
    } catch (err) {
      console.error("Erro ao excluir ordem:", err);
      setError("Erro ao deletar ordem. Por favor, tente novamente.");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleCloseOrder = async () => {
    try {
      setIsClosing(true);
      setError(null);

      await updateDoc(doc(db, "ordens", orderId), {
        status: "Fechado",
        closedAt: new Date(),
      });

      navigate("/app/manage-orders");
    } catch (err) {
      console.error("Erro ao fechar ordem:", err);
      setError("Erro ao fechar ordem. Por favor, tente novamente.");
    } finally {
      setIsClosing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  const priorityColors = {
    high: "bg-red-500/10 text-red-400",
    normal: "bg-blue-500/10 text-blue-400",
    low: "bg-green-500/10 text-green-400",
  };

  const statusColors = {
    Aberto: "bg-yellow-500/10 text-yellow-400",
    "Em Andamento": "bg-blue-500/10 text-blue-400",
    Fechado: "bg-green-500/10 text-green-400",
  };

  // ✅ CALCULAR TOTAIS DO ORÇAMENTO
  const quoteTotals = calculateQuoteTotals();
  const hasQuote =
    order?.checklist?.pecas && order?.partsQuoteItems?.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Ordem de Serviço #{orderId}
          </h1>
          <p className="text-sm text-zinc-400">
            Visualize e gerencie os detalhes da ordem de serviço
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(-1)}
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
              {order.isUnregisteredClient && (
                <Badge className="bg-blue-500/10 text-blue-400">
                  Cliente Não Registrado
                </Badge>
              )}
              <Badge className={statusColors[order.status]}>
                {order.status}
              </Badge>
              <Badge className={priorityColors[order.priority]}>
                {order.priority === "high"
                  ? "Alta"
                  : order.priority === "normal"
                  ? "Normal"
                  : "Baixa"}
              </Badge>
              {hasQuote && (
                <Badge className="bg-purple-500/10 text-purple-400">
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  Com Orçamento
                </Badge>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              {order.status !== "Fechado" && (
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
                    <span className="sm:inline">Excluir</span>
                  </Button>

                  <Button
                    onClick={handleCloseOrder}
                    className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                    disabled={isClosing}
                  >
                    {isClosing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckSquare className="w-4 h-4 mr-2" />
                    )}
                    <span className="sm:inline">Fechar</span>
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
                <span className="sm:inline">PDF Ordem</span>
              </Button>

              {/* ✅ BOTÃO PARA GERAR PDF DO ORÇAMENTO */}
              {hasQuote && (
                <Button
                  onClick={handleGenerateQuotePDF}
                  className="bg-purple-600 hover:bg-purple-700 flex-1 sm:flex-none"
                  disabled={isGeneratingQuotePDF}
                >
                  {isGeneratingQuotePDF ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Receipt className="w-4 h-4 mr-2" />
                  )}
                  <span className="sm:inline">PDF Orçamento</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ✅ ORDER DETAILS CARD MELHORADO */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-lg text-white">
            Detalhes da Ordem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ✅ COLUNA ESQUERDA - DADOS DO CLIENTE */}
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-zinc-700/30 rounded-lg">
                <div className="flex-shrink-0">
                  {order.isUnregisteredClient ? (
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
                        order.isUnregisteredClient
                          ? "border-blue-500/50 text-blue-400"
                          : "border-green-500/50 text-green-400"
                      }
                    >
                      {order.isUnregisteredClient
                        ? "Não Registrado"
                        : "Registrado"}
                    </Badge>
                  </div>

                  {/* ✅ MOSTRAR DADOS BASEADO NO TIPO DE CLIENTE */}
                  {order.isUnregisteredClient ? (
                    <div className="space-y-1">
                      <p className="text-white font-medium">
                        {order.unregisteredClient?.name || "N/A"}
                      </p>
                      {order.unregisteredClient?.email && (
                        <p className="text-sm text-zinc-400">
                          📧 {order.unregisteredClient.email}
                        </p>
                      )}
                      {order.unregisteredClient?.phone && (
                        <p className="text-sm text-zinc-400">
                          📞 {order.unregisteredClient.phone}
                        </p>
                      )}
                      {order.unregisteredClient?.company && (
                        <p className="text-sm text-zinc-400">
                          🏢 {order.unregisteredClient.company}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-white font-medium">
                        {order.clientInfo?.name || client?.name || "N/A"}
                      </p>
                      {(order.clientInfo?.email || client?.email) && (
                        <p className="text-sm text-zinc-400">
                          📧 {order.clientInfo?.email || client?.email}
                        </p>
                      )}
                      {(order.clientInfo?.phone || client?.phone) && (
                        <p className="text-sm text-zinc-400">
                          📞 {order.clientInfo?.phone || client?.phone}
                        </p>
                      )}
                      {(order.clientInfo?.company || client?.company) && (
                        <p className="text-sm text-zinc-400">
                          🏢 {order.clientInfo?.company || client?.company}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ✅ DATA E TIPO DE SERVIÇO */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-zinc-400" />
                  <div>
                    <p className="text-sm text-zinc-400">Data</p>
                    <p className="text-white">
                      {new Date(order.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-zinc-400" />
                  <div>
                    <p className="text-sm text-zinc-400">Tipo de Serviço</p>
                    <p className="text-white">{order.serviceType}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ✅ COLUNA DIREITA - DADOS DO EQUIPAMENTO */}
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
                      {order.manualEquipment?.model ? "Manual" : "Registrado"}
                    </Badge>
                  </div>

                  {/* ✅ MOSTRAR DADOS DO EQUIPAMENTO */}
                  {order.manualEquipment?.model ? (
                    // Equipamento manual (cliente não registrado)
                    <div className="space-y-1">
                      <p className="text-white font-medium">
                        {order.manualEquipment.brand} -{" "}
                        {order.manualEquipment.model}
                      </p>
                      {order.manualEquipment.serialNumber && (
                        <p className="text-sm text-zinc-400">
                          🏷️ Nº Série: {order.manualEquipment.serialNumber}
                        </p>
                      )}
                    </div>
                  ) : (
                    // Equipamento registrado
                    <div className="space-y-1">
                      <p className="text-white font-medium">
                        {equipment
                          ? `${equipment.brand} - ${equipment.model}`
                          : "N/A"}
                      </p>
                      {equipment?.serialNumber && (
                        <p className="text-sm text-zinc-400">
                          🏷️ Nº Série: {equipment.serialNumber}
                        </p>
                      )}
                      {equipment?.installationDate && (
                        <p className="text-sm text-zinc-400">
                          📅 Instalação:{" "}
                          {new Date(
                            equipment.installationDate
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ✅ INFORMAÇÕES EXTRAS */}
              {order.description && (
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-zinc-400 mt-1" />
                  <div>
                    <p className="text-sm text-zinc-400">Descrição</p>
                    <p className="text-white">{order.description}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist Status Card */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-lg text-white">
            Status do Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(order.checklist || {}).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                {value ? (
                  <CheckSquare className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-zinc-400" />
                )}
                <span
                  className={`text-sm ${
                    value ? "text-green-400" : "text-zinc-400"
                  }`}
                >
                  {key === "concluido"
                    ? "Serviço Concluído"
                    : key === "retorno"
                    ? "Retorno Necessário"
                    : key === "funcionarios"
                    ? "Instrução dos Funcionários"
                    : key === "documentacao"
                    ? "Entrega da Documentação"
                    : key === "producao"
                    ? "Liberação para Produção"
                    : key === "pecas"
                    ? "Orçamento de Peças"
                    : key.charAt(0).toUpperCase() +
                      key.slice(1).replace(/([A-Z])/g, " $1")}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ✅ SEÇÃO DE ORÇAMENTO DE PEÇAS (SE EXISTIR) */}
      {hasQuote && (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2 text-purple-400" />
              Orçamento de Peças
              <Badge className="ml-2 bg-purple-500/20 text-purple-400">
                {order.partsQuoteItems.length} item(s)
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Lista de Peças */}
            <div className="space-y-3">
              {order.partsQuoteItems.map((item, index) => (
                <div
                  key={item.id || index}
                  className="grid grid-cols-12 gap-4 items-center p-3 bg-zinc-700/30 rounded-lg border border-zinc-600"
                >
                  <div className="col-span-12 md:col-span-5">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="h-4 w-4 text-purple-400" />
                      <span className="font-medium text-white">
                        {item.name}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400">
                      Código: {item.code || "N/A"}
                    </p>
                  </div>

                  <div className="col-span-4 md:col-span-2">
                    <p className="text-sm text-zinc-400">Quantidade</p>
                    <p className="text-white font-medium">{item.quantity}</p>
                  </div>

                  <div className="col-span-4 md:col-span-2">
                    <p className="text-sm text-zinc-400">Preço Unitário</p>
                    <p className="text-white font-medium">
                      {formatPrice(item.price)}
                    </p>
                  </div>

                  <div className="col-span-4 md:col-span-3">
                    <p className="text-sm text-zinc-400">Subtotal</p>
                    <p className="text-green-400 font-medium">
                      {formatPrice(item.quantity * (item.price || 0))}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Informações de Envio */}
            {order.shippingType && (
              <div className="mt-4 p-3 bg-zinc-700/50 rounded-lg border border-zinc-600">
                <h5 className="text-sm font-medium text-white mb-2">
                  Informações de Envio
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-zinc-400">Tipo de Envio</p>
                    <p className="text-white">{order.shippingType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">Preço do Envio</p>
                    <p className="text-white">
                      {formatPrice(order.shippingPrice)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Resumo de Totais */}
            <div className="mt-4 p-4 bg-zinc-700/50 rounded-lg border border-zinc-600">
              <h5 className="text-md font-medium text-white mb-3">
                Resumo do Orçamento
              </h5>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-white">Subtotal Peças:</span>
                  <span className="text-white">
                    {formatPrice(quoteTotals.subtotal)}
                  </span>
                </div>

                {quoteTotals.shipping > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-white">Envio:</span>
                    <span className="text-white">
                      {formatPrice(quoteTotals.shipping)}
                    </span>
                  </div>
                )}

                {order.includeVat && quoteTotals.vatAmount > 0 && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-white">Total s/ IVA:</span>
                      <span className="text-white">
                        {formatPrice(quoteTotals.totalBeforeVat)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white">
                        IVA ({order.vatRate}%):
                      </span>
                      <span className="text-white">
                        {formatPrice(quoteTotals.vatAmount)}
                      </span>
                    </div>
                  </>
                )}

                <hr className="border-zinc-600" />

                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-white">
                    Total Final:
                  </span>
                  <span className="text-xl font-bold text-green-400">
                    {formatPrice(
                      order.includeVat
                        ? quoteTotals.totalWithVat
                        : quoteTotals.totalBeforeVat
                    )}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workdays Card */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="text-lg text-white">Dias de Trabalho</CardTitle>
          <Button
            onClick={() => navigate(`/app/order/${orderId}/add-workday`)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Dia
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {workdays.length > 0 ? (
            workdays.map((workday) => (
              <div
                key={workday.id}
                onClick={() => navigate(`/app/edit-workday/${workday.id}`)}
                className="bg-zinc-700/50 hover:bg-zinc-700 p-4 rounded-lg cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-zinc-400" />
                    <div>
                      <p className="text-white">
                        {new Date(workday.workDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-zinc-400">
                        {workday.startHour} - {workday.endHour}
                      </p>
                    </div>
                  </div>
                  <Edit2 className="w-4 h-4 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <PackageOpen className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400">Nenhum dia de trabalho registrado</p>
              <p className="text-sm text-zinc-500">
                Adicione um novo dia de trabalho clicando no botão acima
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes Card */}
      {(order.resultDescription || order.pontosEmAberto) && (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">Observações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.resultDescription && (
              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-2">
                  Descrição / Observações
                </h4>
                <p className="text-white bg-zinc-700/50 rounded-lg p-3">
                  {order.resultDescription}
                </p>
              </div>
            )}
            {order.pontosEmAberto && (
              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-2">
                  Pontos em Aberto
                </h4>
                <p className="text-white bg-zinc-700/50 rounded-lg p-3">
                  {order.pontosEmAberto}
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
              Tem certeza que deseja excluir esta ordem de serviço? A ordem
              será movida para a Reciclagem e pode ser restaurada mais tarde.
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
          onClick={() => navigate(-1)}
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </Button>
        <Button
          onClick={() => navigate(`/app/edit-service-order/${orderId}`)}
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

export default OrderDetail;
