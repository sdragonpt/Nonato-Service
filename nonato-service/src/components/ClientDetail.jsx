import { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase.jsx";
import { useParams, useNavigate } from "react-router-dom";
import {
  Loader2,
  ArrowLeft,
  Camera,
  Trash2,
  Edit2,
  Plus,
  Map,
  Mail,
  Phone,
  FileText,
  AlertTriangle,
} from "lucide-react";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ClientDetail = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [services, setServices] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [newPhotoURL, setNewPhotoURL] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [, setPhotoChanged] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setPhotoLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch client data
        const clientDoc = doc(db, "clientes", clientId);
        const clientData = await getDoc(clientDoc);

        if (!clientData.exists()) {
          setError("Cliente não encontrado");
          return;
        }

        setClient({ id: clientData.id, ...clientData.data() });
        setNewPhotoURL(clientData.data().profilePic);

        // Fetch orders and equipment in parallel
        const [servicesSnapshot, equipmentsSnapshot] = await Promise.all([
          getDocs(
            query(collection(db, "ordens"), where("clientId", "==", clientId))
          ),
          getDocs(
            query(
              collection(db, "equipamentos"),
              where("clientId", "==", clientId)
            )
          ),
        ]);

        setServices(
          servicesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
        setEquipments(
          equipmentsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError(
          "Erro ao carregar dados do cliente. Por favor, tente novamente."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [clientId]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("A imagem deve ter menos de 2MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPhotoURL(reader.result);
      };
      reader.readAsDataURL(file);
      setImageFile(file);
      setPhotoChanged(true);
    }
  };

  const handleDeleteClient = async () => {
    try {
      setIsSubmitting(true);

      // Delete orders first
      const servicesDeletePromises = services.map((service) =>
        deleteDoc(doc(db, "ordens", service.id))
      );
      await Promise.all(servicesDeletePromises);

      // Then delete equipments
      const equipmentsDeletePromises = equipments.map((equipment) =>
        deleteDoc(doc(db, "equipamentos", equipment.id))
      );
      await Promise.all(equipmentsDeletePromises);

      // Finally delete the client
      await deleteDoc(doc(db, "clientes", clientId));

      navigate("/app/manage-clients");
    } catch (err) {
      console.error("Erro ao apagar cliente:", err);
      setError("Erro ao apagar cliente. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
      setDeleteDialogOpen(false);
    }
  };

  const getInitials = (name) => {
    return (
      name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "??"
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!client) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Detalhes do Cliente</h1>
          <p className="text-sm text-zinc-400">
            Visualize e gerencie as informações do cliente
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

      {/* Client Info Card */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar className="h-20 w-20">
                <AvatarImage src={client.profilePic} alt={client.name} />
                <AvatarFallback className="bg-zinc-700 text-white">
                  {getInitials(client.name)}
                </AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="w-6 h-6 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-semibold text-white">
                  {client.name}
                </h3>
                <Badge
                  className={
                    client.type === "company"
                      ? "bg-purple-500/10 text-purple-500"
                      : "bg-blue-500/10 text-blue-500"
                  }
                >
                  {client.type === "company" ? "Empresa" : "Pessoa"}
                </Badge>
              </div>
              {client.company && (
                <p className="text-zinc-400 text-sm">{client.company}</p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {client.phone && (
              <div className="flex items-center gap-2 text-zinc-400">
                <Phone className="h-4 w-4 shrink-0" />
                <span>{client.phone}</span>
              </div>
            )}
            {client.address && (
              <div className="flex items-center gap-2 text-zinc-400">
                <Map className="h-4 w-4 shrink-0" />
                <span>{client.address}</span>
              </div>
            )}
            {client.postalCode && (
              <div className="flex items-center gap-2 text-zinc-400">
                <Mail className="h-4 w-4 shrink-0" />
                <span>{client.postalCode}</span>
              </div>
            )}
            {client.nif && (
              <div className="flex items-center gap-2 text-zinc-400">
                <FileText className="h-4 w-4 shrink-0" />
                <span>{client.nif}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 mt-6">
            <Button
              onClick={() => navigate(`/app/edit-client/${clientId}`)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Editar Cliente
            </Button>
            <Button
              onClick={() => navigate(`/app/add-order?clientId=${clientId}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Ordem
            </Button>
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Cliente
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Equipment Card */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader className="flex-row justify-between items-center">
          <CardTitle className="text-lg text-white">Equipamentos</CardTitle>
          <Button
            onClick={() => navigate(`/app/client/${clientId}/add-equipment`)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Equipamento
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {equipments.length > 0 ? (
            equipments.map((equipment) => (
              <div
                key={equipment.id}
                onClick={() => navigate(`/app/equipment/${equipment.id}`)}
                className="flex items-center p-4 bg-zinc-700/50 hover:bg-zinc-700 rounded-lg cursor-pointer transition-colors"
              >
                <Avatar className="h-12 w-12 mr-4">
                  <AvatarImage
                    src={equipment.equipmentPic}
                    alt={equipment.model}
                  />
                  <AvatarFallback className="bg-zinc-600">
                    {equipment.type?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium text-white">{equipment.type}</h4>
                  <p className="text-sm text-zinc-400">
                    {[equipment.brand, equipment.model, equipment.serialNumber]
                      .filter(Boolean)
                      .join(" - ")}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-zinc-400">
              Nenhum equipamento cadastrado
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
              Tem certeza que deseja excluir o cliente{" "}
              <span className="font-semibold text-white">{client?.name}</span>?
              Esta ação também irá excluir todos os equipamentos associados e
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
              onClick={handleDeleteClient}
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

export default ClientDetail;
