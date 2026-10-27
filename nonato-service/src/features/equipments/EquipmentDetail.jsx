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
import { PageHeader, PageLoader } from "../../components/app";


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
      <PageLoader />
    );
  }

  if (!equipment) return null;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <PageHeader
        title="Detalhes do Equipamento"
        description="Visualize e gerencie as informações do equipamento"
        icon={Printer}
        back
      />

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Equipment Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative group shrink-0">
              <Avatar className="h-20 w-20 border-2 border-border">
                <AvatarImage
                  src={equipment.equipmentPic}
                  alt={equipment.type}
                  className="object-cover"
                />
                <AvatarFallback className="bg-muted/50 text-muted-foreground">
                  {equipment.type?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity cursor-pointer">
                {isUploadingPhoto ? (
                  <Loader2 className="w-5 h-5 text-foreground animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-foreground" />
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
                <h3 className="text-xl font-semibold text-foreground truncate">
                  {equipment.type}
                </h3>
                {equipment.brand && (
                  <Badge variant="outline" className="text-foreground/90 border-border">
                    {equipment.brand}
                  </Badge>
                )}
              </div>
              <button
                type="button"
                onClick={() => navigate(`/app/client/${equipment.clientId}`)}
                className="flex items-center gap-2 text-muted-foreground hover:text-green-400 transition-colors"
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
              <div className="flex items-center gap-2 text-muted-foreground">
                <Package className="h-4 w-4 shrink-0" />
                <span>{equipment.brand}</span>
              </div>
            )}
            {equipment.model && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Tag className="h-4 w-4 shrink-0" />
                <span>{equipment.model}</span>
              </div>
            )}
            {equipment.serialNumber && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Barcode className="h-4 w-4 shrink-0" />
                <span>{equipment.serialNumber}</span>
              </div>
            )}
            {equipment.type && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shapes className="h-4 w-4 shrink-0" />
                <span>{equipment.type}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 mt-6">
            <Button
              onClick={() => navigate(`/app/edit-equipment/${equipmentId}`)}
            >
              <Edit2 className="w-4 h-4" />
              Editar Equipamento
            </Button>
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4" />
              Excluir Equipamento
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Histórico da Máquina */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-green-500" />
              Histórico da Máquina
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(`/app/add-order?clientId=${equipment.clientId}`)
              }
            >
              <Plus className="h-4 w-4" />
              Nova Ordem
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : machineHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
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
                    className="flex items-center justify-between p-3 bg-muted/30 hover:bg-white/5 rounded-lg border border-border cursor-pointer transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-foreground text-sm font-medium truncate">
                          {order.serviceType || "Intervenção"}
                        </p>
                        {order.priority === "high" && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-red-500/20 text-red-400 hover:bg-red-500/30">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Urgente
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        {order.orderNumber || `OS-${order.id}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
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
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
                    className="text-foreground/90"
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirmar exclusão</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Tem certeza que deseja excluir o equipamento{" "}
              <span className="font-semibold text-foreground">
                {equipment.type} - {equipment.model}
              </span>
              ? Esta ação não pode ser desfeita.
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
