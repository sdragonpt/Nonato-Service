import { useEffect, useState } from "react";
import { Plus, Trash2, Euro, Package, Hash, FolderOpen } from "lucide-react";
import { useGroups, GROUP_KINDS, priceTableForClient } from "../../services/groupsStore.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import formatEuroNumber from "../../utils/formatters/formatEuroNumber";

const PRICE_GROUP_KEY = "orcamento.grupoPrecos";
const NO_GROUP = "__sem__";

const ServiceInput = ({
  onAddService,
  services,
  selectedServiceId,
  setSelectedServiceId,
  clientGroupIds, // grupos do cliente do orçamento → tabela de preços por defeito
}) => {
  const [inputMode, setInputMode] = useState("single");
  const [serviceValue, setServiceValue] = useState("");
  const [serviceQuantity, setServiceQuantity] = useState("");
  const [multipleEntries, setMultipleEntries] = useState([
    { value: "", quantity: 1 },
  ]);

  // Grupo de preços (ex.: HOMAG): ao escolher um serviço, o valor desse
  // grupo aparece já preenchido (pode ser alterado). Lembra o último grupo.
  const { groups } = useGroups(GROUP_KINDS.SERVICOS);
  const [priceGroupId, setPriceGroupId] = useState(() => {
    try {
      return localStorage.getItem(PRICE_GROUP_KEY) || NO_GROUP;
    } catch {
      return NO_GROUP;
    }
  });
  const priceGroup = groups.find((g) => g.id === priceGroupId) || null;

  // Se o cliente está num grupo ligado a uma tabela de preços, essa tabela
  // fica escolhida quando o cliente muda (continua a dar para trocar à mão).
  const { groups: clientGroups } = useGroups(GROUP_KINDS.CLIENTES);
  const priceTablesById = new Map(groups.map((g) => [g.id, g]));
  const auto = priceTableForClient(clientGroupIds, clientGroups, priceTablesById);
  const clientKey = (clientGroupIds || []).join(",");
  useEffect(() => {
    if (auto.tableId) setPriceGroupId(auto.tableId);
    // só quando muda o cliente ou a ligação grupo → tabela
  }, [clientKey, auto.tableId]);
  const groupPrice = (serviceId) => {
    const v = priceGroup?.precos[serviceId];
    return v == null ? null : v;
  };

  const changePriceGroup = (id) => {
    setPriceGroupId(id);
    try {
      localStorage.setItem(PRICE_GROUP_KEY, id);
    } catch {
      /* sem armazenamento local: fica só nesta visita */
    }
    const v = selectedServiceId ? groups.find((g) => g.id === id)?.precos[selectedServiceId] : null;
    if (v != null) setServiceValue(String(v));
  };

  const selectService = (id) => {
    setSelectedServiceId(id);
    const v = groupPrice(id);
    if (v != null) {
      setServiceValue(String(v));
      setServiceQuantity((q) => q || "1");
      setMultipleEntries([{ value: String(v), quantity: 1 }]);
    }
  };

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
      {/* Grupo de preços + serviço */}
      <div className="grid gap-3 sm:grid-cols-[14rem_1fr]">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Grupo de preços</label>
          <Select value={priceGroupId} onValueChange={changePriceGroup}>
            <SelectTrigger>
              <span className="flex min-w-0 items-center gap-2">
                <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="Sem grupo" />
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_GROUP} className="text-muted-foreground">Sem grupo (valor à mão)</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Serviço</label>
          <Select value={selectedServiceId} onValueChange={selectService}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um serviço..." />
            </SelectTrigger>
            <SelectContent>
              {(() => {
                const sorted = [...services].sort((a, b) => a.name.localeCompare(b.name, "pt-PT"));
                const inGroup = priceGroup ? sorted.filter((sv) => sv.id in priceGroup.precos) : [];
                const others = priceGroup ? sorted.filter((sv) => !(sv.id in priceGroup.precos)) : sorted;
                const item = (service) => (
                  <SelectItem key={service.id} value={service.id}>
                    <div className="flex w-full items-center gap-2">
                      <Package className="h-4 w-4" />
                      <span>{service.name}</span>
                      {groupPrice(service.id) != null && (
                        <span className="ml-auto pl-3 text-xs tabular-nums text-primary">
                          {formatEuroNumber(groupPrice(service.id))}€
                        </span>
                      )}
                    </div>
                  </SelectItem>
                );
                return (
                  <>
                    {inGroup.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>{priceGroup.nome}</SelectLabel>
                        {inGroup.map(item)}
                      </SelectGroup>
                    )}
                    {others.length > 0 && (
                      <SelectGroup>
                        {inGroup.length > 0 && <SelectLabel>Outros serviços</SelectLabel>}
                        {others.map(item)}
                      </SelectGroup>
                    )}
                  </>
                );
              })()}
            </SelectContent>
          </Select>
        </div>
      </div>
      {auto.tableId && (
        <p className={`text-xs ${auto.conflict ? "text-amber-400" : "text-muted-foreground"}`}>
          {priceGroupId === auto.tableId
            ? `Tabela de preços do grupo de cliente "${auto.viaGroup.nome}".`
            : `O grupo de cliente "${auto.viaGroup.nome}" usa a tabela ${priceTablesById.get(auto.tableId)?.nome}; foi trocada à mão.`}
          {auto.conflict && " Atenção: o cliente está em vários grupos com tabelas diferentes — confirme a tabela."}
        </p>
      )}
      {selectedServiceId && priceGroup && groupPrice(selectedServiceId) == null && (
        <p className="text-xs text-amber-400">
          Este serviço não tem valor no grupo {priceGroup.nome} — escreva o valor à mão.
        </p>
      )}

      {selectedServiceId && (
        <>
          {/* Mode Toggle */}
          <div className="flex justify-center">
            <div className="bg-muted/50 p-1 rounded-xl inline-flex relative">
              <div
                className={`absolute top-1 bottom-1 w-[120px] rounded-lg bg-primary transition-all duration-300 ${
                  inputMode === "multiple"
                    ? "translate-x-[120px]"
                    : "translate-x-0"
                }`}
              />
              <button
                onClick={() => setInputMode("single")}
                className={`relative w-[120px] py-2 rounded-lg font-medium transition-colors ${
                  inputMode === "single"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Valor Único
              </button>
              <button
                onClick={() => setInputMode("multiple")}
                className={`relative w-[120px] py-2 rounded-lg font-medium transition-colors ${
                  inputMode === "multiple"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Múltiplos
              </button>
            </div>
          </div>

          {/* Single Value Mode */}
          {inputMode === "single" && (
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Valor Unitário
                    </label>
                    <div className="relative">
                      <Euro className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="number"
                        value={serviceValue}
                        onChange={(e) => setServiceValue(e.target.value)}
                        className="pl-10 bg-card"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Quantidade{" "}
                      {selectedService &&
                        `(${getUnitLabel(selectedService.type)})`}
                    </label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="number"
                        value={serviceQuantity}
                        onChange={(e) => setServiceQuantity(e.target.value)}
                        className="pl-10 bg-card"
                        placeholder="1"
                        step="1"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                {serviceValue && serviceQuantity && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-right text-sm">
                      <span className="text-muted-foreground">Total: </span>
                      <span className="text-foreground font-medium">
                        {formatEuroNumber(
                          parseFloat(serviceValue) * parseFloat(serviceQuantity)
                        )}
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
                <Card key={index} className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">
                          Valor {index + 1}
                        </label>
                        <div className="relative">
                          <Euro className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="number"
                            value={entry.value}
                            onChange={(e) =>
                              updateEntryValue(index, e.target.value)
                            }
                            className="pl-10 bg-card"
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                          />
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">
                          Quantidade{" "}
                          {selectedService &&
                            `(${getUnitLabel(selectedService.type)})`}
                        </label>
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="number"
                            value={entry.quantity}
                            onChange={(e) =>
                              updateEntryQuantity(index, e.target.value)
                            }
                            className="pl-10 bg-card"
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
                        className="mt-8 text-red-400 hover:text-red-300 hover:bg-white/5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {entry.value && entry.quantity && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-right text-sm">
                          <span className="text-muted-foreground">Subtotal: </span>
                          <span className="text-foreground font-medium">
                            {formatEuroNumber(
                              parseFloat(entry.value) *
                              parseFloat(entry.quantity)
                            )}
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
                className="w-full border-dashed text-muted-foreground hover:bg-white/5"
              >
                <Plus className="w-4 h-4" />
                Adicionar Valor
              </Button>

              {multipleEntries.some(
                (entry) => entry.value && entry.quantity
              ) && (
                <div className="pt-4 border-t border-border">
                  <p className="text-right">
                    <span className="text-muted-foreground">Total: </span>
                    <span className="text-foreground font-medium">
                      {formatEuroNumber(calculateMultipleTotal())}€
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
            className="w-full h-12"
          >
            <Plus className="w-4 h-4" />
            Adicionar Serviço
          </Button>
        </>
      )}
    </div>
  );
};

export default ServiceInput;
