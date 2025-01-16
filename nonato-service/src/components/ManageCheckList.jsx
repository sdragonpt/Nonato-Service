import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  orderBy,
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
  Settings,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Layers,
  ListChecks,
} from "lucide-react";

const ManageChecklist = () => {
  const [types, setTypes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [expandedTypes, setExpandedTypes] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        setIsLoading(true);
        const typesRef = collection(db, "checklist_machines");
        const q = query(typesRef, orderBy("type", "asc"));
        const querySnapshot = await getDocs(q);
        const typesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTypes(typesData);
        setError(null);
      } catch (err) {
        console.error("Erro ao carregar tipos:", err);
        setError("Erro ao carregar tipos. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTypes();
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleDelete = async (typeId, e) => {
    e.stopPropagation();
    if (window.confirm("Tem certeza que deseja deletar este tipo?")) {
      try {
        await deleteDoc(doc(db, "checklist_machines", typeId));
        setTypes(types.filter((type) => type.id !== typeId));
        setActiveMenu(null);
      } catch (error) {
        setError("Erro ao deletar tipo. Por favor, tente novamente.");
        console.error("Erro ao deletar tipo:", error);
      }
    }
  };

  const toggleMenu = (e, typeId) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === typeId ? null : typeId);
  };

  const toggleExpand = (typeId) => {
    setExpandedTypes((prev) => ({
      ...prev,
      [typeId]: !prev[typeId],
    }));
  };

  const filteredTypes = types.filter((type) =>
    type.type.toLowerCase().includes(searchTerm.toLowerCase())
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
        Checklist
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
          placeholder="Buscar tipos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 pl-10 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div className="mb-4 flex justify-between items-center">
        <span className="text-gray-400">{filteredTypes.length} tipo(s)</span>
      </div>

      <div className="space-y-4 mb-32">
        {filteredTypes.length > 0 ? (
          filteredTypes.map((type) => (
            <div key={type.id} className="bg-gray-700 rounded-lg overflow-hidden">
              <div
                className="group flex items-center p-4 cursor-pointer hover:bg-gray-600/50 transition-colors relative"
                onClick={() => toggleExpand(type.id)}
              >
                <div className="flex items-center flex-grow min-w-0">
                  <div className="h-12 w-12 rounded-full bg-[#117d49] flex items-center justify-center mr-4">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-grow">
                    <div className="flex items-center">
                      <h3 className="font-semibold text-white truncate">
                        {type.type}
                      </h3>
                      {expandedTypes[type.id] ? (
                        <ChevronDown className="w-5 h-5 text-gray-400 ml-2" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400 ml-2" />
                      )}
                    </div>
                    <div className="flex items-center text-gray-400 text-sm">
                      <Layers className="w-4 h-4 mr-1" />
                      <span>{type.groups?.length || 0} grupo(s)</span>
                      <ListChecks className="w-4 h-4 ml-3 mr-1" />
                      <span>
                        {type.groups?.reduce(
                          (total, group) =>
                            total + (group.characteristics?.length || 0),
                          0
                        )}{" "}
                        característica(s)
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => toggleMenu(e, type.id)}
                  className="p-2 ml-2 text-gray-400 hover:text-white rounded-full focus:outline-none"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {activeMenu === type.id && (
                  <div
                    className="absolute right-0 top-full mt-2 w-48 bg-gray-800 rounded-lg shadow-lg z-50 py-1 border border-gray-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/app/edit-checklist-type/${type.id}`);
                      }}
                      className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 flex items-center"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Editar
                    </button>
                    <button
                      onClick={(e) => handleDelete(type.id, e)}
                      className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700 flex items-center"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </button>
                  </div>
                )}
              </div>

              {/* Lista de Grupos Expandida */}
              {expandedTypes[type.id] &&
                type.groups &&
                type.groups.length > 0 && (
                  <div className="border-t border-gray-600">
                    {type.groups.map((group, index) => (
                      <div
                        key={index}
                        className="p-4 border-b last:border-b-0 border-gray-600 hover:bg-gray-600/50"
                      >
                        <h4 className="text-white font-medium mb-2">
                          {group.name}
                        </h4>
                        <div className="pl-4 space-y-1">
                          {group.characteristics?.map((char, charIndex) => (
                            <div
                              key={charIndex}
                              className="text-gray-400 text-sm"
                            >
                              • {char}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          ))
        ) : (
          <div className="text-white text-center py-8">
            <p className="mb-2">Nenhum tipo encontrado.</p>
            <p className="text-gray-400">
              Tente ajustar sua busca ou adicione um novo tipo.
            </p>
          </div>
        )}
      </div>

      <div className="fixed bottom-4 left-0 right-0 flex justify-center items-center md:left-64">
        <button
          onClick={() => navigate("/app/add-checklist-type")}
          className="h-16 px-6 bg-[#117d49] text-white font-medium flex items-center justify-center rounded-full shadow-lg hover:bg-[#0d6238] transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Tipo
        </button>
      </div>
    </div>
  );
};

export default ManageChecklist;
