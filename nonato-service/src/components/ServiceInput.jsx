import React, { useState } from "react";
import { Plus, Trash2, Euro, Package, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

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

  // Reset fields
  const resetFields = () => {
    setServiceValue("");
    setServiceQuantity("");
    setMultipleEntries([{ value: "", quantity: 1 }]);
  };

  // Add new entry for multiple values
  const addEntry = () => {
    setMultipleEntries([...multipleEntries, { value: "", quantity: 1 }]);
  };

  // Remove an entry
  const removeEntry = (index) => {
    const newEntries = multipleEntries.filter((_, i) => i !== index);
    setMultipleEntries(newEntries);
  };

  // Update value of a specific entry
  const updateEntryValue = (index, value) => {
    const newEntries = [...multipleEntries];
    newEntries[index].value = value;
    setMultipleEntries(newEntries);
  };

  // Update quantity of a specific entry
  const updateEntryQuantity = (index, quantity) => {
    const newEntries = [...multipleEntries];
    newEntries[index].quantity = quantity;
    setMultipleEntries(newEntries);
  };

  // Calculate total for multiple entries
  const calculateMultipleTotal = () => {
    return multipleEntries.reduce((total, entry) => {
      const value = parseFloat(entry.value) || 0;
      const quantity = parseFloat(entry.quantity) || 0;
      return total + value * quantity;
    }, 0);
  };

  // Handle service addition
  const handleAddService = () => {
    if (!selectedServiceId) return;

    const selectedService = services.find((s) => s.id === selectedServiceId);
    if (!selectedService) return;

    const serviceData =
      inputMode === "single"
        ? {
            id: Date.now().toString(),
            name: selectedService.name,
            type: selectedService.type,
            value: parseFloat(serviceValue),
            quantity: parseFloat(serviceQuantity),
            total: parseFloat(serviceValue) * parseFloat(serviceQuantity),
          }
        : {
            id: Date.now().toString(),
            name: selectedService.name,
            type: selectedService.type,
            multipleEntries: multipleEntries.map((entry) => ({
              value: parseFloat(entry.value),
              quantity: parseFloat(entry.quantity),
            })),
            total: calculateMultipleTotal(),
          };

    onAddService(serviceData);
    resetFields();
    setSelectedServiceId("");
  };

  // Get unit label based on service type
  const getUnitLabel = (type) => {
    const types = {
      base: "un",
      un: "un",
      hour: "hora(s)",
      day: "dia(s)",
      km: "km",
      total: "Total", // Novo tipo para valores múltiplos
    };
    return types[type] || type;
  };

  const selectedService = services.find((s) => s.id === selectedServiceId);

  return (
    <div className="space-y-4">
      {/* Service Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-400">Serviço</label>
        <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
            <SelectValue placeholder="Selecione um serviço..." />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            {services
              .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
              .map((service) => (
                <SelectItem
                  key={service.id}
                  value={service.id}
                  className="text-white hover:bg-zinc-700"
                >
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    <span>{service.name}</span>
                  </div>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {selectedServiceId && (
        <>
          {/* Mode Toggle */}
          <div className="flex justify-center">
            <div className="bg-zinc-900 p-1 rounded-xl inline-flex relative">
              <div
                className={`absolute top-1 bottom-1 w-[120px] rounded-lg bg-green-600 transition-all duration-300 ${
                  inputMode === "multiple"
                    ? "translate-x-[120px]"
                    : "translate-x-0"
                }`}
              />
              <button
                onClick={() => setInputMode("single")}
                className={`relative w-[120px] py-2 rounded-lg font-medium transition-colors ${
                  inputMode === "single"
                    ? "text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Valor Único
              </button>
              <button
                onClick={() => setInputMode("multiple")}
                className={`relative w-[120px] py-2 rounded-lg font-medium transition-colors ${
                  inputMode === "multiple"
                    ? "text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Múltiplos
              </button>
            </div>
          </div>

          {/* Single Value Mode */}
          {inputMode === "single" && (
            <Card className="bg-zinc-900 border-zinc-700">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">
                      Valor Unitário
                    </label>
                    <div className="relative">
                      <Euro className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <Input
                        type="number"
                        value={serviceValue}
                        onChange={(e) => setServiceValue(e.target.value)}
                        className="pl-10 bg-zinc-800 border-zinc-600 text-white"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">
                      Quantidade{" "}
                      {selectedService &&
                        `(${getUnitLabel(selectedService.type)})`}
                    </label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <Input
                        type="number"
                        value={serviceQuantity}
                        onChange={(e) => setServiceQuantity(e.target.value)}
                        className="pl-10 bg-zinc-800 border-zinc-600 text-white"
                        placeholder="1"
                        step="1"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                {serviceValue && serviceQuantity && (
                  <div className="mt-4 pt-4 border-t border-zinc-700">
                    <p className="text-right text-sm">
                      <span className="text-zinc-400">Total: </span>
                      <span className="text-white font-medium">
                        {(
                          parseFloat(serviceValue) * parseFloat(serviceQuantity)
                        ).toFixed(2)}
                        €
                      </span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Multiple Values Mode */}
          {inputMode === "multiple" && (
            <div className="space-y-4">
              {multipleEntries.map((entry, index) => (
                <Card key={index} className="bg-zinc-900 border-zinc-700">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-2">
                        <label className="text-sm font-medium text-zinc-400">
                          Valor {index + 1}
                        </label>
                        <div className="relative">
                          <Euro className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                          <Input
                            type="number"
                            value={entry.value}
                            onChange={(e) =>
                              updateEntryValue(index, e.target.value)
                            }
                            className="pl-10 bg-zinc-800 border-zinc-600 text-white"
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                          />
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <label className="text-sm font-medium text-zinc-400">
                          Quantidade{" "}
                          {selectedService &&
                            `(${getUnitLabel(selectedService.type)})`}
                        </label>
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                          <Input
                            type="number"
                            value={entry.quantity}
                            onChange={(e) =>
                              updateEntryQuantity(index, e.target.value)
                            }
                            className="pl-10 bg-zinc-800 border-zinc-600 text-white"
                            placeholder="1"
                            step="1"
                            min="1"
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEntry(index)}
                        disabled={multipleEntries.length === 1}
                        className="mt-8 text-red-400 hover:text-red-300 hover:bg-zinc-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {entry.value && entry.quantity && (
                      <div className="mt-4 pt-4 border-t border-zinc-700">
                        <p className="text-right text-sm">
                          <span className="text-zinc-400">Subtotal: </span>
                          <span className="text-white font-medium">
                            {(
                              parseFloat(entry.value) *
                              parseFloat(entry.quantity)
                            ).toFixed(2)}
                            €
                          </span>
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              <Button
                variant="outline"
                onClick={addEntry}
                className="w-full border-dashed border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Valor
              </Button>

              {multipleEntries.some(
                (entry) => entry.value && entry.quantity
              ) && (
                <div className="pt-4 border-t border-zinc-700">
                  <p className="text-right">
                    <span className="text-zinc-400">Total: </span>
                    <span className="text-white font-medium">
                      {calculateMultipleTotal().toFixed(2)}€
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Add Button */}
          <Button
            onClick={handleAddService}
            disabled={
              !selectedServiceId ||
              (inputMode === "single" &&
                (serviceValue === "" || serviceQuantity === "")) ||
              (inputMode === "multiple" &&
                multipleEntries.some((entry) => entry.value === ""))
            }
            className="w-full bg-green-600 hover:bg-green-700 h-12"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Serviço
          </Button>
        </>
      )}
    </div>
  );
};

export default ServiceInput;
