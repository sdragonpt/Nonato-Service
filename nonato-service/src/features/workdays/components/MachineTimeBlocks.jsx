// src/features/workdays/components/MachineTimeBlocks.jsx
// Lista de blocos "máquina + horário" dentro de um dia de trabalho — permite
// registar trabalho em várias máquinas diferentes (ou na mesma máquina mais
// do que uma vez, ex: 9:30-11h na 002, 11h-13h na 133, 14:30-16h de volta
// à 002) ao longo do mesmo dia, cada bloco com o seu próprio início/fim.
import { Trash2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MANUAL_VALUE = "__manual__";

const timeToMinutes = (hora) => {
  if (!hora) return null;
  const [h, m] = hora.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const blockDurationMinutes = (block) => {
  const start = timeToMinutes(block.startHour);
  const end = timeToMinutes(block.endHour);
  if (start === null || end === null) return null;
  let diff = end - start;
  if (diff < 0) diff += 24 * 60; // passa da meia-noite
  return diff;
};

const formatMinutes = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return `${hours}h${minutes.toString().padStart(2, "0")}`;
};

const blockDurationLabel = (block) => {
  const minutes = blockDurationMinutes(block);
  return minutes === null ? null : formatMinutes(minutes);
};

// Gera um novo bloco vazio (a "key" é só para uso local no React, nunca é
// guardada na Firestore)
export const emptyMachineBlock = () => ({
  key: `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  equipmentId: "",
  equipmentLabel: "",
  startHour: "",
  endHour: "",
});

export const totalBlocksDurationMinutes = (blocks) => {
  let total = 0;
  (blocks || []).forEach((block) => {
    const minutes = blockDurationMinutes(block);
    if (minutes !== null) total += minutes;
  });
  return total;
};

export const totalBlocksDurationLabel = (blocks) =>
  formatMinutes(totalBlocksDurationMinutes(blocks));

// Remove o campo "key" (só usado internamente para as listas do React) antes
// de gravar os blocos na Firestore
export const sanitizeBlocksForSave = (blocks) =>
  (blocks || [])
    .filter((b) => b.equipmentLabel?.trim() || b.startHour || b.endHour)
    .map(({ equipmentId, equipmentLabel, startHour, endHour }) => ({
      equipmentId: equipmentId || "",
      equipmentLabel: equipmentLabel || "",
      startHour: startHour || "",
      endHour: endHour || "",
    }));

const MachineTimeBlocks = ({ blocks, onChange, equipmentOptions, disabled }) => {
  const updateBlock = (key, patch) => {
    onChange(blocks.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  };

  const addBlock = () => {
    onChange([...blocks, emptyMachineBlock()]);
  };

  const removeBlock = (key) => {
    onChange(blocks.filter((b) => b.key !== key));
  };

  const handleEquipmentSelect = (key, value) => {
    if (value === MANUAL_VALUE) {
      updateBlock(key, { equipmentId: "", equipmentLabel: "" });
      return;
    }
    const selected = (equipmentOptions || []).find((eq) => eq.id === value);
    const label = selected
      ? `${selected.serialNumber ? selected.serialNumber + " - " : ""}${
          selected.brand || ""
        } ${selected.model || ""}`.trim()
      : "";
    updateBlock(key, { equipmentId: value, equipmentLabel: label });
  };

  return (
    <div className="space-y-3">
      {blocks.length === 0 && (
        <p className="text-sm text-zinc-500">
          Nenhuma máquina adicionada ainda.
        </p>
      )}

      {blocks.map((block) => {
        const isManual = !block.equipmentId;
        const duration = blockDurationLabel(block);
        return (
          <div
            key={block.key}
            className="p-3 bg-zinc-900 border border-zinc-700 rounded-md space-y-3"
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <label className="text-xs font-medium text-zinc-500">
                  Máquina
                </label>
                <Select
                  value={block.equipmentId || MANUAL_VALUE}
                  onValueChange={(value) =>
                    handleEquipmentSelect(block.key, value)
                  }
                  disabled={disabled}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white">
                    <SelectValue placeholder="Selecionar máquina" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectItem value={MANUAL_VALUE}>
                      Outra / não listada (escrever manualmente)
                    </SelectItem>
                    {(equipmentOptions || []).map((eq) => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.serialNumber ? `${eq.serialNumber} - ` : ""}
                        {eq.brand} {eq.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isManual && (
                  <Input
                    value={block.equipmentLabel}
                    onChange={(e) =>
                      updateBlock(block.key, { equipmentLabel: e.target.value })
                    }
                    placeholder="Nome/código da máquina"
                    className="bg-zinc-800 border-zinc-600 text-white mt-1"
                    disabled={disabled}
                  />
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeBlock(block.key)}
                disabled={disabled}
                className="text-red-400 hover:text-red-300 hover:bg-zinc-800 mt-6"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">
                  Início
                </label>
                <input
                  type="time"
                  value={block.startHour}
                  onChange={(e) =>
                    updateBlock(block.key, { startHour: e.target.value })
                  }
                  disabled={disabled}
                  className="w-full p-2 bg-zinc-800 border border-zinc-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">
                  Fim
                </label>
                <input
                  type="time"
                  value={block.endHour}
                  onChange={(e) =>
                    updateBlock(block.key, { endHour: e.target.value })
                  }
                  disabled={disabled}
                  className="w-full p-2 bg-zinc-800 border border-zinc-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            {duration && (
              <p className="text-xs text-green-400">Duração: {duration}</p>
            )}
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        onClick={addBlock}
        disabled={disabled}
        className="w-full border-dashed border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
      >
        <Wrench className="w-4 h-4 mr-2" />
        Adicionar Máquina
      </Button>

      {blocks.length > 0 && (
        <p className="text-right text-sm text-zinc-300">
          Total:{" "}
          <span className="font-medium text-white">
            {totalBlocksDurationLabel(blocks)}
          </span>
        </p>
      )}
    </div>
  );
};

export default MachineTimeBlocks;
