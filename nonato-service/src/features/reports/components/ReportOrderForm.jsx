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
// - Relatório especial → vários equipamentos, de QUALQUER cliente registado
//   ou do Armazém (equipamentos da própria empresa). Cada dia de trabalho
//   fica ligado a um desses equipamentos e tem o seu horário de trabalho
//   (início/fim). Para dois equipamentos no mesmo dia, adiciona-se outro dia
//   com a mesma data. Contas em ../pdf/specialReportData.js.
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
  Copy,
  Warehouse,
  Users,
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
import { toDateKey } from "../../../utils/formatDate.js";
import { buildSpecialReport, fmtMinutes } from "../pdf/specialReportData.js";

const CHECKLIST_LABELS = {
  concluido: "Serviço Concluído",
  retorno: "Retorno Necessário",
  funcionarios: "Funcionários Presentes",
  documentacao: "Documentação Entregue",
  producao: "Produção Testada",
  pecas: "Peças Utilizadas",
};

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const emptyEquipmentEntry = (patch = {}) => ({
  id: genId(),
  // Relatório especial: "cliente" (equipamento de um cliente registado) ou
  // "armazem" (equipamento da própria empresa).
  source: "cliente",
  clientId: "",
  clientName: "",
  equipmentId: "",
  brand: "",
  model: "",
  serialNumber: "",
  ...patch,
});

export const emptyReportDraft = () => ({
  equipamentos: [],
  date: toDateKey(),
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
  workDate: toDateKey(),
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
  // Relatório especial: equipamento do dia e horário de trabalho
  equipoId: "",
  startHour: "",
  endHour: "",
});

const addDays = (key, n) => {
  const [y, m, d] = (key || toDateKey()).split("-").map(Number);
  return toDateKey(new Date(y, m - 1, d + n));
};

const emptyMachineEntry = () => ({
  id: genId(),
  equipoId: "",
  equipmentId: null,
  equipmentLabel: "",
  startHour: "",
  endHour: "",
});

