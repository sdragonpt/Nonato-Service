import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  orderBy,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase.jsx";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Loader2,
  MoreVertical,
  Edit2,
  Trash2,
  ClipboardCheck,
  AlertCircle,
  User,
  Package,
  CheckSquare,
} from "lucide-react";

const ManageInspection = () => {
  const [inspections, setInspections] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInspections = async () => {
      try {
        setIsLoading(true);
        const inspectionsRef = collection(db, "inspections");
        const q = query(inspectionsRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        const inspectionPromises = querySnapshot.docs.map(
          async (docSnapshot) => {
            const inspectionData = {
              id: docSnapshot.id,
              ...docSnapshot.data(),
            };

            // Fetch client data
            const clientRef = doc(db, "clientes", inspectionData.clientId);
            const clientDoc = await getDoc(clientRef);
            inspectionData.clientName = clientDoc.exists()
              ? clientDoc.data().name
              : "Cliente não encontrado";

            // Fetch equipment data
            const equipmentRef = doc(
              db,
              "equipamentos",
              inspectionData.equipmentId
            );
            const equipmentDoc = await getDoc(equipmentRef);
            inspectionData.equipmentType = equipmentDoc.exists()
              ? equipmentDoc.data().type
              : "Equipamento não encontrado";

            // Fetch checklist type data
            const checklistRef = doc(
              db,
              "checklist_machines",
              inspectionData.checklistTypeId
            );
            const checklistDoc = await getDoc(checklistRef);
            inspectionData.checklistType = checklistDoc.exists()
              ? checklistDoc.data().type
              : "Tipo não encontrado";

            return inspectionData;
          }
        );

        const inspectionsData = await Promise.all(inspectionPromises);
        setInspections(inspectionsData);
        setError(null);
      } catch (err) {
        console.error("Erro ao carregar inspeções:", err);
        setError("Erro ao carregar inspeções. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInspections();
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleDelete = async (inspectionId, e) => {
    e.stopPropagation();
    if (window.confirm("Tem certeza que deseja deletar esta inspeção?")) {
      try {
        await deleteDoc(doc(db, "inspections", inspectionId));
        setInspections(
          inspections.filter((inspection) => inspection.id !== inspectionId)
        );
        setActiveMenu(null);
      } catch (error) {
        setError("Erro ao deletar inspeção. Por favor, tente novamente.");
        console.error("Erro ao deletar inspeção:", error);
      }
    }
  };

  const toggleMenu = (e, inspectionId) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === inspectionId ? null : inspectionId);
  };

  const filteredInspections = inspections.filter(
    (inspection) =>
      inspection.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspection.equipmentType
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      inspection.checklistType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto rounded-lg p-4">
      <h2 className="text-2xl font-semibold text-center text-white mb-6">
        Inspeções
      </h2>

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-red-500">{error}</p>
        </div>
      )}

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por cliente, equipamento ou tipo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 pl-10 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div className="mb-4 flex justify-between items-center">
        <span className="text-gray-400">
          {filteredInspections.length} inspeção(ões)
        </span>
      </div>

      <div className="space-y-4 mb-32">
        {filteredInspections.length > 0 ? (
          filteredInspections.map((inspection) => (
            <div
              key={inspection.id}
              onClick={() =>
                navigate(`/app/inspection-detail/${inspection.id}`)
              }
              className="group flex items-center p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors relative"
            >
              <div className="flex items-center flex-grow min-w-0">
                <div className="h-12 w-12 rounded-full bg-[#117d49] flex items-center justify-center mr-4">
                  <ClipboardCheck className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0 flex-grow">
                  <h3 className="font-semibold text-white truncate">
                    {inspection.clientName}
                  </h3>
                  <div className="flex flex-col text-sm text-gray-400">
                    <div className="flex items-center">
                      <Package className="w-4 h-4 mr-1" />
                      <span className="truncate">
                        {inspection.equipmentType}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <CheckSquare className="w-4 h-4 mr-1" />
                      <span className="truncate">
                        {inspection.checklistType}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={(e) => toggleMenu(e, inspection.id)}
                className="p-2 ml-2 text-gray-400 hover:text-white rounded-full focus:outline-none"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {activeMenu === inspection.id && (
                <div
                  className="absolute right-0 top-full mt-2 w-48 bg-gray-800 rounded-lg shadow-lg z-50 py-1 border border-gray-700"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) =>
                      navigate(`/app/edit-inspection/${inspection.id}`)
                    }
                    className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 flex items-center"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Editar
                  </button>
                  <button
                    onClick={(e) => handleDelete(inspection.id, e)}
                    className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700 flex items-center"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-white text-center py-8">
            <p className="mb-2">Nenhuma inspeção encontrada.</p>
            <p className="text-gray-400">
              Tente ajustar sua busca ou adicione uma nova inspeção.
            </p>
          </div>
        )}
      </div>

      <div className="fixed bottom-4 left-0 right-0 flex justify-center items-center md:left-64">
        <button
          onClick={() => navigate("/app/add-inspection")}
          className="h-16 px-6 bg-[#117d49] text-white font-medium flex items-center justify-center rounded-full shadow-lg hover:bg-[#0d6238] transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nova Inspeção
        </button>
      </div>
    </div>
  );
};

export default ManageInspection;
