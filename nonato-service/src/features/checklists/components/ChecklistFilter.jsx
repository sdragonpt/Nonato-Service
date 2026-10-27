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
  { value: "maintenance", label: "Manutenção" },
  {
    value: "operational_training",
    label: "Treinamento Operacional",
  },
  { value: "receiving", label: "Recebimento" },
  { value: "programming", label: "Programação" },
  { value: "installation", label: "Instalação" },
  { value: "pre_operational", label: "Pré-Checklist (Pré-Operacional)" },
];

const ChecklistFilter = ({ value, onValueChange }) => {
  return (
    <div className="flex items-center gap-2">
      <Filter className="w-4 h-4 text-muted-foreground" />
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Filtrar por categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {CHECKLIST_CATEGORIES.map((category) => (
              <SelectItem
                key={category.value}
                value={category.value}
               
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
