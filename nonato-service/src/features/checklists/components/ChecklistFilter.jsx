import React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter } from "lucide-react";

const CHECKLIST_CATEGORIES = [
  { value: "all", label: "Todas as categorias" },
  { value: "maintenance", label: "Checklist de Manutenção" },
  {
    value: "operational_training",
    label: "Checklist de Treinamento Operacional",
  },
  { value: "receiving", label: "Checklist de Recebimento" },
  { value: "programming", label: "Checklist de Programação" },
  { value: "installation", label: "Checklist de Instalação" },
];

const ChecklistFilter = ({ value, onValueChange }) => {
  return (
    <div className="flex items-center gap-2">
      <Filter className="w-4 h-4 text-zinc-400" />
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white w-[280px]">
          <SelectValue placeholder="Filtrar por categoria" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-800 border-zinc-700">
          <SelectGroup>
            {CHECKLIST_CATEGORIES.map((category) => (
              <SelectItem
                key={category.value}
                value={category.value}
                className="text-white hover:bg-zinc-700 focus:bg-zinc-700"
              >
                {category.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};

export default ChecklistFilter;
