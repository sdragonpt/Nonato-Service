import React, { useState, useEffect } from "react";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  increment,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase.jsx";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Save,
  AlertCircle,
  User,
  Package,
  CheckSquare,
  Search,
  Plus,
  ListChecks,
} from "lucide-react";

const AddInspection = () => {
  const navigate = useNavigate();

  // Estados para os dados selecionados
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedGroups, setSelectedGroups] = useState([]);

  // Estados para as listas de dados
  const [clients, setClients] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [types, setTypes] = useState([]);

  // Estados de UI
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch inicial de clientes
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setIsLoading(true);
        const clientsRef = collection(db, "clientes");
        const q = query(clientsRef, orderBy("name"));
        const querySnapshot = await getDocs(q);
        setClients(
          querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
      } catch (err) {
        setError("Erro ao carregar clientes");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, []);

  // Fetch de equipamentos quando um cliente é selecionado
  useEffect(() => {
    const fetchEquipments = async () => {
      if (!selectedClient) return;
      try {
        setIsLoading(true);
        const equipmentsRef = collection(db, "equipamentos");
        const q = query(
          equipmentsRef,
          where("clientId", "==", selectedClient.id)
        );
        const querySnapshot = await getDocs(q);
        setEquipments(
          querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
      } catch (err) {
        setError("Erro ao carregar equipamentos");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEquipments();
  }, [selectedClient]);

  // Fetch de tipos de checklist
  useEffect(() => {
    const fetchTypes = async () => {
      if (currentStep !== 3) return;
      try {
        setIsLoading(true);
        const typesRef = collection(db, "checklist_machines");
        const q = query(typesRef, orderBy("type"));
        const querySnapshot = await getDocs(q);
        setTypes(
          querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
      } catch (err) {
        setError("Erro ao carregar tipos de checklist");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTypes();
  }, [currentStep]);

  const handleNext = async () => {
    const validationMap = {
      1: {
        condition: !selectedClient,
        message: "Selecione um cliente para continuar",
      },
      2: {
        condition: !selectedEquipment,
        message: "Selecione um equipamento para continuar",
      },
      3: {
        condition: !selectedType,
        message: "Selecione um tipo de checklist para continuar",
      },
      4: {
        condition: selectedGroups.length === 0,
        message: "Selecione pelo menos um grupo",
      },
    };

    const currentValidation = validationMap[currentStep];
    if (currentValidation?.condition) {
      setError(currentValidation.message);
      return;
    }

    setError(null);
    setIsLoading(true);

    if (currentStep === 1) {
      try {
        const equipmentsRef = collection(db, "equipamentos");
        const q = query(
          equipmentsRef,
          where("clientId", "==", selectedClient.id)
        );
        const querySnapshot = await getDocs(q);
        const equipmentsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEquipments(equipmentsData);
        setCurrentStep((prev) => prev + 1);
      } catch (err) {
        setError("Erro ao carregar equipamentos");
      } finally {
        setIsLoading(false);
      }
    } else {
      setCurrentStep((prev) => prev + 1);
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => prev - 1);
  };

  const getNextInspectionId = async () => {
    try {
      const counterRef = doc(db, "counters", "inspectionsCounter");
      const counterSnapshot = await getDoc(counterRef);

      if (counterSnapshot.exists()) {
        const currentCounter = counterSnapshot.data().count;
        await setDoc(counterRef, { count: increment(1) }, { merge: true });
        return currentCounter + 1;
      }

      await setDoc(counterRef, { count: 1 });
      return 1;
    } catch (error) {
      throw new Error("Falha ao gerar ID da inspeção");
    }
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const newInspectionId = await getNextInspectionId();

      await setDoc(doc(db, "inspections", newInspectionId.toString()), {
        clientId: selectedClient.id,
        equipmentId: selectedEquipment.id,
        checklistTypeId: selectedType.id,
        selectedGroups,
        status: "pending",
        createdAt: new Date(),
      });

      navigate("/app/manage-inspection");
    } catch (err) {
      setError("Erro ao criar inspeção. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGroupToggle = (group) => {
    setSelectedGroups((prev) => {
      const existingGroup = prev.find((g) => g.name === group.name);
      if (existingGroup) {
        return prev.filter((g) => g.name !== group.name);
      }
      return [...prev, { ...group, selectedCharacteristics: [] }];
    });
  };

  const handleCharacteristicToggle = (groupName, characteristic) => {
    setSelectedGroups((prev) => {
      return prev.map((group) => {
        if (group.name === groupName) {
          const characteristics = group.selectedCharacteristics || [];
          return {
            ...group,
            selectedCharacteristics: characteristics.includes(characteristic)
              ? characteristics.filter((c) => c !== characteristic)
              : [...characteristics, characteristic],
          };
        }
        return group;
      });
    });
  };

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderStep = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      );
    }

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 pl-10 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className={`p-4 rounded-lg cursor-pointer flex items-center ${
                    selectedClient?.id === client.id
                      ? "bg-blue-600"
                      : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  <User className="w-5 h-5 mr-3 text-gray-400" />
                  <span className="text-white">{client.name}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-400">Cliente selecionado:</p>
              <p className="text-white font-medium">
                {selectedClient?.name || ""}
              </p>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {equipments.map((equipment) => (
                <div
                  key={equipment.id}
                  onClick={() => setSelectedEquipment(equipment)}
                  className={`p-4 rounded-lg cursor-pointer flex items-center ${
                    selectedEquipment?.id === equipment.id
                      ? "bg-blue-600"
                      : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  <Package className="w-5 h-5 mr-3 text-gray-400" />
                  <div>
                    <span className="text-white block">
                      {equipment.type || ""}
                    </span>
                    <span className="text-sm text-gray-400">
                      {equipment.brand || ""} {equipment.model || ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-400">Equipamento selecionado:</p>
              <p className="text-white font-medium">
                {selectedEquipment?.type || ""}
              </p>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {types.map((type) => (
                <div
                  key={type.id}
                  onClick={() => setSelectedType(type)}
                  className={`p-4 rounded-lg cursor-pointer flex items-center ${
                    selectedType?.id === type.id
                      ? "bg-blue-600"
                      : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  <CheckSquare className="w-5 h-5 mr-3 text-gray-400" />
                  <div>
                    <span className="text-white block">{type.type || ""}</span>
                    <span className="text-sm text-gray-400">
                      {type.groups?.length || 0} grupo(s)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-gray-800 rounded-lg space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-400">Checklist selecionado</p>
                  <h3 className="text-lg text-white font-medium">
                    {selectedType?.type || ""}
                  </h3>
                </div>
                <div className="bg-blue-500/10 px-3 py-1 rounded-full">
                  <span className="text-blue-400 text-sm">
                    {selectedGroups.length} grupo(s) selecionado(s)
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-400">
                Selecione os grupos e características que deseja incluir nesta
                inspeção
              </p>
            </div>

            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
              {selectedType?.groups?.map((group, index) => {
                const selectedGroup = selectedGroups.find(
                  (g) => g.name === group.name
                );
                return (
                  <div
                    key={index}
                    className={`bg-gray-800 rounded-lg overflow-hidden transition-all duration-200 ${
                      selectedGroup
                        ? "border border-blue-500/50"
                        : "hover:bg-gray-700"
                    }`}
                  >
                    <div
                      onClick={() => handleGroupToggle(group)}
                      className="p-4 cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`p-2 rounded-lg ${
                              selectedGroup ? "bg-blue-500/10" : "bg-gray-700"
                            }`}
                          >
                            <ListChecks
                              className={`w-5 h-5 ${
                                selectedGroup
                                  ? "text-blue-400"
                                  : "text-gray-400"
                              }`}
                            />
                          </div>
                          <div>
                            <h4 className="text-white font-medium">
                              {group.name}
                            </h4>
                            <p className="text-sm text-gray-400">
                              {selectedGroup
                                ? `${
                                    selectedGroup.selectedCharacteristics
                                      ?.length || 0
                                  } de ${
                                    group.characteristics?.length || 0
                                  } característica(s)`
                                : `${
                                    group.characteristics?.length || 0
                                  } característica(s)`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 cursor-pointer ${
                              selectedGroup
                                ? "bg-blue-500 border-blue-500"
                                : "border-gray-500 hover:border-gray-400"
                            }`}
                          >
                            {selectedGroup && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {selectedGroup && (
                      <div className="px-4 pb-4">
                        <div className="pl-11">
                          <div className="border-l-2 border-blue-500/20 pl-4 space-y-2">
                            {group.characteristics?.map((char, charIndex) => {
                              const isCharSelected =
                                selectedGroup.selectedCharacteristics?.includes(
                                  char
                                );
                              return (
                                <div
                                  key={charIndex}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCharacteristicToggle(
                                      group.name,
                                      char
                                    );
                                  }}
                                  className={`text-sm text-gray-300 py-2 px-3 bg-gray-700/50 rounded-lg flex items-center justify-between cursor-pointer ${
                                    isCharSelected ? "bg-blue-500/10" : ""
                                  }`}
                                >
                                  <span>{char}</span>
                                  <div
                                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                                      isCharSelected
                                        ? "bg-blue-500 border-blue-500"
                                        : "border-gray-400"
                                    }`}
                                  >
                                    {isCharSelected && (
                                      <svg
                                        className="w-3 h-3 text-white"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={3}
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {(!selectedType?.groups || selectedType.groups.length === 0) && (
              <div className="text-center py-8 bg-gray-800 rounded-lg">
                <ListChecks className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">
                  Este checklist não possui grupos definidos
                </p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all hover:scale-105 flex items-center justify-center"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <h2 className="text-2xl text-center text-white font-semibold mb-6">
        Nova Inspeção
      </h2>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-red-500">{error}</p>
        </div>
      )}

      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`w-3 h-3 rounded-full ${
                  step === currentStep
                    ? "bg-green-500"
                    : step < currentStep
                    ? "bg-green-600"
                    : "bg-gray-600"
                }`}
              />
            ))}
          </div>
          <span className="text-gray-400">
            {currentStep === 1 && "Selecione o cliente"}
            {currentStep === 2 && "Selecione o equipamento"}
            {currentStep === 3 && "Selecione o checklist"}
            {currentStep === 4 && "Selecione os grupos"}
          </span>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        ) : (
          renderStep()
        )}
      </div>

      <div className="flex justify-between">
        {currentStep > 1 && (
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar
          </button>
        )}

        {currentStep < 4 ? (
          <button
            onClick={handleNext}
            className="ml-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            Próximo
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="ml-auto px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Finalizar
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default AddInspection;
