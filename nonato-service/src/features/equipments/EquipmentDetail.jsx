import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../../firebase.jsx";
import { compressImage } from "../../utils/imageCompression.js";
import { formatDate } from "../../utils/formatDate.js";
import {
  ArrowLeft,
  Camera,
  Loader2,
  Trash2,
  Edit2,
  Package,
  Barcode,
  Tag,
  Shapes,
  AlertTriangle,
  User,
  Wrench,
  Plus,
  ChevronRight,
  Printer,
} from "lucide-react";

// UI Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Button } from "@/components/ui/button.jsx";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";


// ✅ Uma ordem pode ter vários equipamentos (ordens "especiais" — ver
// AddOrder.jsx/EditOrder.jsx). O campo singular `equipmentId` continua a ser
// gravado a partir do 1º equipamento da lista, mas para não perder ordens
// onde esta máquina foi apenas o 2º/3º equipamento, é preciso procurar
// também dentro de `equipmentsList`.
const orderReferencesEquipment = (order, equipmentId) =>
  order.equipmentId === equipmentId ||
  (order.equipmentsList || []).some((e) => e.equipmentId === equipmentId);

const EquipmentDetail = () => {
  const { equipmentId } = useParams();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState(null);
  const [clientName, setClientName] = useState("");
  const [existingStoragePath, setExistingStoragePath] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [machineHistory, setMachineHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const equipmentDoc = doc(db, "equipamentos", equipmentId);
        const equipmentData = await getDoc(equipmentDoc);

        if (!equipmentData.exists()) {
          setError("Equipamento não encontrado");
          return;
        }

        const equipmentInfo = { id: equipmentData.id, ...equipmentData.data() };
        setEquipment(equipmentInfo);
        setExistingStoragePath(equipmentInfo.equipmentPicStoragePath || "");

        // Fetch client name
        const clientDoc = doc(db, "clientes", equipmentInfo.clientId);
        const clientData = await getDoc(clientDoc);

        if (clientData.exists()) {
          setClientName(clientData.data().name);
        }
      } catch (err) {
        console.error("Erro ao buscar equipamento:", err);
        setError("Erro ao carregar dados do equipamento");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEquipment();
  }, [equipmentId]);

  // ✅ Histórico da máquina — intervenções (ordens de serviço) onde este
  // equipamento foi chamado, em vez do antigo (e desatualizado) "Histórico
  // de Inspeções". Vai buscar as ordens do mesmo cliente e filtra do lado
  // do cliente pelas que referenciam este equipamento.
  useEffect(() => {
    const fetchMachineHistory = async () => {
      if (!equipment?.clientId) return;
      try {
        setHistoryLoading(true);
        const q = query(
          collection(db, "ordens"),
          where("clientId", "==", equipment.clientId)
        );
        const snap = await getDocs(q);

        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((order) => !order.eliminadoEm)
          .filter((order) => orderReferencesEquipment(order, equipmentId))
          .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        setMachineHistory(list);
      } catch (err) {
        console.error("Erro ao buscar histórico da máquina:", err);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchMachineHistory();
  }, [equipment?.clientId, equipmentId]);

  // ✅ Foto do equipamento — comprimida e enviada para o Storage (em vez do
  // base64 gigante gravado diretamente no documento), com limpeza do
  // ficheiro antigo quando é substituída. Grava assim que é escolhida uma
  // nova imagem (antes disto, a alteração de foto nesta página nem sequer
  // era guardada — não havia botão "Guardar").
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setError("A imagem deve ter menos de 8MB");
      return;
    }

    try {
      setIsUploadingPhoto(true);
      setError(null);

      const compressed = await compressImage(file, { maxDimension: 600, quality: 0.8 });
      const storagePath = `equipamentos/${equipmentId}/foto_${Date.now()}.jpg`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, compressed, { contentType: "image/jpeg" });
      const url = await getDownloadURL(storageRef);

      await updateDoc(doc(db, "equipamentos", equipmentId), {
        equipmentPic: url,
        equipmentPicStoragePath: storagePath,
      });

      if (existingStoragePath) {
        try {
          await deleteObject(ref(storage, existingStoragePath));
        } catch {
          // foto antiga pode já não existir no storage
        }
      }

      setEquipment((prev) => ({ ...prev, equipmentPic: url, equipmentPicStoragePath: storagePath }));
      setExistingStoragePath(storagePath);
    } catch (err) {
      console.error("Erro ao salvar foto:", err);
      setError("Erro ao salvar foto. Por favor, tente novamente.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleDeleteEquipment = async () => {
    try {
      setIsSubmitting(true);
      await deleteDoc(doc(db, "equipamentos", equipmentId));
      if (existingStoragePath) {
        try {
          await deleteObject(ref(storage, existingStoragePath));
        } catch {
          // foto pode já não existir no storage
        }
      }
      navigate(`/app/client/${equipment.clientId}`);
    } catch (err) {
      console.error("Erro ao apagar equipamento:", err);
      setError("Erro ao apagar equipamento. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!equipment) return null;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
            <Printer className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Detalhes do Equipamento
            </h1>
            <p className="text-sm text-zinc-400">
              Visualize e gerencie as informações do equipamento
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-10 w-10 rounded-full border-zinc-700 text-white hover:bg-green-700 bg-green-600 shrink-0"
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

      {/* Equipment Info Card */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative group shrink-0">
              <Avatar className="h-20 w-20 border-2 border-zinc-700">
                <AvatarImage
                  src={equipment.equipmentPic}
                  alt={equipment.type}
                  className="object-cover"
                />
                <AvatarFallback className="bg-zinc-900 text-zinc-500">
                  {equipment.type?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity cursor-pointer">
                {isUploadingPhoto ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  disabled={isUploadingPhoto}
                  className="hidden"
                />
              </label>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-semibold text-white truncate">
                  {equipment.type}
                </h3>
                {equipment.brand && (
                  <Badge variant="outline" className="text-zinc-300 border-zinc-600">
                    {equipment.brand}
                  </Badge>
                )}
              </div>
              <button
                type="button"
                onClick={() => navigate(`/app/client/${equipment.clientId}`)}
                className="flex items-center gap-2 text-zinc-400 hover:text-green-400 transition-colors"
              >
                <User className="h-4 w-4" />
                <span className="truncate">{clientName || "Cliente"}</span>
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Equipment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {equipment.brand && (
              <div className="flex items-center gap-2 text-zinc-400">
                <Package className="h-4 w-4 shrink-0" />
                <span>{equipment.brand}</span>
              </div>
            )}
            {equipment.model && (
              <div className="flex items-center gap-2 text-zinc-400">
                <Tag className="h-4 w-4 shrink-0" />
                <span>{equipment.model}</span>
              </div>
            )}
            {equipment.serialNumber && (
              <div className="flex items-center gap-2 text-zinc-400">
                <Barcode className="h-4 w-4 shrink-0" />
                <span>{equipment.serialNumber}</span>
              </div>
            )}
            {equipment.type && (
              <div className="flex items-center gap-2 text-zinc-400">
                <Shapes className="h-4 w-4 shrink-0" />
                <span>{equipment.type}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 mt-6">
            <Button
              onClick={() => navigate(`/app/edit-equipment/${equipmentId}`)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Editar Equipamento
            </Button>
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Equipamento
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Histórico da Máquina */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Wrench className="h-5 w-5 text-green-500" />
              Histórico da Máquina
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(`/app/add-order?clientId=${equipment.clientId}`)
              }
              className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-900"
            >
              <Plus className="h-4 w-4 mr-1" />
              Nova Ordem
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
            </div>
          ) : machineHistory.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-4">
              Nenhuma intervenção registada para esta máquina ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {machineHistory.slice(0, 5).map((order) => {
                const isClosed = order.status === "Fechado";
                return (
                  <div
                    key={order.id}
                    onClick={() => navigate(`/app/order-detail/${order.id}`)}
                    className="flex items-center justify-between p-3 bg-zinc-700/30 hover:bg-zinc-700/60 rounded-lg border border-zinc-600 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white text-sm font-medium truncate">
                          {order.serviceType || "Intervenção"}
                        </p>
                        {order.priority === "high" && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-red-500/20 text-red-400 hover:bg-red-500/30">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Urgente
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 font-mono">
                        {order.orderNumber || `OS-${order.id}`}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatDate(order.date || order.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          isClosed
                            ? "bg-green-500/20 text-green-400"
                            : "bg-blue-500/20 text-blue-400"
                        }`}
                      >
                        {isClosed ? "Fechada" : "Aberta"}
                      </span>
                      <ChevronRight className="h-4 w-4 text-zinc-500" />
                    </div>
                  </div>
                );
              })}

              {machineHistory.length > 5 && (
                <div className="text-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/app/manage-orders")}
                    className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 bg-transparent"
                  >
                    Ver todas as intervenções ({machineHistory.length})
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar exclusão</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem certeza que deseja excluir o equipamento{" "}
              <span className="font-semibold text-white">
                {equipment.type} - {equipment.model}
              </span>
              ? Esta ação não pode ser desfeita.
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
              onClick={handleDeleteEquipment}
              className="bg-red-600 hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EquipmentDetail;
