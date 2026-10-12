// OrderDiariasCard.jsx
// Cartão "Diárias" no detalhe da Ordem de Serviço: ligar/desligar a
// cobrança de diárias, valor por diária e nº de diárias (conta automática
// pelos dias de trabalho, ou escrito à mão). Grava em `ordens/<id>.diarias`
// = { cobrar, valor, quantidade, mostrarNoPdf } — quantidade null = conta
// automática. Por omissão é só registo interno: só sai no PDF da OS com
// "Mostrar no PDF" ligado. O "Fechar Ordem" (AddBudget) usa estes valores.

import { useEffect, useRef, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { computeStay, formatStayPeriod, resolveDiarias } from "../../../utils/diarias.js";
import formatEuroNumber from "../../../utils/formatters/formatEuroNumber";
import { CalendarDays, Check, Loader2, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Switch } from "@/components/ui/switch.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";

const toNumber = (v) => parseFloat(String(v).replace(",", "."));

const OrderDiariasCard = ({ orderId, order, workdays, onChange }) => {
  const stay = computeStay(workdays);
  const saved = resolveDiarias(order?.diarias, stay);

  const [cobrar, setCobrar] = useState(saved.cobrar);
  const [mostrarNoPdf, setMostrarNoPdf] = useState(saved.mostrarNoPdf);
  const [valor, setValor] = useState(saved.valor ? String(saved.valor) : "");
  // "" = conta automática
  const [quantidade, setQuantidade] = useState(saved.manual ? String(saved.quantidade) : "");
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error
  const firstRender = useRef(true);

  // Gravação automática (com pequena espera, para não gravar a cada tecla).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const diarias = {
      cobrar,
      mostrarNoPdf,
      valor: Number.isFinite(toNumber(valor)) ? toNumber(valor) : 0,
      quantidade: quantidade === "" || !Number.isFinite(toNumber(quantidade)) ? null : toNumber(quantidade),
    };
    setStatus("saving");
    const t = setTimeout(async () => {
      try {
        await updateDoc(doc(db, "ordens", orderId), { diarias });
        onChange?.(diarias);
        setStatus("saved");
      } catch (err) {
        console.error("Erro ao gravar diárias:", err);
        setStatus("error");
      }
    }, 700);
    return () => clearTimeout(t);
  }, [cobrar, mostrarNoPdf, valor, quantidade]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = resolveDiarias(
    {
      cobrar,
      valor: toNumber(valor) || 0,
      quantidade: quantidade === "" ? null : toNumber(quantidade) || 0,
    },
    stay
  );

  return (
    <Card className="bg-zinc-800 border-zinc-700">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <CalendarDays className="w-5 h-5" />
          Diárias
        </CardTitle>
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <span className={`text-sm font-medium ${cobrar ? "text-green-400" : "text-zinc-400"}`}>
            {cobrar ? "Cobrar diárias: LIGADO" : "Cobrar diárias: DESLIGADO"}
          </span>
          <Switch checked={cobrar} onCheckedChange={setCobrar} aria-label="Cobrar diárias" />
        </label>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-zinc-400">
          {stay.diarias > 0 ? (
            <>
              Conta automática: <span className="text-white font-medium">{stay.diarias} diárias</span>{" "}
              ({formatStayPeriod(stay)}, incluindo fins de semana) · {stay.diasTrabalhados} dias trabalhados
            </>
          ) : (
            "Ainda não há dias de trabalho registados — escreva o nº de diárias à mão."
          )}
        </p>

        <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${cobrar ? "" : "opacity-50"}`}>
          <div className="space-y-1">
            <label className="text-sm text-zinc-400">Valor por diária (€)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="Ex: 150"
              disabled={!cobrar}
              className="bg-zinc-900 border-zinc-700 text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-zinc-400">
              Nº de diárias {quantidade === "" ? "(automático)" : "(manual)"}
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                step="1"
                value={quantidade === "" ? String(stay.diarias || "") : quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                disabled={!cobrar}
                className="bg-zinc-900 border-zinc-700 text-white"
              />
              {quantidade !== "" && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Voltar à conta automática"
                  onClick={() => setQuantidade("")}
                  disabled={!cobrar}
                  className="shrink-0 border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-700"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-zinc-400">Total das diárias</label>
            <p className="h-10 flex items-center text-lg font-semibold text-green-400">
              {cobrar ? `${formatEuroNumber(current.total)} €` : "—"}
            </p>
          </div>
        </div>

        <label className="flex items-center justify-between gap-3 rounded-lg border border-zinc-700 bg-zinc-900 p-3 cursor-pointer select-none">
          <span>
            <span className={`block text-sm font-medium ${mostrarNoPdf ? "text-green-400" : "text-zinc-300"}`}>
              {mostrarNoPdf ? "Mostrar no PDF: LIGADO" : "Mostrar no PDF: DESLIGADO"}
            </span>
            <span className="block text-xs text-zinc-500">
              {mostrarNoPdf
                ? "As diárias aparecem no PDF da Ordem de Serviço."
                : "As diárias ficam só registadas internamente; não saem no PDF da Ordem de Serviço."}
            </span>
          </span>
          <Switch checked={mostrarNoPdf} onCheckedChange={setMostrarNoPdf} aria-label="Mostrar diárias no PDF" />
        </label>

        <p className="text-xs text-zinc-500 h-4">
          {status === "saving" && (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> A gravar…
            </span>
          )}
          {status === "saved" && (
            <span className="inline-flex items-center gap-1 text-green-400">
              <Check className="h-3 w-3" /> Gravado
            </span>
          )}
          {status === "error" && (
            <span className="text-red-400">Não foi possível gravar. Tente novamente.</span>
          )}
        </p>
      </CardContent>
    </Card>
  );
};

export default OrderDiariasCard;
