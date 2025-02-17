import React, { useState, useEffect } from "react";
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
        <Label className="text-sm font-medium text-zinc-400">Taxa de IVA</Label>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-zinc-400">Taxa personalizada</Label>
          <Switch
            checked={isCustomRate}
            onCheckedChange={(checked) => {
              setIsCustomRate(checked);
              if (!checked) {
                onChange(23); // Define um valor padrão caso desative a taxa personalizada
              }
            }}
            className="bg-zinc-700 data-[state=checked]:bg-green-600"
          />
        </div>
      </div>

      {isCustomRate ? (
        <div className="relative">
          <Input
            type="text"
            value={value}
            onChange={handleCustomRateChange}
            className="pr-8 bg-zinc-900 border-zinc-700 text-white"
            placeholder="Digite a taxa de IVA..."
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
            %
          </span>
        </div>
      ) : (
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
                key={rate}
                value={rate.toString()}
                className="text-white hover:bg-zinc-700"
              >
                {rate}%
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {isCustomRate && (
        <p className="text-xs text-zinc-500">
          Digite um valor entre 0 e 100 (sem o símbolo %)
        </p>
      )}
    </div>
  );
};

export default IVASelector;
