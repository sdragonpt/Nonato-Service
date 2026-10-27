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
import generateMachineHoursReportPDF from "./pdf/generateMachineHoursReportPDF";
import { generateDocNumber } from "../../../utils/docNumbering.js";
import OrderDiariasCard from "./OrderDiariasCard.jsx";
import { totalBlocksDurationLabel } from "../../workdays/components/MachineTimeBlocks.jsx";
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
  Cpu,
  Mail,
  Phone,
  Building2,
  Tag,
  ClipboardList,
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
import { PageHeader } from "../../../components/app";

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
    const numericAmount = parseFloat(price || 0);
    const isNegative = numericAmount < 0;
    const [intPart, decPart] = Math.abs(numericAmount).toFixed(2).split(".");
    const intWithDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${isNegative ? "-" : ""}€ ${intWithDots},${decPart}`;
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

  // ✅ PDF ÚNICO DA ORDEM — escolhe automaticamente qual gerador usar
  // conforme o número de equipamentos da ordem: 1 equipamento (ou nenhum,
  // ordens antigas) usa o PDF normal; mais do que 1 torna a ordem
  // "especial" e usa o relatório de horas por equipamento (mesmo conteúdo
  // do normal + secção agrupada por máquina).
  const equipmentsCount = Array.isArray(order?.equipmentsList) && order.equipmentsList.length > 0
    ? order.equipmentsList.length
    : 1;
  const isSpecialOrder = equipmentsCount > 1;

  const handleGeneratePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      setError(null);

      // ✅ Nome do ficheiro = número da OS (ex.: OS-0826-0187.pdf), com
      // prefixo "OS-E" (Equipamentos) quando a ordem é "especial".
      const baseOrderNumber = order.orderNumber || `OS-${orderId}`;
      const fileName = isSpecialOrder
        ? `${baseOrderNumber.replace(/^OS-/, "OS-E-")}.pdf`
        : `${baseOrderNumber}.pdf`;

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
        diarias: order.diarias || null,
      };

      const generator = isSpecialOrder ? generateMachineHoursReportPDF : generateServiceOrderPDF;

      const pdfResult = await generator(
        order.orderNumber || orderId,
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

      // ✅ NÚMERO DO ORÇAMENTO DE PEÇAS: gera uma única vez e fica guardado
      // na própria ordem, para o PDF ter sempre o mesmo número.
      let quoteNumber = order.quoteNumber;
      if (!quoteNumber) {
        quoteNumber = await generateDocNumber("orp");
        await updateDoc(doc(db, "ordens", orderId), { quoteNumber });
      }

      // ✅ Nome do ficheiro = número do orçamento de peças (ex.: ORP-0826-0009.pdf)
      const fileName = `${quoteNumber}.pdf`;

      // ✅ PREPARAR DADOS DO ORÇAMENTO
      const quoteData = {
        ...order,
        quoteNumber,
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
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
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
      <PageHeader
        icon={ClipboardList}
        title={<>Ordem de Serviço {order.orderNumber || `#${orderId}`}</>}
        description="Visualize e gerencie os detalhes da ordem de serviço"
        back
      />

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Status and Actions Card */}
      <Card>
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
                    className="flex-1 sm:flex-none"
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

              {/* ✅ PDF ÚNICO — normal ou "por equipamento" consoante o
                  número de equipamentos da ordem (ver isSpecialOrder) */}
              <Button
                onClick={handleGeneratePDF}
                className={
                  isSpecialOrder
                    ? "bg-teal-600 hover:bg-teal-700 flex-1 sm:flex-none"
                    : "bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none"
                }
                disabled={isGeneratingPDF}
              >
                {isGeneratingPDF ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : isSpecialOrder ? (
                  <Cpu className="w-4 h-4 mr-2" />
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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Detalhes da Ordem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ✅ COLUNA ESQUERDA - DADOS DO CLIENTE */}
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
                <div className="flex-shrink-0">
                  {order.isUnregisteredClient ? (
                    <UserX className="h-5 w-5 text-blue-400 mt-1" />
                  ) : (
                    <UserCheck className="h-5 w-5 text-green-400 mt-1" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-medium text-foreground/90">Cliente</p>
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
                      <p className="text-foreground font-medium">
                        {order.unregisteredClient?.name || "N/A"}
                      </p>
                      {order.unregisteredClient?.email && (
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 shrink-0" /> {order.unregisteredClient.email}
                        </p>
                      )}
                      {order.unregisteredClient?.phone && (
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 shrink-0" /> {order.unregisteredClient.phone}
                        </p>
                      )}
                      {order.unregisteredClient?.company && (
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5 shrink-0" /> {order.unregisteredClient.company}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-foreground font-medium">
                        {order.clientInfo?.name || client?.name || "N/A"}
                      </p>
                      {(order.clientInfo?.email || client?.email) && (
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 shrink-0" /> {order.clientInfo?.email || client?.email}
                        </p>
                      )}
                      {(order.clientInfo?.phone || client?.phone) && (
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 shrink-0" /> {order.clientInfo?.phone || client?.phone}
                        </p>
                      )}
                      {(order.clientInfo?.company || client?.company) && (
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5 shrink-0" /> {order.clientInfo?.company || client?.company}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ✅ DATA E TIPO DE SERVIÇO */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Data</p>
                    <p className="text-foreground">
                      {new Date(order.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo de Serviço</p>
                    <p className="text-foreground">{order.serviceType}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ✅ COLUNA DIREITA - DADOS DO EQUIPAMENTO */}
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
                <div className="flex-shrink-0">
                  <Printer className="h-5 w-5 text-orange-400 mt-1" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-medium text-foreground/90">
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
                      <p className="text-foreground font-medium">
                        {order.manualEquipment.brand} -{" "}
                        {order.manualEquipment.model}
                      </p>
                      {order.manualEquipment.serialNumber && (
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Tag className="h-3.5 w-3.5 shrink-0" /> Nº Série: {order.manualEquipment.serialNumber}
                        </p>
                      )}
                    </div>
                  ) : (
                    // Equipamento registrado
                    <div className="space-y-1">
                      <p className="text-foreground font-medium">
                        {equipment
                          ? `${equipment.brand} - ${equipment.model}`
                          : "N/A"}
                      </p>
                      {equipment?.serialNumber && (
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Tag className="h-3.5 w-3.5 shrink-0" /> Nº Série: {equipment.serialNumber}
                        </p>
                      )}
                      {equipment?.installationDate && (
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 shrink-0" /> Instalação:{" "}
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
                  <FileText className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Descrição</p>
                    <p className="text-foreground">{order.description}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
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
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <span
                  className={`text-sm ${
                    value ? "text-green-400" : "text-muted-foreground"
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
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
                  className="grid grid-cols-12 gap-4 items-center p-3 bg-muted/30 rounded-lg border border-border"
                >
                  <div className="col-span-12 md:col-span-5">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="h-4 w-4 text-purple-400" />
                      <span className="font-medium text-foreground">
                        {item.name}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Código: {item.code || "N/A"}
                    </p>
                  </div>

                  <div className="col-span-4 md:col-span-2">
                    <p className="text-sm text-muted-foreground">Quantidade</p>
                    <p className="text-foreground font-medium">{item.quantity}</p>
                  </div>

                  <div className="col-span-4 md:col-span-2">
                    <p className="text-sm text-muted-foreground">Preço Unitário</p>
                    <p className="text-foreground font-medium">
                      {formatPrice(item.price)}
                    </p>
                  </div>

                  <div className="col-span-4 md:col-span-3">
                    <p className="text-sm text-muted-foreground">Subtotal</p>
                    <p className="text-green-400 font-medium">
                      {formatPrice(item.quantity * (item.price || 0))}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Informações de Envio */}
            {order.shippingType && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border">
                <h5 className="text-sm font-medium text-foreground mb-2">
                  Informações de Envio
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo de Envio</p>
                    <p className="text-foreground">{order.shippingType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Preço do Envio</p>
                    <p className="text-foreground">
                      {formatPrice(order.shippingPrice)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Resumo de Totais */}
            <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
              <h5 className="text-md font-medium text-foreground mb-3">
                Resumo do Orçamento
              </h5>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-foreground">Subtotal Peças:</span>
                  <span className="text-foreground">
                    {formatPrice(quoteTotals.subtotal)}
                  </span>
                </div>

                {quoteTotals.shipping > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">Envio:</span>
                    <span className="text-foreground">
                      {formatPrice(quoteTotals.shipping)}
                    </span>
                  </div>
                )}

                {order.includeVat && quoteTotals.vatAmount > 0 && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-foreground">Total s/ IVA:</span>
                      <span className="text-foreground">
                        {formatPrice(quoteTotals.totalBeforeVat)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-foreground">
                        IVA ({order.vatRate}%):
                      </span>
                      <span className="text-foreground">
                        {formatPrice(quoteTotals.vatAmount)}
                      </span>
                    </div>
                  </>
                )}

                <hr className="border-border" />

                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-foreground">
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

      {/* Diárias — ligar/desligar, valor e nº de diárias (ver OrderDiariasCard) */}
      <OrderDiariasCard
        orderId={orderId}
        order={order}
        workdays={workdays}
        onChange={(diarias) => setOrder((prev) => ({ ...prev, diarias }))}
      />

      {/* Workdays Card */}
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="text-lg">Dias de Trabalho</CardTitle>
          <Button
            onClick={() => navigate(`/app/order/${orderId}/add-workday`)}
          >
            <Plus className="w-4 h-4" />
            Novo Dia
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {workdays.length > 0 ? (
            workdays.map((workday) => (
              <div
                key={workday.id}
                onClick={() => navigate(`/app/edit-workday/${workday.id}`)}
                className="bg-muted/50 hover:bg-accent p-4 rounded-lg cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-foreground">
                        {new Date(workday.workDate).toLocaleDateString()}
                      </p>
                      {workday.machineEntries?.length > 0 ? (
                        <>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {workday.machineEntries.map((entry, entryIdx) => (
                              <span
                                key={entryIdx}
                                className="text-xs bg-muted/50 border border-border rounded px-2 py-0.5 text-foreground/90"
                              >
                                {entry.equipmentLabel || "Máquina"}{" "}
                                {entry.startHour}-{entry.endHour}
                              </span>
                            ))}
                          </div>
                          <p className="text-xs text-green-400 mt-1">
                            Total: {totalBlocksDurationLabel(workday.machineEntries)}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {workday.startHour} - {workday.endHour}
                        </p>
                      )}
                    </div>
                  </div>
                  <Edit2 className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <PackageOpen className="w-12 h-12 text-muted-foreground/70 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum dia de trabalho registrado</p>
              <p className="text-sm text-muted-foreground">
                Adicione um novo dia de trabalho clicando no botão acima
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes Card */}
      {(order.resultDescription || order.pontosEmAberto) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Observações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.resultDescription && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Descrição / Observações
                </h4>
                <p className="text-foreground bg-muted/50 rounded-lg p-3">
                  {order.resultDescription}
                </p>
              </div>
            )}
            {order.pontosEmAberto && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Pontos em Aberto
                </h4>
                <p className="text-foreground bg-muted/50 rounded-lg p-3">
                  {order.pontosEmAberto}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirmar exclusão</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Tem certeza que deseja excluir esta ordem de serviço? A ordem
              será movida para a Reciclagem e pode ser restaurada mais tarde.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="bg-accent"
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
          className="h-12 w-12 rounded-full"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </Button>
        <Button
          onClick={() => navigate(`/app/edit-service-order/${orderId}`)}
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90"
        >
          <Edit2 className="h-5 w-5 text-foreground" />
        </Button>
      </div>
    </div>
  );
};

export default OrderDetail;
