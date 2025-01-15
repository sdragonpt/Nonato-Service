import React, { useState } from "react";
import { Plus, Trash2, Euro, FileText } from "lucide-react";

const ServiceInput = ({
  onAddService,
  services,
  selectedServiceId,
  setSelectedServiceId,
}) => {
  const [inputMode, setInputMode] = useState("single");
  const [serviceValue, setServiceValue] = useState("");
  const [serviceQuantity, setServiceQuantity] = useState("");
  const [multipleEntries, setMultipleEntries] = useState([
    { value: "", quantity: 1 },
  ]);

  // Resetar os campos
  const resetFields = () => {
    setServiceValue("");
    setServiceQuantity("");
    setMultipleEntries([{ value: "", quantity: 1 }]);
  };

  // Adicionar nova entrada para valores múltiplos
  const addEntry = () => {
    setMultipleEntries([...multipleEntries, { value: "", quantity: 1 }]);
  };

  // Remover uma entrada
  const removeEntry = (index) => {
    const newEntries = multipleEntries.filter((_, i) => i !== index);
    setMultipleEntries(newEntries);
  };

  // Atualizar valor de uma entrada específica
  const updateEntryValue = (index, value) => {
    const newEntries = [...multipleEntries];
    newEntries[index].value = value;
    setMultipleEntries(newEntries);
  };

  // Atualizar quantidade de uma entrada específica
  const updateEntryQuantity = (index, quantity) => {
    const newEntries = [...multipleEntries];
    newEntries[index].quantity = quantity;
    setMultipleEntries(newEntries);
  };

  // Calcular total para entradas múltiplas
  const calculateMultipleTotal = () => {
    return multipleEntries.reduce((total, entry) => {
      const value = parseFloat(entry.value) || 0;
      const quantity = parseFloat(entry.quantity) || 0;
      return total + value * quantity;
    }, 0);
  };

  // Lidar com a adição do serviço
  const handleAddService = () => {
    if (!selectedServiceId) return;

    const selectedService = services.find((s) => s.id === selectedServiceId);
    if (!selectedService) return;

    if (inputMode === "single") {
      // Modo único - lógica existente
      const quantity = parseFloat(serviceQuantity) || 0;
      const value = parseFloat(serviceValue) || 0;

      onAddService({
        id: selectedService.id,
        name: selectedService.name,
        type: selectedService.type,
        value: value,
        quantity: quantity,
        total: value * quantity,
      });
    } else {
      // Modo múltiplo - soma todos os valores
      const total = calculateMultipleTotal();

      onAddService({
        id: selectedService.id,
        name: selectedService.name,
        type: selectedService.type,
        value: total,
        quantity: 1, // Quantidade sempre será 1 no modo múltiplo
        total: total,
      });
    }

    // Resetar campos após adicionar
    resetFields();
  };

  return (
    <div className="space-y-4">
      {/* Seleção do Serviço */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">
          Serviço
        </label>
        <select
          value={selectedServiceId}
          onChange={(e) => setSelectedServiceId(e.target.value)}
          className="w-full p-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Selecione um serviço...</option>
          {services
            .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
            .map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
        </select>
      </div>

      {/* Seleção do Modo */}
      {selectedServiceId && (
        <div className="flex gap-4">
          <button
            onClick={() => setInputMode("single")}
            className={`flex-1 p-2 rounded-lg ${
              inputMode === "single"
                ? "bg-[#117d49] text-white"
                : "bg-gray-700 text-gray-300"
            }`}
          >
            Valor Único
          </button>
          <button
            onClick={() => setInputMode("multiple")}
            className={`flex-1 p-2 rounded-lg ${
              inputMode === "multiple"
                ? "bg-[#117d49] text-white"
                : "bg-gray-700 text-gray-300"
            }`}
          >
            Valores Múltiplos
          </button>
        </div>
      )}

      {/* Campos de Entrada baseados no modo */}
      {selectedServiceId && inputMode === "single" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Valor Unitário
            </label>
            <div className="relative">
              <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                value={serviceValue}
                onChange={(e) => setServiceValue(e.target.value)}
                className="w-full p-2 pl-10 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Quantidade
            </label>
            <input
              type="number"
              value={serviceQuantity}
              onChange={(e) => setServiceQuantity(e.target.value)}
              className="w-full p-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="0"
              step="1"
              min="0"
            />
          </div>
        </div>
      )}

      {selectedServiceId && inputMode === "multiple" && (
        <div className="space-y-4">
          {multipleEntries.map((entry, index) => (
            <div key={index} className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Valor {index + 1}
                </label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    value={entry.value}
                    onChange={(e) => updateEntryValue(index, e.target.value)}
                    className="w-full p-2 pl-10 bg-gray-700 text-white rounded-lg border border-gray-600"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Quantidade
                </label>
                <input
                  type="number"
                  value={entry.quantity}
                  onChange={(e) => updateEntryQuantity(index, e.target.value)}
                  className="w-full p-2 bg-gray-700 text-white rounded-lg border border-gray-600"
                  placeholder="1"
                  step="1"
                  min="1"
                />
              </div>
              <button
                onClick={() => removeEntry(index)}
                className="p-2 text-red-400 hover:text-red-300"
                disabled={multipleEntries.length === 1}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}

          <button
            onClick={addEntry}
            className="w-full p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Adicionar Valor
          </button>

          {multipleEntries.length > 0 && (
            <div className="p-4 bg-gray-700 rounded-lg">
              <p className="text-gray-400">
                Total:{" "}
                <span className="text-white font-medium">
                  {calculateMultipleTotal().toFixed(2)}€
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Botão de Adicionar */}
      <button
        onClick={handleAddService}
        disabled={
          !selectedServiceId ||
          (inputMode === "single" &&
            (serviceValue === "" || serviceQuantity === "")) ||
          (inputMode === "multiple" &&
            multipleEntries.some((entry) => entry.value === ""))
        }
        className="w-full p-2 bg-[#117d49] text-white rounded-lg hover:bg-[#0d6238] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        <Plus className="w-5 h-5 mr-2" />
        Adicionar Serviço
      </button>
    </div>
  );
};

export default ServiceInput;
