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
} from "lucide-react";

const AddInspection = () => {
  const navigate = useNavigate();

  // Estados para os dados selecionados
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedCharacteristics, setSelectedCharacteristics] = useState([]);

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

        const clientsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setClients(clientsData);
      } catch (err) {
        console.error("Erro ao carregar clientes:", err);
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

        const equipmentsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setEquipments(equipmentsData);
      } catch (err) {
        console.error("Erro ao carregar equipamentos:", err);
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
      try {
        setIsLoading(true);
        const typesRef = collection(db, "checklist_machines");
        const q = query(typesRef, orderBy("type"));
        const querySnapshot = await getDocs(q);

        const typesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setTypes(typesData);
      } catch (err) {
        console.error("Erro ao carregar tipos:", err);
        setError("Erro ao carregar tipos de checklist");
      } finally {
        setIsLoading(false);
      }
    };

    if (currentStep === 3) {
      fetchTypes();
    }
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep === 1 && !selectedClient) {
      setError("Selecione um cliente para continuar");
      return;
    }
    if (currentStep === 2 && !selectedEquipment) {
      setError("Selecione um equipamento para continuar");
      return;
    }
    if (currentStep === 3 && !selectedType) {
      setError("Selecione um tipo para continuar");
      return;
    }
    if (currentStep === 4 && selectedCharacteristics.length === 0) {
      setError("Selecione pelo menos uma característica");
      return;
    }

    setError(null);
    setCurrentStep((prev) => prev + 1);
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
      } else {
        await setDoc(counterRef, { count: 1 });
        return 1;
      }
    } catch (error) {
      console.error("Erro ao gerar ID:", error);
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
        characteristics: selectedCharacteristics,
        status: "pending",
        createdAt: new Date(),
      });

      navigate("/app/manage-inspection");
    } catch (err) {
      console.error("Erro ao criar inspeção:", err);
      setError("Erro ao criar inspeção. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCharacteristicToggle = (characteristic) => {
    setSelectedCharacteristics((prev) => {
      if (prev.includes(characteristic)) {
        return prev.filter((c) => c !== characteristic);
      } else {
        return [...prev, characteristic];
      }
    });
  };

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderStep = () => {
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
            <div
              className="space-y-2 max-h-96 overflow-y-auto 
              scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-gray-700 
              hover:scrollbar-thumb-blue-700 scrollbar-thumb-rounded-full scrollbar-track-rounded-full"
            >
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
              <p className="text-white font-medium">{selectedClient.name}</p>
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
                    <span className="text-white block">{equipment.type}</span>
                    <span className="text-sm text-gray-400">
                      {equipment.brand} {equipment.model}
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
              <p className="text-white font-medium">{selectedEquipment.type}</p>
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
                    <span className="text-white block">{type.type}</span>
                    <span className="text-sm text-gray-400">
                      {type.characteristics?.length || 0} característica(s)
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
            <div className="p-4 bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-400">Tipo selecionado:</p>
              <p className="text-white font-medium">{selectedType.type}</p>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {selectedType.characteristics.map((characteristic, index) => (
                <div
                  key={index}
                  onClick={() => handleCharacteristicToggle(characteristic)}
                  className={`p-4 rounded-lg cursor-pointer flex items-center ${
                    selectedCharacteristics.includes(characteristic)
                      ? "bg-blue-600"
                      : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCharacteristics.includes(characteristic)}
                    onChange={() => {}}
                    className="mr-3"
                  />
                  <span className="text-white">{characteristic}</span>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

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
                    ? "bg-blue-500"
                    : step < currentStep
                    ? "bg-blue-500"
                    : "bg-gray-600"
                }`}
              />
            ))}
          </div>
          <span className="text-gray-400">
            {currentStep === 1 && "Selecione o cliente"}
            {currentStep === 2 && "Selecione o equipamento"}
            {currentStep === 3 && "Selecione o tipo"}
            {currentStep === 4 && "Selecione as características"}
          </span>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        {isLoading ? (
          <div className="relative h-1 bg-gray-700 overflow-hidden">
            <div className="absolute top-0 h-1 bg-blue-600 w-1/3 animate-[progressBar_1s_ease-in-out_infinite]"></div>
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
