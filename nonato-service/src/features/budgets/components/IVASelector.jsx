import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const IVASelector = ({ value, onChange }) => {
  const ivaRates = [
    { value: 0, label: "0%" },
    { value: 6, label: "6%" },
    { value: 13, label: "13%" },
    { value: 23, label: "23%" },
  ];

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-zinc-400">Taxa de IVA</Label>
      <Select
        value={value.toString()}
        onValueChange={(val) => onChange(Number(val))}
      >
        <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
          <SelectValue placeholder="Selecione a taxa de IVA..." />
        </SelectTrigger>
        <SelectContent className="bg-zinc-800 border-zinc-700">
          {ivaRates.map((rate) => (
            <SelectItem
              key={rate.value}
              value={rate.value.toString()}
              className="text-white hover:bg-zinc-700"
            >
              {rate.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default IVASelector;
