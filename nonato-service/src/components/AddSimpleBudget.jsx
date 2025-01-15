import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, User, Loader2, Plus, Trash2 } from "lucide-react";
import {
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../firebase.jsx";
import generateSimpleBudgetPDF from "./generateSimpleBudgetPDF.jsx";
import ServiceInput from "./ServiceInput"; // Novo import

const AddSimpleBudget = () => {
  const navigate = useNavigate();
  const [isExpense, setIsExpense] = useState(false);
  const [clientData, setClientData] = useState({
    name: "",
    phone: "",
    address: "",
  });
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);

  // Fetch available services
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setIsLoading(true);
        const servicesRef = collection(db, "servicos");
        const querySnapshot = await getDocs(servicesRef);
        const servicesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setServices(servicesData);
      } catch (err) {
        setError("Erro ao carregar serviços");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchServices();
  }, []);

  const handleClientDataChange = (e) => {
    const { name, value } = e.target;
    setClientData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddService = (serviceData) => {
    if (!serviceData) return;

    // Adiciona o serviço com os dados recebidos do ServiceInput
    setSelectedServices((prev) => [...prev, serviceData]);

    // Reset do serviço selecionado
    setSelectedServiceId("");
  };

  const handleRemoveService = (serviceId) => {
    setSelectedServices((prev) => prev.filter((s) => s.id !== serviceId));
  };

  const generateBudget = async () => {
    try {
      setIsGeneratingPDF(true);

      if (!clientData.name || !clientData.phone || !clientData.address) {
        setError("Por favor, preencha todos os dados do cliente.");
        return;
      }

      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = String(now.getFullYear()).slice(-2);

      const budgetsRef = collection(db, "orcamentos");
      const q = query(
        budgetsRef,
        orderBy("sequentialNumber", "desc"),
        limit(1)
      );
      const querySnapshot = await getDocs(q);

      let nextNumber = 1326;
      if (!querySnapshot.empty) {
        const lastBudget = querySnapshot.docs[0].data();
        nextNumber = (lastBudget.sequentialNumber || 1325) + 1;
      }

      const budgetNumber = `${month}${year}-${String(nextNumber).padStart(
        4,
        "0"
      )}`;

      const budgetData = {
        type: "simple",
        budgetNumber,
        sequentialNumber: nextNumber,
        clientData,
        services: selectedServices,
        total: selectedServices.reduce((acc, curr) => acc + curr.total, 0),
        createdAt: new Date(),
        isExpense,
      };

      await addDoc(budgetsRef, budgetData);
      const pdfBlob = await generateSimpleBudgetPDF(budgetData);
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = `${isExpense ? "Despesa" : "Orçamento"}_${
        clientData.name
      }_${budgetNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(pdfUrl);

      navigate("/app/manage-budgets");
    } catch (error) {
      setError("Erro ao gerar orçamento. Por favor, tente novamente.");
      console.error("Erro ao gerar orçamento:", error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Adicionar este useEffect após os outros useEffects:
  useEffect(() => {
    const newTotal = selectedServices.reduce(
      (acc, curr) => acc + curr.total,
      0
    );
    setTotalAmount(newTotal);
  }, [selectedServices]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-semibold text-center text-white mb-6">
        Gerador de Orçamentos
      </h2>

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500 rounded-lg">
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {/* Toggle buttons */}
      <div className="flex justify-center mb-6">
        <div className="bg-gray-700 p-1 rounded-xl inline-flex relative shadow-lg">
          <div
            className={`absolute top-1 bottom-1 w-[120px] rounded-lg bg-[#117d49] transition-all duration-300 ease-in-out ${
              isExpense ? "translate-x-[120px]" : "translate-x-0"
            }`}
          />
          <button
            onClick={() => setIsExpense(false)}
            className={`relative w-[120px] py-2 rounded-lg font-medium transition-colors duration-300 ${
              !isExpense ? "text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Orçamento
          </button>
          <button
            onClick={() => setIsExpense(true)}
            className={`relative w-[120px] py-2 rounded-lg font-medium transition-colors duration-300 ${
              isExpense ? "text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Despesa
          </button>
        </div>
      </div>

      <div className="grid gap-6 mb-6">
        {/* Client Data Form */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg">
          <div className="p-6 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <User className="w-5 h-5 mr-2" />
              Dados do Cliente
            </h3>
          </div>
          <div className="p-6">
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  name="name"
                  value={clientData.name}
                  onChange={handleClientDataChange}
                  className="w-full p-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Nome do cliente"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Telemóvel
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={clientData.phone}
                  onChange={handleClientDataChange}
                  className="w-full p-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Número de telemóvel"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Endereço
                </label>
                <textarea
                  name="address"
                  value={clientData.address}
                  onChange={handleClientDataChange}
                  className="w-full p-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Endereço completo"
                  rows="3"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Add Service Form */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg">
          <div className="p-6 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Adicionar Serviço
            </h3>
          </div>
          <div className="p-6">
            <ServiceInput
              services={services}
              selectedServiceId={selectedServiceId}
              setSelectedServiceId={setSelectedServiceId}
              onAddService={handleAddService}
            />
          </div>
        </div>

        {/* Selected Services */}
        {selectedServices.length > 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">
                Serviços Selecionados
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {selectedServices.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                  >
                    <div>
                      <p className="text-white font-medium">{service.name}</p>
                      <p className="text-gray-400 text-sm">
                        {service.multipleEntries
                          ? // Se for múltiplos valores, mostra o total direto
                            `Total: ${service.total.toFixed(2)}€`
                          : // Se for valor único, mostra o cálculo
                            `${service.value.toFixed(2)}€ x ${
                              service.quantity
                            } = ${service.total.toFixed(2)}€`}
                      </p>
                      {/* Se tiver valores múltiplos, mostra o detalhe */}
                      {service.multipleEntries && (
                        <div className="mt-1 text-xs text-gray-400">
                          {service.multipleEntries.map((entry, idx) => (
                            <div key={idx}>
                              Valor {idx + 1}: {entry.value}€ x {entry.quantity}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveService(service.id)}
                      className="p-2 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                <div className="pt-4 border-t border-gray-700">
                  <p className="text-white text-right font-medium">
                    Total: {totalAmount.toFixed(2)}€
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Generate Button */}
      <div className="fixed bottom-4 left-0 right-0 flex justify-center items-center md:left-64">
        <button
          onClick={generateBudget}
          disabled={
            isGeneratingPDF ||
            !clientData.name ||
            !clientData.phone ||
            !clientData.address ||
            selectedServices.length === 0
          }
          className="h-16 px-6 bg-[#117d49] text-white font-medium flex items-center justify-center rounded-full shadow-lg hover:bg-[#0d6238] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGeneratingPDF ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <FileText className="w-5 h-5 mr-2" />
          )}
          {isGeneratingPDF ? "Gerando..." : "Gerar Orçamento"}
        </button>
      </div>
    </div>
  );
};

export default AddSimpleBudget;
