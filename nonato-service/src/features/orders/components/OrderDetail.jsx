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
  deleteDoc,
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
  User,
  Printer,
  Settings,
  AlertCircle,
  PackageOpen,
  Edit,
  Calculator,
  Euro,
  Package2,
  CheckCircle,
  UserCheck,
  UserX,
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
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [orderDoc, , , workdaysSnapshot] = await Promise.all([
        getDoc(doc(db, "ordens", orderId)),
        getDocs(collection(db, "clientes")),
        getDocs(collection(db, "equipamentos")),
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

      const fileName = `${order.isQuote ? "Orcamento" : "OrdemServico"}_${
        order.isUnregisteredClient
          ? order.unregisteredClient?.name || "Cliente"
          : client?.name || "Cliente"
      }_${orderId}.pdf`;

      let pdfResult;

      if (order.isQuote) {
        // Gerar PDF específico para orçamento
        pdfResult = await generateQuotePDF(orderId, order, client, fileName);
      } else {
        // Gerar PDF padrão para ordem de serviço
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
        };

        pdfResult = await generateServiceOrderPDF(
          orderId,
          formattedData,
          order.isUnregisteredClient ? order.unregisteredClient : client,
          order.manualEquipment?.model ? order.manualEquipment : equipment,
          workdays,
          fileName
        );
      }

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

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);

      // Delete workdays first
      const deleteWorkdaysPromises = workdays.map((workday) =>
        deleteDoc(doc(db, "workdays", workday.id))
      );
      await Promise.all(deleteWorkdaysPromises);

      // Then delete the order
      await deleteDoc(doc(db, "ordens", orderId));
      navigate("/app/manage-orders");
    } catch (err) {
      console.error("Erro ao deletar ordem:", err);
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

  const orderType = order.isQuote ? "Orçamento Online" : "Ordem de Serviço";

  const formatPrice = (price) => {
    return `€ ${parseFloat(price).toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {orderType} #{orderId}
          </h1>
          <p className="text-sm text-zinc-400">
            {order.isQuote
              ? "Visualize e gerencie os detalhes do orçamento online"
              : "Visualize e gerencie os detalhes da ordem de serviço"}
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

      {/* ✅ SEÇÃO MELHORADA DE ORÇAMENTOS ONLINE */}
      {order.isQuote && order.items && (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white flex items-center">
                <Package2 className="h-5 w-5 mr-2 text-orange-400" />
                Itens do Orçamento Online
                <Badge className="ml-2 bg-orange-500/20 text-orange-400">
                  {order.items.length} item(s)
                </Badge>
              </CardTitle>

              {/* Botão para editar preços */}
              <Button
                onClick={() => navigate(`/app/edit-service-order/${orderId}`)}
                variant="outline"
                size="sm"
                className="border-blue-600 text-blue-400 hover:bg-blue-500/20"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Definir Preços
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {/* Resumo do orçamento */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-zinc-700/30 rounded-lg border border-zinc-600/50">
                <div className="text-center">
                  <p className="text-sm text-zinc-400">Total de Itens</p>
                  <p className="text-xl font-bold text-white">
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-sm text-zinc-400">Itens com Preço</p>
                  <p className="text-xl font-bold text-green-400">
                    {order.items.filter((item) => item.price > 0).length}
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-sm text-zinc-400">Valor Total</p>
                  <p className="text-xl font-bold text-green-400">
                    {formatPrice(
                      order.items.reduce(
                        (sum, item) => sum + item.quantity * (item.price || 0),
                        0
                      )
                    )}
                  </p>
                </div>
              </div>

              {/* Lista de itens */}
              <div className="space-y-3">
                {order.items.map((item, index) => {
                  const hasPrice = item.price && item.price > 0;
                  const subtotal = item.quantity * (item.price || 0);

                  return (
                    <div
                      key={index}
                      className={`flex justify-between items-center p-4 rounded-lg border transition-colors ${
                        hasPrice
                          ? "bg-green-500/10 border-green-500/30"
                          : "bg-amber-500/10 border-amber-500/30"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white font-medium">{item.name}</p>
                          {!hasPrice && (
                            <Badge className="bg-amber-500/20 text-amber-400 text-xs">
                              Sem preço
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-zinc-400">
                          Código: {item.code}
                        </p>
                        <p className="text-sm text-zinc-400">
                          Quantidade: {item.quantity}
                        </p>
                      </div>

                      <div className="text-right">
                        {hasPrice ? (
                          <>
                            <p className="text-white font-medium">
                              {formatPrice(item.price)} / un.
                            </p>
                            <p className="text-lg font-bold text-green-400">
                              {formatPrice(subtotal)}
                            </p>
                          </>
                        ) : (
                          <div className="flex flex-col items-end">
                            <p className="text-amber-400 text-sm font-medium">
                              Preço não definido
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                navigate(`/app/edit-service-order/${orderId}`)
                              }
                              className="mt-1 border-amber-600 text-amber-400 hover:bg-amber-500/20"
                            >
                              <Euro className="h-3 w-3 mr-1" />
                              Definir
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Status do orçamento */}
              <div className="mt-6 p-4 bg-zinc-700/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-zinc-300 mb-1">
                      Status do Orçamento
                    </h4>
                    <p className="text-xs text-zinc-400">
                      ID Original:{" "}
                      {order.originalQuoteId
                        ? `${order.originalQuoteId.substring(0, 8)}...`
                        : "N/A"}
                    </p>
                  </div>

                  <div className="text-right">
                    {order.items.every((item) => item.price > 0) ? (
                      <div className="flex items-center text-green-400">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium">
                          Orçamento Completo
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center text-amber-400">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium">
                          Preços Pendentes
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
              {order.isQuote && (
                <Badge className="bg-orange-500/10 text-orange-400">
                  Orçamento Online
                </Badge>
              )}
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
                <span className="sm:inline">Gerar PDF</span>
              </Button>
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
                  {key.charAt(0).toUpperCase() +
                    key.slice(1).replace(/([A-Z])/g, " $1")}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Workdays Card */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="text-lg text-white">Dias de Trabalho</CardTitle>
          {!order.isQuote && (
            <Button
              onClick={() => navigate(`/app/order/${orderId}/add-workday`)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Dia
            </Button>
          )}
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
              Tem certeza que deseja excluir esta ordem de serviço? Esta ação
              também irá excluir todos os dias de trabalho associados e não pode
              ser desfeita.
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
