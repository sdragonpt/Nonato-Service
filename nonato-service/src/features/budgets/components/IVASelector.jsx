import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const IVASelector = ({ value, onChange }) => {
  const ivaRates = [0, 6, 13, 23];

  // Inicializa o estado baseado no valor recebido
  const [isCustomRate, setIsCustomRate] = useState(!ivaRates.includes(value));

  useEffect(() => {
    // Atualiza isCustomRate se o value mudar
    setIsCustomRate(!ivaRates.includes(value));
  }, [value]);

  const handleCustomRateChange = (e) => {
    const newValue = e.target.value;
    if (/^\d*\.?\d*$/.test(newValue)) {
      onChange(Number(newValue));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-muted-foreground">Taxa de IVA</Label>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground">Taxa personalizada</Label>
          <Switch
            checked={isCustomRate}
            onCheckedChange={(checked) => {
              setIsCustomRate(checked);
              if (!checked) {
                onChange(23); // Define um valor padrão caso desative a taxa personalizada
              }
            }}
            className="bg-muted data-[state=checked]:bg-primary"
          />
        </div>
      </div>

      {isCustomRate ? (
        <div className="relative">
          <Input
            type="text"
            value={value}
            onChange={handleCustomRateChange}
            className="pr-8"
            placeholder="Digite a taxa de IVA..."
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            %
          </span>
        </div>
      ) : (
        <Select
          value={value.toString()}
          onValueChange={(val) => onChange(Number(val))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione a taxa de IVA..." />
          </SelectTrigger>
          <SelectContent>
            {ivaRates.map((rate) => (
              <SelectItem
                key={rate}
                value={rate.toString()}
              >
                {rate}%
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {isCustomRate && (
        <p className="text-xs text-muted-foreground">
          Digite um valor entre 0 e 100 (sem o símbolo %)
        </p>
      )}
    </div>
  );
};

export default IVASelector;