const ReportOrderForm = ({
  clientEquipments = [],
  value,
  onChange,
  isolated = false,
  reportType = "normal",
  // Só no relatório especial:
  mainClient = null,
  allClients = [],
  allEquipments = [],
  warehouseEquipments = [],
}) => {
  const special = reportType === "especial";
  const set = (patch) => onChange({ ...value, ...patch });
  const setChecklist = (key, checked) =>
    onChange({ ...value, checklist: { ...value.checklist, [key]: checked } });

  // ── Equipamento(s) ───────────────────────────────────────────────────
  const canAddEquipment =
    reportType === "especial" ? true : value.equipamentos.length === 0;

  const addEquipment = (source = "cliente") =>
    set({
      equipamentos: [
        ...value.equipamentos,
        emptyEquipmentEntry(
          special && !isolated
            ? source === "armazem"
              ? { source: "armazem" }
              : { source: "cliente", clientId: mainClient?.id || "", clientName: mainClient?.name || "" }
            : {}
        ),
      ],
    });
  const patchEquipment = (entryId, patch) =>
    set({ equipamentos: value.equipamentos.map((e) => (e.id === entryId ? { ...e, ...patch } : e)) });
  const setEquipmentClient = (entryId, clientId) => {
    const c = allClients.find((x) => x.id === clientId);
    patchEquipment(entryId, { clientId, clientName: c?.name || "", equipmentId: "", brand: "", model: "", serialNumber: "" });
  };
  const setAnyClientEquipment = (entryId, equipmentId) => {
    const eq = allEquipments.find((e) => e.id === equipmentId);
    patchEquipment(entryId, {
      equipmentId,
      brand: eq?.brand || "",
      model: eq?.model || "",
      serialNumber: eq?.serialNumber || "",
    });
  };
  const setWarehouseEquipment = (entryId, equipmentId) => {
    const eq = warehouseEquipments.find((e) => e.id === equipmentId);
    patchEquipment(entryId, {
      source: "armazem",
      clientId: "",
      clientName: "",
      equipmentId,
      brand: eq?.marca || eq?.nome || "",
      model: eq?.modelo || "",
      serialNumber: eq?.numeroSerie || "",
    });
  };
  const equipmentsOfClient = (clientId) => allEquipments.filter((e) => e.clientId === clientId);
  const equipmentName = (eq) =>
    [eq.brand, eq.model].filter(Boolean).join(" ").trim() ||
    (eq.equipmentId ? "Equipamento" : "Equipamento por escolher");
  const equipmentOption = (eq, i) =>
    `#${i + 1} ${equipmentName(eq)}${eq.source === "armazem" ? " · Armazém" : eq.clientName ? ` · ${eq.clientName}` : ""}`;
  const removeEquipment = (id) => {
    const removedIds = new Set([id]);
    set({
      equipamentos: value.equipamentos.filter((e) => e.id !== id),
      // Limpa também as referências a este equipamento nos dias.
      workdays: value.workdays.map((w) => ({
        ...w,
        equipoId: removedIds.has(w.equipoId) ? "" : w.equipoId,
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
  const addWorkday = () => {
    const last = value.workdays[value.workdays.length - 1];
    // No especial, o dia novo continua no equipamento do último dia, no dia seguinte.
    set({
      workdays: [
        ...value.workdays,
        special && last
          ? { ...emptyWorkday(), workDate: addDays(last.workDate, 1), equipoId: last.equipoId }
          : emptyWorkday(),
      ],
    });
  };
  // Copia um dia (horários incluídos) para o dia seguinte — semanas iguais
  // preenchem-se em poucos cliques.
  const copyWorkdayToNext = (id) => {
    const i = value.workdays.findIndex((w) => w.id === id);
    const src = value.workdays[i];
    const copy = { ...src, id: genId(), workDate: addDays(src.workDate, 1), description: "", machineEntries: [] };
    const next = [...value.workdays];
    next.splice(i + 1, 0, copy);
    set({ workdays: next });
  };
  const specialSummary = special ? buildSpecialReport(value.equipamentos, value.workdays) : null;
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              {reportType === "especial" ? "Equipamentos" : "Equipamento"}
            </span>
            {special && !isolated ? (
              <span className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => addEquipment("cliente")}>
                  <Users className="h-3.5 w-3.5" />
                  De um cliente
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => addEquipment("armazem")}>
                  <Warehouse className="h-3.5 w-3.5" />
                  Do Armazém
                </Button>
              </span>
            ) : (
              canAddEquipment && (
                <Button type="button" size="sm" variant="outline" onClick={() => addEquipment()}>
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar
                </Button>
              )
            )}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {isolated
              ? "Serviço isolado — introduz os dados do equipamento manualmente."
              : special
              ? "Equipamentos de qualquer cliente registado ou do Armazém (equipamentos da própria empresa). Cada dia de trabalho escolhe um destes."
              : "Só equipamentos registados neste cliente."}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {value.equipamentos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum equipamento adicionado.</p>
          ) : (
            value.equipamentos.map((eq, index) => (
              <div key={eq.id} className="flex items-start gap-2">
                {special && !isolated && (
                  <span className="mt-2.5 w-6 shrink-0 text-center text-xs font-semibold text-primary">#{index + 1}</span>
                )}
                {special && !isolated ? (
                  eq.source === "armazem" ? (
                    <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                      <div className="flex h-10 items-center gap-2 rounded-lg bg-muted/60 px-3 text-sm sm:w-56">
                        <Warehouse className="h-4 w-4 shrink-0 text-muted-foreground" />
                        Armazém (própria empresa)
                      </div>
                      <Select value={eq.equipmentId} onValueChange={(v) => setWarehouseEquipment(eq.id, v)}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Escolhe o equipamento do Armazém" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouseEquipments.length === 0 && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">Não há equipamentos no Armazém</div>
                          )}
                          {warehouseEquipments.map((w) => (
                            <SelectItem key={w.id} value={w.id}>
                              {[w.marca, w.modelo].filter(Boolean).join(" ") || w.nome}
                              {w.numeroSerie ? ` — ${w.numeroSerie}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                      <Select value={eq.clientId} onValueChange={(v) => setEquipmentClient(eq.id, v)}>
                        <SelectTrigger className="sm:w-56">
                          <SelectValue placeholder="Cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {allClients.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={eq.equipmentId}
                        onValueChange={(v) => setAnyClientEquipment(eq.id, v)}
                        disabled={!eq.clientId}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder={eq.clientId ? "Escolhe o equipamento" : "Escolhe primeiro o cliente"} />
                        </SelectTrigger>
                        <SelectContent>
                          {equipmentsOfClient(eq.clientId).length === 0 && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">Este cliente não tem equipamentos registados</div>
                          )}
                          {equipmentsOfClient(eq.clientId).map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.brand} {c.model} {c.serialNumber ? `— ${c.serialNumber}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )
                ) : isolated ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                    <Input
                      placeholder="Marca"
                      value={eq.brand}
                      onChange={(e) => updateManualEquipment(eq.id, { brand: e.target.value })}
                    />
                    <Input
                      placeholder="Modelo"
                      value={eq.model}
                      onChange={(e) => updateManualEquipment(eq.id, { model: e.target.value })}
                    />
                    <Input
                      placeholder="Nº de Série"
                      value={eq.serialNumber}
                      onChange={(e) => updateManualEquipment(eq.id, { serialNumber: e.target.value })}
                    />
                  </div>
                ) : (
                  <Select value={eq.equipmentId} onValueChange={(v) => setRegisteredEquipment(eq.id, v)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Escolhe o equipamento do cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientEquipments.length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dados do Serviço</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Data</label>
            <Input
              type="date"
              value={value.date}
              onChange={(e) => set({ date: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Tipo de Serviço</label>
            <Input
              placeholder="Ex: Manutenção preventiva"
              value={value.serviceType}
              onChange={(e) => set({ serviceType: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Prioridade</label>
            <Select value={value.priority} onValueChange={(v) => set({ priority: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Checklist</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(CHECKLIST_LABELS).map(([key, label]) => (
            <label key={key} className="flex items-center space-x-3 text-foreground cursor-pointer">
              <Checkbox
                checked={value.checklist[key]}
                onCheckedChange={(checked) => setChecklist(key, checked)}
                className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-green-500"
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Resultado */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resultado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Descrição do Resultado</label>
            <Textarea
              value={value.resultDescription}
              onChange={(e) => set({ resultDescription: e.target.value })}
              placeholder="O que foi feito, diagnóstico, etc."
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Pontos em Aberto</label>
            <Textarea
              value={value.pontosEmAberto}
              onChange={(e) => set({ pontosEmAberto: e.target.value })}
              placeholder="O que fica pendente para uma próxima visita..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Peças */}
      {value.checklist.pecas && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Peças Utilizadas
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addPart}
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {value.partsQuoteItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma peça adicionada.</p>
            ) : (
              value.partsQuoteItems.map((part) => (
                <div key={part.id} className="flex items-center gap-2">
                  <Input
                    placeholder="Nome da peça"
                    value={part.name}
                    onChange={(e) => updatePart(part.id, { name: e.target.value })}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={part.quantity}
                    onChange={(e) => updatePart(part.id, { quantity: parseInt(e.target.value, 10) || 1 })}
                    className="w-20"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={part.price}
                    onChange={(e) => updatePart(part.id, { price: parseFloat(e.target.value) || 0 })}
                    className="w-24"
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Dias de Trabalho
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addWorkday}
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar Dia
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {special && value.workdays.length > 0 && (
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3 text-sm sm:grid-cols-5">
              {[
                ["Trabalho", `${fmtMinutes(specialSummary.totals.trabalho)} h`],
                ["Ida", `${fmtMinutes(specialSummary.totals.ida)} h`],
                ["Retorno", `${fmtMinutes(specialSummary.totals.retorno)} h`],
                ["Km", specialSummary.totals.km],
                ["Diárias", specialSummary.totals.diarias],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</p>
                  <p className="font-semibold tabular-nums">{v}</p>
                </div>
              ))}
            </div>
          )}
          {value.workdays.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum dia de trabalho adicionado.</p>
          ) : (
            value.workdays.map((workday) => (
              <div key={workday.id} className="p-3 bg-background/50 rounded-lg border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-foreground/90">
                    <Calendar className="h-3.5 w-3.5" />
                    Dia de trabalho
                  </div>
                  {special && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => copyWorkdayToNext(workday.id)}
                      className="ml-auto mr-1 h-7 text-xs text-muted-foreground"
                      title="Cria o dia seguinte com os mesmos horários e equipamento"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copiar para o dia seguinte
                    </Button>
                  )}
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
                    <label className="text-[11px] text-muted-foreground">Data</label>
                    <Input
                      type="date"
                      value={workday.workDate}
                      onChange={(e) => updateWorkday(workday.id, { workDate: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">Saída (ida)</label>
                    <Input
                      type="time"
                      value={workday.departureTime}
                      onChange={(e) => updateWorkday(workday.id, { departureTime: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">Chegada (ida)</label>
                    <Input
                      type="time"
                      value={workday.arrivalTime}
                      onChange={(e) => updateWorkday(workday.id, { arrivalTime: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">Km (ida)</label>
                    <Input
                      type="number"
                      value={workday.kmDeparture}
                      onChange={(e) => updateWorkday(workday.id, { kmDeparture: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">Saída (retorno)</label>
                    <Input
                      type="time"
                      value={workday.returnDepartureTime}
                      onChange={(e) => updateWorkday(workday.id, { returnDepartureTime: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">Chegada (retorno)</label>
                    <Input
                      type="time"
                      value={workday.returnArrivalTime}
                      onChange={(e) => updateWorkday(workday.id, { returnArrivalTime: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">Km (retorno)</label>
                    <Input
                      type="number"
                      value={workday.kmReturn}
                      onChange={(e) => updateWorkday(workday.id, { kmReturn: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1 flex flex-col justify-end">
                    <label className="text-[11px] text-muted-foreground flex items-center gap-2">
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
                        className="text-sm"
                      />
                    )}
                  </div>
                </div>

                {special && (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_8rem_8rem]">
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">Equipamento / cliente deste dia</label>
                      <Select
                        value={workday.equipoId || ""}
                        onValueChange={(v) => updateWorkday(workday.id, { equipoId: v })}
                        disabled={value.equipamentos.length === 0}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder={value.equipamentos.length ? "Escolhe o equipamento" : "Adiciona equipamentos em cima"} />
                        </SelectTrigger>
                        <SelectContent>
                          {value.equipamentos.map((eq, i) => (
                            <SelectItem key={eq.id} value={eq.id}>
                              {equipmentOption(eq, i)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">Início do trabalho</label>
                      <Input
                        type="time"
                        value={workday.startHour || ""}
                        onChange={(e) => updateWorkday(workday.id, { startHour: e.target.value })}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">Fim do trabalho</label>
                      <Input
                        type="time"
                        value={workday.endHour || ""}
                        onChange={(e) => updateWorkday(workday.id, { endHour: e.target.value })}
                        className="text-sm"
                      />
                    </div>
                  </div>
                )}

                <Textarea
                  value={workday.description}
                  onChange={(e) => updateWorkday(workday.id, { description: e.target.value })}
                  placeholder="Descrição do trabalho deste dia..."
                  className="text-sm"
                />

                {/* Horas por máquina — escolhidas de entre os equipamentos já
                    adicionados em cima, nunca texto livre. (No especial o
                    próprio dia já tem equipamento + horário.) */}
                {!special && (
                <div className="space-y-2 pt-1 border-t border-border">
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
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
                      <Plus className="h-3 w-3" />
                      Máquina
                    </Button>
                  </div>
                  {value.equipamentos.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Adiciona equipamento(s) na secção acima para poder registar horas por máquina.
                    </p>
                  )}
                  {workday.machineEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-2">
                      <Select
                        value={entry.equipoId}
                        onValueChange={(v) => selectMachineEquipment(workday.id, entry.id, v)}
                      >
                        <SelectTrigger className="flex-1 text-sm">
                          <SelectValue placeholder="Escolhe a máquina" />
                        </SelectTrigger>
                        <SelectContent>
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
                        className="w-28 text-sm"
                      />
                      <Input
                        type="time"
                        value={entry.endHour}
                        onChange={(e) => updateMachineEntry(workday.id, entry.id, { endHour: e.target.value })}
                        className="w-28 text-sm"
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
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportOrderForm;
