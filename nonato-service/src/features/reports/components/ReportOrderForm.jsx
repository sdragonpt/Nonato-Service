// src/features/reports/components/ReportOrderForm.jsx
// Formulário completo "tipo ordem de serviço" para o fluxo de criação de
// relatórios (normais e especiais) em ManageReport.jsx. Cobre o mesmo
// leque de campos que uma Ordem de Serviço a sério (equipamento(s),
// prioridade, checklist, resultado, peças, dias de trabalho + horas por
// máquina), mas o resultado nunca é gravado na coleção "ordens" — só serve
// para preencher o PDF do relatório.
//
// Regras de equipamento (impostas pelo utilizador):
// - Cliente registado → só equipamento REGISTADO desse cliente (sem opção
//   manual).
// - Serviço isolado (sem cliente) → só equipamento MANUAL (não há
//   equipamentos registados para escolher).
// - Relatório normal → no máximo 1 equipamento.
// - Relatório especial → vários equipamentos; a secção "Horas por Máquina"
//   escolhe sempre a partir da lista de equipamentos já adicionados aqui em
//   cima (nunca texto livre).
//
// Componente controlado: o estado vive no componente-pai (ManageReport.jsx),
// que passa `value` + `onChange`.
import {
  Wrench,
  Plus,
  Trash2,
  Package,
  Calendar,
  Clock,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";

const CHECKLIST_LABELS = {
  concluido: "Serviço Concluído",
  retorno: "Retorno Necessário",
  funcionarios: "Funcionários Presentes",
  documentacao: "Documentação Entregue",
  producao: "Produção Testada",
  pecas: "Peças Utilizadas",
};

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const emptyEquipmentEntry = () => ({
  id: genId(),
  equipmentId: "",
  brand: "",
  model: "",
  serialNumber: "",
});

export const emptyReportDraft = () => ({
  equipamentos: [],
  date: new Date().toISOString().split("T")[0],
  serviceType: "",
  priority: "normal",
  checklist: {
    concluido: false,
    retorno: false,
    funcionarios: false,
    documentacao: false,
    producao: false,
    pecas: false,
  },
  resultDescription: "",
  pontosEmAberto: "",
  partsQuoteItems: [],
  workdays: [],
});

const emptyWorkday = () => ({
  id: genId(),
  workDate: new Date().toISOString().split("T")[0],
  departureTime: "",
  arrivalTime: "",
  kmDeparture: "",
  kmReturn: "",
  pause: false,
  pauseHours: "",
  returnDepartureTime: "",
  returnArrivalTime: "",
  description: "",
  machineEntries: [],
});

const emptyMachineEntry = () => ({
  id: genId(),
  equipoId: "",
  equipmentId: null,
  equipmentLabel: "",
  startHour: "",
  endHour: "",
});

const ReportOrderForm = ({ clientEquipments = [], value, onChange, isolated = false, reportType = "normal" }) => {
  const set = (patch) => onChange({ ...value, ...patch });
  const setChecklist = (key, checked) =>
    onChange({ ...value, checklist: { ...value.checklist, [key]: checked } });

  // ── Equipamento(s) ───────────────────────────────────────────────────
  const canAddEquipment =
    reportType === "especial" ? true : value.equipamentos.length === 0;

  const addEquipment = () => set({ equipamentos: [...value.equipamentos, emptyEquipmentEntry()] });
  const removeEquipment = (id) => {
    const removedIds = new Set([id]);
    set({
      equipamentos: value.equipamentos.filter((e) => e.id !== id),
      // Limpa também as referências a este equipamento nas horas por máquina.
      workdays: value.workdays.map((w) => ({
        ...w,
        machineEntries: w.machineEntries.map((entry) =>
          removedIds.has(entry.equipoId)
            ? { ...entry, equipoId: "", equipmentId: null, equipmentLabel: "" }
            : entry
        ),
      })),
    });
  };
  const setRegisteredEquipment = (entryId, equipmentId) => {
    const eq = clientEquipments.find((e) => e.id === equipmentId);
    set({
      equipamentos: value.equipamentos.map((e) =>
        e.id === entryId
          ? {
              ...e,
              equipmentId,
              brand: eq?.brand || "",
              model: eq?.model || "",
              serialNumber: eq?.serialNumber || "",
            }
          : e
      ),
    });
  };
  const updateManualEquipment = (entryId, patch) =>
    set({
      equipamentos: value.equipamentos.map((e) => (e.id === entryId ? { ...e, ...patch } : e)),
    });

  // ── Peças ──────────────────────────────────────────────────────────────
  const addPart = () =>
    set({
      partsQuoteItems: [...value.partsQuoteItems, { id: genId(), name: "", quantity: 1, price: 0 }],
    });
  const updatePart = (id, patch) =>
    set({
      partsQuoteItems: value.partsQuoteItems.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  const removePart = (id) =>
    set({ partsQuoteItems: value.partsQuoteItems.filter((p) => p.id !== id) });

  // ── Dias de Trabalho ─────────────────────────────────────────────────────
  const addWorkday = () => set({ workdays: [...value.workdays, emptyWorkday()] });
  const updateWorkday = (id, patch) =>
    set({ workdays: value.workdays.map((w) => (w.id === id ? { ...w, ...patch } : w)) });
  const removeWorkday = (id) => set({ workdays: value.workdays.filter((w) => w.id !== id) });

  const addMachineEntry = (workdayId) =>
    updateWorkday(workdayId, {
      machineEntries: [
        ...(value.workdays.find((w) => w.id === workdayId)?.machineEntries || []),
        emptyMachineEntry(),
      ],
    });
  const updateMachineEntry = (workdayId, entryId, patch) => {
    const workday = value.workdays.find((w) => w.id === workdayId);
    if (!workday) return;
    updateWorkday(workdayId, {
      machineEntries: workday.machineEntries.map((e) => (e.id === entryId ? { ...e, ...patch } : e)),
    });
  };
  const selectMachineEquipment = (workdayId, entryId, equipoLocalId) => {
    const eq = value.equipamentos.find((e) => e.id === equipoLocalId);
    updateMachineEntry(workdayId, entryId, {
      equipoId: equipoLocalId,
      equipmentLabel: eq ? `${eq.brand} ${eq.model}`.trim() : "",
      equipmentId: eq?.equipmentId || null,
    });
  };
  const removeMachineEntry = (workdayId, entryId) => {
    const workday = value.workdays.find((w) => w.id === workdayId);
    if (!workday) return;
    updateWorkday(workdayId, {
      machineEntries: workday.machineEntries.filter((e) => e.id !== entryId),
    });
  };

  return (
    <div className="space-y-4">
      {/* Equipamento(s) */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              {reportType === "especial" ? "Equipamentos" : "Equipamento"}
            </span>
            {canAddEquipment && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addEquipment}
                className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-900"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Adicionar
              </Button>
            )}
          </CardTitle>
          <p className="text-xs text-zinc-500">
            {isolated
              ? "Serviço isolado — introduz os dados do equipamento manualmente."
              : "Só equipamentos registados neste cliente."}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {value.equipamentos.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhum equipamento adicionado.</p>
          ) : (
            value.equipamentos.map((eq) => (
              <div key={eq.id} className="flex items-start gap-2">
                {isolated ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                    <Input
                      placeholder="Marca"
                      value={eq.brand}
                      onChange={(e) => updateManualEquipment(eq.id, { brand: e.target.value })}
                      className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                    />
                    <Input
                      placeholder="Modelo"
                      value={eq.model}
                      onChange={(e) => updateManualEquipment(eq.id, { model: e.target.value })}
                      className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                    />
                    <Input
                      placeholder="Nº de Série"
                      value={eq.serialNumber}
                      onChange={(e) => updateManualEquipment(eq.id, { serialNumber: e.target.value })}
                      className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                    />
                  </div>
                ) : (
                  <Select value={eq.equipmentId} onValueChange={(v) => setRegisteredEquipment(eq.id, v)}>
                    <SelectTrigger className="flex-1 bg-zinc-900 border-zinc-700 text-white">
                      <SelectValue placeholder="Escolhe o equipamento do cliente" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                      {clientEquipments.length === 0 && (
                        <div className="px-3 py-2 text-sm text-zinc-500">
                          Este cliente não tem equipamentos registados
                        </div>
                      )}
                      {clientEquipments.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.brand} {c.model} {c.serialNumber ? `— ${c.serialNumber}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeEquipment(eq.id)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10 shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Dados do Serviço */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">Dados do Serviço</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Data</label>
            <Input
              type="date"
              value={value.date}
              onChange={(e) => set({ date: e.target.value })}
              className="bg-zinc-900 border-zinc-700 text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Tipo de Serviço</label>
            <Input
              placeholder="Ex: Manutenção preventiva"
              value={value.serviceType}
              onChange={(e) => set({ serviceType: e.target.value })}
              className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Prioridade</label>
            <Select value={value.priority} onValueChange={(v) => set({ priority: v })}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">Checklist</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(CHECKLIST_LABELS).map(([key, label]) => (
            <label key={key} className="flex items-center space-x-3 text-white cursor-pointer">
              <Checkbox
                checked={value.checklist[key]}
                onCheckedChange={(checked) => setChecklist(key, checked)}
                className="border-zinc-600 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Resultado */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">Resultado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Descrição do Resultado</label>
            <Textarea
              value={value.resultDescription}
              onChange={(e) => set({ resultDescription: e.target.value })}
              placeholder="O que foi feito, diagnóstico, etc."
              className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Pontos em Aberto</label>
            <Textarea
              value={value.pontosEmAberto}
              onChange={(e) => set({ pontosEmAberto: e.target.value })}
              placeholder="O que fica pendente para uma próxima visita..."
              className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Peças */}
      {value.checklist.pecas && (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Peças Utilizadas
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addPart}
                className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-900"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Adicionar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {value.partsQuoteItems.length === 0 ? (
              <p className="text-sm text-zinc-500">Nenhuma peça adicionada.</p>
            ) : (
              value.partsQuoteItems.map((part) => (
                <div key={part.id} className="flex items-center gap-2">
                  <Input
                    placeholder="Nome da peça"
                    value={part.name}
                    onChange={(e) => updatePart(part.id, { name: e.target.value })}
                    className="flex-1 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={part.quantity}
                    onChange={(e) => updatePart(part.id, { quantity: parseInt(e.target.value, 10) || 1 })}
                    className="w-20 bg-zinc-900 border-zinc-700 text-white"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={part.price}
                    onChange={(e) => updatePart(part.id, { price: parseFloat(e.target.value) || 0 })}
                    className="w-24 bg-zinc-900 border-zinc-700 text-white"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePart(part.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Dias de Trabalho */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Dias de Trabalho
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addWorkday}
              className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-900"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Adicionar Dia
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {value.workdays.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhum dia de trabalho adicionado.</p>
          ) : (
            value.workdays.map((workday) => (
              <div key={workday.id} className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-zinc-300">
                    <Calendar className="h-3.5 w-3.5" />
                    Dia de trabalho
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeWorkday(workday.id)}
                    className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-500">Data</label>
                    <Input
                      type="date"
                      value={workday.workDate}
                      onChange={(e) => updateWorkday(workday.id, { workDate: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-white text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-500">Saída (ida)</label>
                    <Input
                      type="time"
                      value={workday.departureTime}
                      onChange={(e) => updateWorkday(workday.id, { departureTime: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-white text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-500">Chegada (ida)</label>
                    <Input
                      type="time"
                      value={workday.arrivalTime}
                      onChange={(e) => updateWorkday(workday.id, { arrivalTime: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-white text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-500">Km (ida)</label>
                    <Input
                      type="number"
                      value={workday.kmDeparture}
                      onChange={(e) => updateWorkday(workday.id, { kmDeparture: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-white text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-500">Saída (retorno)</label>
                    <Input
                      type="time"
                      value={workday.returnDepartureTime}
                      onChange={(e) => updateWorkday(workday.id, { returnDepartureTime: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-white text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-500">Chegada (retorno)</label>
                    <Input
                      type="time"
                      value={workday.returnArrivalTime}
                      onChange={(e) => updateWorkday(workday.id, { returnArrivalTime: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-white text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-500">Km (retorno)</label>
                    <Input
                      type="number"
                      value={workday.kmReturn}
                      onChange={(e) => updateWorkday(workday.id, { kmReturn: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-white text-sm"
                    />
                  </div>
                  <div className="space-y-1 flex flex-col justify-end">
                    <label className="text-[11px] text-zinc-500 flex items-center gap-2">
                      <Switch
                        checked={workday.pause}
                        onCheckedChange={(checked) => updateWorkday(workday.id, { pause: checked })}
                      />
                      Pausa
                    </label>
                    {workday.pause && (
                      <Input
                        placeholder="HH:MM"
                        value={workday.pauseHours}
                        onChange={(e) => updateWorkday(workday.id, { pauseHours: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-white text-sm"
                      />
                    )}
                  </div>
                </div>

                <Textarea
                  value={workday.description}
                  onChange={(e) => updateWorkday(workday.id, { description: e.target.value })}
                  placeholder="Descrição do trabalho deste dia..."
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 text-sm"
                />

                {/* Horas por máquina — escolhidas de entre os equipamentos já
                    adicionados em cima, nunca texto livre. */}
                <div className="space-y-2 pt-1 border-t border-zinc-700">
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Horas por Máquina
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => addMachineEntry(workday.id)}
                      disabled={value.equipamentos.length === 0}
                      className="text-green-400 hover:text-green-300 hover:bg-green-400/10 h-7 text-xs disabled:opacity-40"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Máquina
                    </Button>
                  </div>
                  {value.equipamentos.length === 0 && (
                    <p className="text-xs text-zinc-500">
                      Adiciona equipamento(s) na secção acima para poder registar horas por máquina.
                    </p>
                  )}
                  {workday.machineEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-2">
                      <Select
                        value={entry.equipoId}
                        onValueChange={(v) => selectMachineEquipment(workday.id, entry.id, v)}
                      >
                        <SelectTrigger className="flex-1 bg-zinc-800 border-zinc-700 text-white text-sm">
                          <SelectValue placeholder="Escolhe a máquina" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                          {value.equipamentos.map((eq) => (
                            <SelectItem key={eq.id} value={eq.id}>
                              {eq.brand || eq.model
                                ? `${eq.brand} ${eq.model}`.trim()
                                : "Equipamento sem nome"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="time"
                        value={entry.startHour}
                        onChange={(e) => updateMachineEntry(workday.id, entry.id, { startHour: e.target.value })}
                        className="w-28 bg-zinc-800 border-zinc-700 text-white text-sm"
                      />
                      <Input
                        type="time"
                        value={entry.endHour}
                        onChange={(e) => updateMachineEntry(workday.id, entry.id, { endHour: e.target.value })}
                        className="w-28 bg-zinc-800 border-zinc-700 text-white text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMachineEntry(workday.id, entry.id)}
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10 shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportOrderForm;
