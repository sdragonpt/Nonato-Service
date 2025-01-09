import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
  Clipboard,
} from "lucide-react";

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

        // Fetch services and equipment in parallel
        const [servicesSnapshot, equipmentsSnapshot] = await Promise.all([
          getDocs(
            query(collection(db, "servicos"), where("clientId", "==", clientId))
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

      // Delete services first
      const servicesDeletePromises = services.map((service) =>
        deleteDoc(doc(db, "servicos", service.id))
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
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </button>
      </div>
    );
  }

  if (!client) return null;

  return (
    <div className="w-full max-w-3xl mx-auto rounded-lg p-4">
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all hover:scale-105 flex items-center justify-center"
        aria-label="Voltar"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <h2 className="text-2xl font-medium mb-6 text-white text-center">
        {client.name}
      </h2>

      <div className="flex flex-col items-center mb-6">
        <label className="relative cursor-pointer group">
          <div className="relative">
            <img
              src={newPhotoURL || "/nonato.png"}
              alt="Foto de Perfil"
              className="w-24 h-24 rounded-full mb-2 border-zinc-800 border-2 object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-8 h-8 text-white" />
            </div>
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
        </label>

        <div className="flex flex-wrap justify-center gap-2 mt-4">
          <button
            onClick={handleRemovePhoto}
            disabled={photoLoading}
            className="flex items-center px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Remover Foto
          </button>

          <button
            onClick={handleDeleteClient}
            disabled={deleteLoading}
            className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {deleteLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Apagar Cliente
          </button>

          <button className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">
            <Link
              to={`/app/add-service?clientId=${client.id}`}
              className="flex items-center"
            >
              <Clipboard className="w-4 h-4 mr-2" />
              Nova Ordem de Serviço
            </Link>
          </button>
        </div>

        {photoChanged && (
          <button
            onClick={handleSavePhoto}
            disabled={photoLoading}
            className="mt-4 flex items-center px-6 py-2 bg-[#9df767] hover:bg-[#8be656] text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {photoLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Camera className="w-4 h-4 mr-2" />
            )}
            Salvar Foto
          </button>
        )}
      </div>

      <div className="bg-zinc-800 p-4 mb-6 rounded-lg space-y-3">
        <div className="flex items-center text-gray-300">
          <Map className="w-5 h-5 mr-3" />
          <span className="font-medium mr-2">Endereço:</span>
          {client.address || "Não definido"}
        </div>
        <div className="flex items-center text-gray-300">
          <Mail className="w-5 h-5 mr-3" />
          <span className="font-medium mr-2">Código Postal:</span>
          {client.postalCode || "Não definido"}
        </div>
        <div className="flex items-center text-gray-300">
          <Phone className="w-5 h-5 mr-3" />
          <span className="font-medium mr-2">Telefone:</span>
          {client.phone || "Não definido"}
        </div>
        <div className="flex items-center text-gray-300">
          <FileText className="w-5 h-5 mr-3" />
          <span className="font-medium mr-2">NIF:</span>
          {client.nif || "Não definido"}
        </div>
      </div>

      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg text-white font-medium">Equipamentos:</h3>
        <span className="text-gray-400 text-sm">
          {equipments.length} equipamento(s)
        </span>
      </div>

      <div className="space-y-4 mb-32">
        {equipments.length > 0 ? (
          equipments.map((equipment) => (
            <div
              key={equipment.id}
              onClick={() => navigate(`/app/equipment/${equipment.id}`)}
              className="flex items-center p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors"
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
              <div className="flex-grow">
                <h4 className="font-semibold text-white">{equipment.type}</h4>
                <p className="text-gray-400">
                  {[equipment.brand, equipment.model, equipment.serialNumber]
                    .filter(Boolean) // Filtra apenas os valores não vazios
                    .join(" - ")}{" "}
                  {/* Junta os valores com " - " */}
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

      <div className="fixed bottom-4 left-0 right-0 flex justify-center items-center md:left-64">
        <p className="absolute bottom-24 text-white mb-2 text-center">
          Clique + para adicionar novo equipamento
        </p>

        <button
          className="w-32 h-16 bg-[#1d2d50] hover:bg-[#283b6a] mr-4 text-white flex items-center justify-center rounded-full transition-colors"
          onClick={() => navigate(`/app/services/${clientId}`)}
          aria-label="Serviços do Cliente"
        >
          <Wrench className="w-5 h-5 mr-2" />
          Serviços
        </button>

        <button
          onClick={() => navigate(`/app/client/${clientId}/add-equipment`)}
          className="h-20 w-20 -mt-8 bg-[#117d49] hover:bg-[#117d49] text-white flex items-center justify-center rounded-full shadow-lg transition-all hover:scale-105"
          aria-label="Adicionar Equipamento"
        >
          <Plus className="w-8 h-8" />
        </button>

        <button
          className="w-32 h-16 bg-[#1d2d50] hover:bg-[#283b6a] ml-4 text-white flex items-center justify-center rounded-full transition-colors"
          onClick={() => navigate(`/app/edit-client/${clientId}`)}
          aria-label="Editar Cliente"
        >
          <Edit className="w-5 h-5 mr-2" />
          Editar
        </button>
      </div>
    </div>
  );
};

export default ClientDetail;
