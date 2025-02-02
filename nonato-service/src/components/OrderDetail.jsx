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
import { db } from "../firebase.jsx";
import generateServiceOrderPDF from "./generateServiceOrderPDF.jsx";
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
} from "lucide-react";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Keep original calculateHours, calculateHoursWithPause, and calculateOrderTotals functions
  // [Previous calculation functions remain unchanged]

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

      // Process client data
      if (orderData.clientId) {
        const clientDoc = await getDoc(doc(db, "clientes", orderData.clientId));
        if (clientDoc.exists()) {
          setClient({ id: clientDoc.id, ...clientDoc.data() });
        }
      }

      // Process equipment data
      if (orderData.equipmentId) {
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

  // Keep original handleGeneratePDF function
  const handleGeneratePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      setError(null);

      // Format data for PDF
      const formattedData = {
        orderId,
        orderNumber: order.orderNumber || orderId,
        clientData: {
          name: client?.name || "",
          phone: client?.phone || "",
          address: client?.address || "",
        },
        equipmentData: {
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

      const fileName = `OrdemServico_${
        client?.name || "Cliente"
      }_${orderId}.pdf`;

      // Generate PDF using your existing function
      const pdfResult = await generateServiceOrderPDF(
        orderId,
        formattedData,
        client,
        equipment,
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

      {/* Order Details Card */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-lg text-white">
            Detalhes da Ordem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
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
                <User className="h-4 w-4 text-zinc-400" />
                <div>
                  <p className="text-sm text-zinc-400">Cliente</p>
                  <p className="text-white">{client?.name || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-zinc-400" />
                <div>
                  <p className="text-sm text-zinc-400">Equipamento</p>
                  <p className="text-white">
                    {equipment
                      ? `${equipment.brand} - ${equipment.model}`
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-zinc-400" />
                <div>
                  <p className="text-sm text-zinc-400">Tipo de Serviço</p>
                  <p className="text-white">{order.serviceType}</p>
                </div>
              </div>

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
          onClick={() => navigate(`/app/edit-order/${orderId}`)}
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
