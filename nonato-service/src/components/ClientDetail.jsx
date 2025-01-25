import React, { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase.jsx";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Loader2,
  ArrowLeft,
  Camera,
  Trash2,
  Edit,
  Plus,
  Wrench,
  Map,
  Mail,
  Phone,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const ClientDetail = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [services, setServices] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [newPhotoURL, setNewPhotoURL] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [photoChanged, setPhotoChanged] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);

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
        // 2MB limit
        alert("A imagem deve ter menos de 2MB");
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

  const handleSavePhoto = async () => {
    if (!imageFile) {
      alert("Por favor, selecione uma imagem para salvar.");
      return;
    }

    try {
      setPhotoLoading(true);
      const clientDocRef = doc(db, "clientes", clientId);
      await updateDoc(clientDocRef, {
        profilePic: newPhotoURL,
      });

      setClient((prevClient) => ({
        ...prevClient,
        profilePic: newPhotoURL,
      }));
      setPhotoChanged(false);
      alert("Foto de perfil atualizada com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar foto:", err);
      alert("Erro ao salvar foto. Por favor, tente novamente.");
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm("Tem certeza que deseja remover a foto?")) {
      return;
    }

    try {
      setPhotoLoading(true);
      const clientDocRef = doc(db, "clientes", clientId);
      await updateDoc(clientDocRef, {
        profilePic: "",
      });

      setNewPhotoURL("/nonato.png");
      setImageFile(null);
      setPhotoChanged(false);
      alert("Foto de perfil removida com sucesso!");
    } catch (err) {
      console.error("Erro ao remover foto:", err);
      alert("Erro ao remover foto. Por favor, tente novamente.");
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleDeleteClient = async () => {
    if (
      !window.confirm(
        "Tem certeza que deseja apagar este cliente e todos os equipamentos associados? Esta ação não pode ser desfeita."
      )
    ) {
      return;
    }

    try {
      setDeleteLoading(true);

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
      alert("Ocorreu um erro ao tentar apagar o cliente. Tente novamente.");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <div className="flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <p className="font-bold">Erro</p>
          </div>
          <p>{error}</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </button>
      </div>
    );
  }

  if (!client) return null;

  return (
    <div className="container max-w-4xl mx-auto px-4 py-4 md:py-8">
      <nav className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div className="hidden md:block">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-400 hover:text-blue-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar
          </button>
        </div>
        <div className="md:hidden fixed top-4 right-4 z-50">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center bg-gray-700 text-white p-3 rounded-full hover:bg-gray-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
        <div className="flex w-full md:w-auto gap-2">
          <Link
            to={`/app/add-order?clientId=${client.id}`}
            className="flex-1 md:flex-none bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center justify-center hover:bg-gray-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Ordem
          </Link>
          <button
            onClick={() => navigate(`/app/edit-client/${clientId}`)}
            className="flex-1 md:flex-none bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center justify-center hover:bg-blue-600"
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </button>
        </div>
      </nav>

      <div className="bg-zinc-800 rounded-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row items-center text-center md:text-left gap-4">
          <div className="relative group">
            <img
              src={newPhotoURL || "/nonato.png"}
              alt={client.name}
              className="w-24 h-24 md:w-20 md:h-20 rounded-full object-cover border-2 border-gray-700"
            />
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
            <h2 className="text-2xl font-bold text-white">{client.name}</h2>
            <p className="text-gray-400">{client.nif || "NIF não definido"}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="flex items-center text-gray-300">
            <Map className="w-5 h-5 mr-3 shrink-0 text-gray-400" />
            <span>{client.address || "Endereço não definido"}</span>
          </div>
          <div className="flex items-center text-gray-300">
            <Mail className="w-5 h-5 mr-3 shrink-0 text-gray-400" />
            <span>{client.postalCode || "Código postal não definido"}</span>
          </div>
          <div className="flex items-center text-gray-300">
            <Phone className="w-5 h-5 mr-3 shrink-0 text-gray-400" />
            <span>{client.phone || "Telefone não definido"}</span>
          </div>
          <div className="flex items-center text-gray-300">
            <FileText className="w-5 h-5 mr-3 shrink-0 text-gray-400" />
            <span>{client.nif || "NIF não definido"}</span>
          </div>
        </div>
      </div>

      <div className="bg-zinc-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Equipamentos</h3>
          <span className="text-sm text-gray-400">
            {equipments.length} equipamento(s)
          </span>
        </div>
        <div className="space-y-4">
          {equipments.length > 0 ? (
            equipments.map((equipment) => (
              <div
                key={equipment.id}
                onClick={() => navigate(`/app/equipment/${equipment.id}`)}
                className="flex items-center p-4 bg-zinc-700 hover:bg-zinc-700/50 rounded-lg cursor-pointer transition-colors"
              >
                <img
                  src={equipment.equipmentPic || "/nonato.png"}
                  alt={equipment.model}
                  className="w-12 h-12 rounded-full mr-4 object-cover"
                  onError={(e) => {
                    e.target.src = "/nonato.png";
                    e.target.onerror = null;
                  }}
                />
                <div>
                  <h4 className="font-medium text-white">{equipment.type}</h4>
                  <p className="text-sm text-gray-400">
                    {[equipment.brand, equipment.model, equipment.serialNumber]
                      .filter(Boolean)
                      .join(" - ")}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-400">
              Nenhum equipamento cadastrado
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-6 right-6 flex flex-col items-end gap-4 z-50">
        <div className="flex gap-2">
          <button
            onClick={handleDeleteClient}
            disabled={deleteLoading}
            className="bg-red-500 p-3 md:p-3 rounded-full shadow-lg hover:bg-red-600 hover:scale-105 transition-all text-white"
            title="Apagar Cliente"
          >
            {deleteLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Trash2 className="w-5 h-5" />
            )}
            <span className="sr-only">Apagar Cliente</span>
          </button>
          <button
            onClick={() => navigate(`/app/manage-services/${clientId}`)}
            className="bg-gray-600 p-3 md:p-3 rounded-full shadow-lg hover:bg-gray-700 hover:scale-105 transition-all text-white"
            title="Serviços"
          >
            <Wrench className="w-5 h-5" />
            <span className="sr-only">Serviços</span>
          </button>
        </div>
        <button
          onClick={() => navigate(`/app/client/${clientId}/add-equipment`)}
          className="bg-green-500 p-4 md:p-4 rounded-full shadow-lg hover:bg-green-600 hover:scale-105 transition-all text-white"
          title="Adicionar Equipamento"
        >
          <Plus className="w-6 h-6" />
          <span className="sr-only">Adicionar Equipamento</span>
        </button>
      </div>
    </div>
  );
};

export default ClientDetail;
