import { useState, useEffect } from "react";
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
import { db } from "../../../firebase.jsx";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Save,
  AlertTriangle,
  User,
  Package,
  CheckSquare,
  Search,
  ListChecks,
  ClipboardCheck,
  GraduationCap,
  Wrench,
  PackageCheck,
  Code,
  Settings,
} from "lucide-react";

// UI Components
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";

const AddInspection = () => {
  const navigate = useNavigate();
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedInspectionType, setSelectedInspectionType] = useState(null);
  const [selectedGroups, setSelectedGroups] = useState([]);

  const [clients, setClients] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [types, setTypes] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);

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

  const handleNext = () => {
    let validationError = null;

    switch (currentStep) {
      case 1:
        if (!selectedClient)
          validationError = "Selecione um cliente para continuar";
        break;
      case 2:
        if (!selectedEquipment)
          validationError = "Selecione um equipamento para continuar";
        break;
      case 3:
        if (!selectedCategory)
          validationError = "Selecione uma categoria para continuar";
        break;
      case 4:
        if (!selectedType)
          validationError = "Selecione um checklist para continuar";
        break;
      case 5:
        if (!selectedInspectionType)
          validationError = "Selecione um tipo de inspeção para continuar";
        break;
    }

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError(null);
    if (currentStep === 3) {
      setSelectedCategory(null);
      setSelectedType(null);
    }
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
    if (selectedGroups.length === 0) {
      setError("Selecione pelo menos um grupo para continuar");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const newInspectionId = await getNextInspectionId();

      await setDoc(doc(db, "inspections", newInspectionId.toString()), {
        clientId: selectedClient.id,
        equipmentId: selectedEquipment.id,
        checklistTypeId: selectedType.id,
        type: selectedInspectionType,
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" />
              <Input
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className={`p-4 rounded-lg cursor-pointer flex items-center ${
                    selectedClient?.id === client.id
                      ? "bg-green-600"
                      : "bg-zinc-800 hover:bg-zinc-700"
                  }`}
                >
                  <User className="w-5 h-5 mr-3 text-zinc-400" />
                  <span className="text-white">{client.name}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-zinc-800 rounded-lg">
              <p className="text-sm text-zinc-400">Cliente selecionado:</p>
              <p className="text-white font-medium">{selectedClient?.name}</p>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {equipments.map((equipment) => (
                <div
                  key={equipment.id}
                  onClick={() => setSelectedEquipment(equipment)}
                  className={`p-4 rounded-lg cursor-pointer flex items-center ${
                    selectedEquipment?.id === equipment.id
                      ? "bg-green-600"
                      : "bg-zinc-800 hover:bg-zinc-700"
                  }`}
                >
                  <Package className="w-5 h-5 mr-3 text-zinc-400" />
                  <div>
                    <span className="text-white block">{equipment.type}</span>
                    <span className="text-sm text-zinc-400">
                      {equipment.brand} {equipment.model}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 3: // Seleção de Categoria
        return (
          <div className="space-y-4">
            <div className="p-4 bg-zinc-800 rounded-lg">
              <p className="text-sm text-zinc-400">Equipamento selecionado:</p>
              <p className="text-white font-medium">
                {selectedEquipment?.type}
              </p>
            </div>

            <div className="space-y-4">
              <div
                onClick={() => setSelectedCategory("maintenance")}
                className={`p-6 rounded-lg cursor-pointer ${
                  selectedCategory === "maintenance"
                    ? "bg-green-600"
                    : "bg-zinc-800 hover:bg-zinc-700"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">
                      Checklist de Manutenção
                    </h3>
                    <p className="text-sm text-zinc-400">
                      Para acompanhamento e registro de manutenções
                    </p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setSelectedCategory("operational_training")}
                className={`p-6 rounded-lg cursor-pointer ${
                  selectedCategory === "operational_training"
                    ? "bg-green-600"
                    : "bg-zinc-800 hover:bg-zinc-700"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-purple-600 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">
                      Checklist de Treinamento Operacional
                    </h3>
                    <p className="text-sm text-zinc-400">
                      Para acompanhamento do treinamento operacional dos
                      equipamentos
                    </p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setSelectedCategory("receiving")}
                className={`p-6 rounded-lg cursor-pointer ${
                  selectedCategory === "receiving"
                    ? "bg-green-600"
                    : "bg-zinc-800 hover:bg-zinc-700"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center">
                    <PackageCheck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">
                      Checklist de Recebimento
                    </h3>
                    <p className="text-sm text-zinc-400">
                      Para verificação inicial de equipamentos
                    </p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setSelectedCategory("programming")}
                className={`p-6 rounded-lg cursor-pointer ${
                  selectedCategory === "programming"
                    ? "bg-green-600"
                    : "bg-zinc-800 hover:bg-zinc-700"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-yellow-600 flex items-center justify-center">
                    <Code className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">
                      Checklist de Programação
                    </h3>
                    <p className="text-sm text-zinc-400">
                      Para verificação e configuração da programação dos
                      equipamentos
                    </p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setSelectedCategory("installation")}
                className={`p-6 rounded-lg cursor-pointer ${
                  selectedCategory === "installation"
                    ? "bg-green-600"
                    : "bg-zinc-800 hover:bg-zinc-700"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-orange-600 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">
                      Checklist de Instalação
                    </h3>
                    <p className="text-sm text-zinc-400">
                      Para acompanhamento do processo de instalação dos
                      equipamentos
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 4: // Seleção do Checklist
        return (
          <div className="space-y-4">
            <div className="p-4 bg-zinc-800 rounded-lg">
              <p className="text-sm text-zinc-400">Categoria selecionada:</p>
              <p className="text-white font-medium">
                {selectedCategory === "maintenance" &&
                  "Checklist de Manutenção"}
                {selectedCategory === "operational_training" &&
                  "Checklist de Treinamento Operacional"}
                {selectedCategory === "receiving" && "Checklist de Recebimento"}
                {selectedCategory === "programming" &&
                  "Checklist de Programação"}
                {selectedCategory === "installation" &&
                  "Checklist de Instalação"}
              </p>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {types
                .filter((type) => type.category === selectedCategory)
                .map((type) => (
                  <div
                    key={type.id}
                    onClick={() => setSelectedType(type)}
                    className={`p-4 rounded-lg cursor-pointer flex items-center ${
                      selectedType?.id === type.id
                        ? "bg-green-600"
                        : "bg-zinc-800 hover:bg-zinc-700"
                    }`}
                  >
                    <CheckSquare className="w-5 h-5 mr-3 text-zinc-400" />
                    <div>
                      <span className="text-white block">
                        {type.type || ""}
                      </span>
                      <span className="text-sm text-zinc-400">
                        {type.groups?.length || 0} grupo(s)
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-zinc-800 rounded-lg">
              <p className="text-sm text-zinc-400">Checklist selecionado:</p>
              <p className="text-white font-medium">{selectedType?.type}</p>
            </div>
            <div className="space-y-4">
              <div
                onClick={() => setSelectedInspectionType("inspection")}
                className={`p-6 rounded-lg cursor-pointer ${
                  selectedInspectionType === "inspection"
                    ? "bg-green-600"
                    : "bg-zinc-800 hover:bg-zinc-700"
                }`}
              >
                <div className="flex items-center gap-4">
                  <ClipboardCheck className="w-8 h-8 text-zinc-400" />
                  <div>
                    <h3 className="text-lg font-medium text-white">Inspeção</h3>
                    <p className="text-sm text-zinc-400">
                      Realizar uma inspeção técnica do equipamento
                    </p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setSelectedInspectionType("training")}
                className={`p-6 rounded-lg cursor-pointer ${
                  selectedInspectionType === "training"
                    ? "bg-green-600"
                    : "bg-zinc-800 hover:bg-zinc-700"
                }`}
              >
                <div className="flex items-center gap-4">
                  <GraduationCap className="w-8 h-8 text-zinc-400" />
                  <div>
                    <h3 className="text-lg font-medium text-white">
                      Treinamento
                    </h3>
                    <p className="text-sm text-zinc-400">
                      Realizar um treinamento sobre o equipamento
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-zinc-800 rounded-lg space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Checklist selecionado</p>
                  <h3 className="text-lg text-white font-medium">
                    {selectedType?.type}
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    Tipo:{" "}
                    {selectedInspectionType === "inspection"
                      ? "Inspeção"
                      : "Treinamento"}
                  </p>
                </div>
                <div className="bg-green-500/10 px-3 py-1 rounded-full">
                  <span className="text-green-400 text-sm">
                    {selectedGroups.length} grupo(s) selecionado(s)
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
              {selectedType?.groups?.map((group, index) => {
                const selectedGroup = selectedGroups.find(
                  (g) => g.name === group.name
                );
                return (
                  <div
                    key={index}
                    className={`bg-zinc-800 rounded-lg overflow-hidden transition-all duration-200 ${
                      selectedGroup
                        ? "border border-green-500/50"
                        : "hover:bg-zinc-700"
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
                              selectedGroup ? "bg-green-500/10" : "bg-zinc-700"
                            }`}
                          >
                            <ListChecks
                              className={`w-5 h-5 ${
                                selectedGroup
                                  ? "text-green-400"
                                  : "text-zinc-400"
                              }`}
                            />
                          </div>
                          <div>
                            <h4 className="text-white font-medium">
                              {group.name}
                            </h4>
                            <p className="text-sm text-zinc-400">
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
                                ? "bg-green-500 border-green-500"
                                : "border-zinc-500 hover:border-zinc-400"
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
                          <div className="border-l-2 border-green-500/20 pl-4 space-y-2">
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
                                  className={`text-sm text-zinc-300 py-2 px-3 bg-zinc-900/50 rounded-lg flex items-center justify-between cursor-pointer ${
                                    isCharSelected ? "bg-green-500/10" : ""
                                  }`}
                                >
                                  <span>{char}</span>
                                  <div
                                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                                      isCharSelected
                                        ? "bg-green-500 border-green-500"
                                        : "border-zinc-400"
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

              {(!selectedType?.groups || selectedType.groups.length === 0) && (
                <div className="text-center py-8 bg-zinc-800 rounded-lg">
                  <ListChecks className="w-12 h-12 text-zinc-500 mx-auto mb-3" />
                  <p className="text-zinc-400">
                    Este checklist não possui grupos definidos
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Nova Inspeção</h1>
          <p className="text-sm text-zinc-400">
            Adicione uma nova inspeção ao sistema
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-10 w-10 rounded-full border-zinc-700 text-white hover:bg-green-700 bg-green-600"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      {/* Progress Steps */}
      <div className="bg-zinc-800 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            {[1, 2, 3, 4, 5, 6].map((step) => (
              <div
                key={step}
                className={`w-3 h-3 rounded-full ${
                  step === currentStep
                    ? "bg-green-500"
                    : step < currentStep
                    ? "bg-green-600"
                    : "bg-zinc-600"
                }`}
              />
            ))}
          </div>
          <span className="text-zinc-400">
            {currentStep === 1 && "Selecione o cliente"}
            {currentStep === 2 && "Selecione o equipamento"}
            {currentStep === 3 && "Selecione a categoria"}
            {currentStep === 4 && "Selecione o checklist"}
            {currentStep === 5 && "Selecione o tipo"}
            {currentStep === 6 && "Selecione os grupos"}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="p-6">{renderStep()}</CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        {currentStep > 1 && (
          <Button
            onClick={handleBack}
            className="bg-zinc-700 hover:bg-zinc-600"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        )}

        {currentStep < 6 ? (
          <Button
            onClick={handleNext}
            className="ml-auto bg-green-600 hover:bg-green-700"
          >
            Próximo
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="ml-auto bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Atualizar Inspeção
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default AddInspection;
