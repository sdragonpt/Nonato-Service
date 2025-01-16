import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase.jsx";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  User,
  Package,
  CheckSquare,
  Save,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const InspectionDetail = () => {
  const { inspectionId: id } = useParams();
  const navigate = useNavigate();
  const [inspection, setInspection] = useState(null);
  const [client, setClient] = useState(null);
  const [equipment, setEquipment] = useState(null);
  const [checklistType, setChecklistType] = useState(null);
  const [groups, setGroups] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchInspectionDetails = async () => {
      try {
        setIsLoading(true);
        const inspectionDoc = await getDoc(doc(db, "inspections", id));

        if (!inspectionDoc.exists()) {
          setError("Inspeção não encontrada");
          return;
        }

        const inspectionData = inspectionDoc.data();
        setInspection(inspectionData);

        // Buscar dados do cliente
        const clientDoc = await getDoc(
          doc(db, "clientes", inspectionData.clientId)
        );
        setClient(clientDoc.data());

        // Buscar dados do equipamento
        const equipmentDoc = await getDoc(
          doc(db, "equipamentos", inspectionData.equipmentId)
        );
        setEquipment(equipmentDoc.data());

        // Buscar dados do tipo de checklist
        const checklistDoc = await getDoc(
          doc(db, "checklist_machines", inspectionData.checklistTypeId)
        );
        const checklistData = checklistDoc.data();
        setChecklistType(checklistData);

        // Verificar se há grupos selecionados na inspeção
        const selectedGroups = inspectionData.selectedGroups || [];

        // Inicializar grupos com estados
        const initialGroups = selectedGroups.map((group) => ({
          ...group,
          characteristics: group.characteristics.map((char) => ({
            name: char,
            state: inspectionData.states?.[group.name]?.[char]?.state || "",
            description:
              inspectionData.states?.[group.name]?.[char]?.description || "",
          })),
        }));

        setGroups(initialGroups);

        // Inicializar todos os grupos como expandidos
        const initialExpandedState = {};
        initialGroups.forEach((group) => {
          initialExpandedState[group.name] = true;
        });
        setExpandedGroups(initialExpandedState);
      } catch (err) {
        console.error("Erro ao carregar detalhes:", err);
        setError("Erro ao carregar detalhes da inspeção");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInspectionDetails();
  }, [id]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // Converter grupos e características para o formato de estados
      const states = {};
      groups.forEach((group) => {
        states[group.name] = {};
        group.characteristics.forEach((char) => {
          if (char.state || char.description) {
            states[group.name][char.name] = {
              state: char.state,
              description: char.description,
            };
          }
        });
      });

      await updateDoc(doc(db, "inspections", id), {
        states: states,
        status: "completed",
        completedAt: new Date(),
      });

      navigate("/app/manage-inspection");
    } catch (err) {
      console.error("Erro ao salvar estados:", err);
      setError("Erro ao salvar alterações");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStateChange = (groupName, characteristicName, newState) => {
    setGroups((prev) =>
      prev.map((group) =>
        group.name === groupName
          ? {
              ...group,
              characteristics: group.characteristics.map((char) =>
                char.name === characteristicName
                  ? { ...char, state: newState }
                  : char
              ),
            }
          : group
      )
    );
  };

  const handleDescriptionChange = (
    groupName,
    characteristicName,
    newDescription
  ) => {
    setGroups((prev) =>
      prev.map((group) =>
        group.name === groupName
          ? {
              ...group,
              characteristics: group.characteristics.map((char) =>
                char.name === characteristicName
                  ? { ...char, description: newDescription }
                  : char
              ),
            }
          : group
      )
    );
  };

  const toggleGroup = (groupName) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  const states = ["Bom", "Reparar", "Substituir", "N/D"];

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all hover:scale-105 flex items-center justify-center"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <h2 className="text-2xl text-center text-white font-semibold mb-6">
        Detalhes da Inspeção
      </h2>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-red-500">{error}</p>
        </div>
      )}

      <div className="space-y-4 mb-32">
        <div className="p-4 bg-gray-800 rounded-lg space-y-3">
          <div className="flex items-center">
            <User className="w-5 h-5 text-gray-400 mr-2" />
            <span className="text-white">{client?.name}</span>
          </div>
          <div className="flex items-center">
            <Package className="w-5 h-5 text-gray-400 mr-2" />
            <span className="text-white">{equipment?.type}</span>
          </div>
          <div className="flex items-center">
            <CheckSquare className="w-5 h-5 text-gray-400 mr-2" />
            <span className="text-white">{checklistType?.type}</span>
          </div>
        </div>

        {groups.length > 0 ? (
          <div className="space-y-4">
            {groups.map((group, groupIndex) => (
              <div
                key={groupIndex}
                className="bg-gray-800 rounded-lg overflow-hidden"
              >
                <div
                  onClick={() => toggleGroup(group.name)}
                  className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-700"
                >
                  <h3 className="text-lg text-white font-medium">
                    {group.name}
                  </h3>
                  {expandedGroups[group.name] ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                {expandedGroups[group.name] && (
                  <div className="p-4 space-y-4 border-t border-gray-700">
                    {group.characteristics.map((char, charIndex) => (
                      <div key={charIndex} className="space-y-3">
                        <h4 className="text-white">{char.name}</h4>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {states.map((state) => (
                            <button
                              key={state}
                              onClick={() =>
                                handleStateChange(group.name, char.name, state)
                              }
                              className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                                char.state === state
                                  ? "bg-blue-600 text-white"
                                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                              }`}
                            >
                              {state}
                            </button>
                          ))}
                        </div>

                        <textarea
                          value={char.description}
                          onChange={(e) =>
                            handleDescriptionChange(
                              group.name,
                              char.name,
                              e.target.value
                            )
                          }
                          placeholder="Adicionar descrição..."
                          className="w-full p-3 bg-gray-700 text-white rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows="2"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-800 rounded-lg">
            <p className="text-gray-400">
              Nenhum grupo selecionado nesta inspeção.
            </p>
          </div>
        )}
      </div>

      <div className="fixed bottom-4 left-0 right-0 px-4 flex justify-center items-center md:left-64">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="h-16 px-6 bg-green-600 text-white font-medium flex items-center justify-center rounded-full shadow-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Salvar Inspeção
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default InspectionDetail;
