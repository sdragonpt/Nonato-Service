import React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

// Moved to top level for export
export const CHECKLIST_CATEGORIES = [
  {
    value: "maintenance",
    label: "Checklist de Manutenção",
    description: "Para acompanhamento e registro de manutenções regulares",
  },
  {
    value: "reception",
    label: "Checklist de Recepção do Equipamento",
    description: "Para verificação inicial de equipamentos recebidos",
  },
  {
    value: "training",
    label: "Checklist de Treinamento de Manutenção",
    description: "Para acompanhamento do processo de treinamento",
  },
];

// Moved to top level for export
export const CHECKLIST_CATEGORIES_MAP = CHECKLIST_CATEGORIES.reduce(
  (acc, category) => {
    acc[category.value] = category;
    return acc;
  },
  {}
);

const ChecklistTypeSelector = ({ value, onValueChange, disabled = false }) => {
  return (
    <Card className="bg-zinc-800 border-zinc-700">
      <CardHeader>
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          Categoria do Checklist
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">
              Selecione a categoria
            </label>
            <Select
              value={value}
              onValueChange={onValueChange}
              disabled={disabled}
            >
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectGroup>
                  {CHECKLIST_CATEGORIES.map((category) => (
                    <SelectItem
                      key={category.value}
                      value={category.value}
                      className="text-white hover:bg-zinc-700 focus:bg-zinc-700"
                    >
                      <div className="space-y-1">
                        <div>{category.label}</div>
                        <div className="text-xs text-zinc-400">
                          {category.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChecklistTypeSelector;
