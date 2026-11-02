// SolicitarFaturaDialog.jsx
// Janela "Solicitar fatura" dos Detalhes do Cliente: preenche os dados do
// cliente, pede o valor (com ou sem IVA) e a nota, e gera o PDF da
// Solicitação de Fatura (pdf/solicitacaoFaturaPDF.js). Os dados do cliente
// podem ser acertados aqui só para este PDF — não alteram a ficha.

import { useEffect, useState } from "react";
import { FileText, Loader2, Euro } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Switch } from "@/components/ui/switch.jsx";
import { Field, FieldGrid, InputField } from "../../../components/app";
import {
  generateSolicitacaoFaturaPDF,
  invoiceAmounts,
  formatEuro,
} from "../pdf/solicitacaoFaturaPDF.js";

const DEFAULT_TEXT = "Venho por meio desta solicitar que seja feita uma fatura com os dados abaixo.\nObrigado. Nonato";
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const SolicitarFaturaDialog = ({ open, onOpenChange, client }) => {
  const [form, setForm] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Cada vez que abre, recomeça com os dados atuais do cliente.
  useEffect(() => {
    if (!open || !client) return;
    setForm({
      name: client.name || "",
      nif: client.nif || "",
      phone: client.phone || "",
      email: client.email || "",
      address: client.address || "",
      postalCode: client.postalCode || "",
      company: client.company || "",
      data: today(),
      texto: DEFAULT_TEXT,
      valor: "",
      comIva: false,
      taxaIva: "23",
      nota: "Prestação de serviços",
    });
    setError(null);
  }, [open, client]);

  if (!form) return null;
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const valorNum = Number(String(form.valor).replace(",", "."));
  const valid = form.name.trim() && form.valor !== "" && !Number.isNaN(valorNum) && valorNum > 0;
  const amounts = invoiceAmounts({ valor: valorNum, comIva: form.comIva, taxaIva: form.taxaIva });

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!valid) return;
    try {
      setGenerating(true);
      setError(null);
      await generateSolicitacaoFaturaPDF({
        client: form,
        data: form.data,
        texto: form.texto,
        valor: valorNum,
        comIva: form.comIva,
        taxaIva: Number(String(form.taxaIva).replace(",", ".")) || 0,
        nota: form.nota,
      });
      onOpenChange(false);
    } catch (err) {
      console.error("Erro ao gerar a solicitação de fatura:", err);
      setError("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar fatura</DialogTitle>
          <DialogDescription>
            Gera o PDF do pedido de fatura com os dados do cliente e o valor.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleGenerate} className="space-y-5">
          <FieldGrid cols={2}>
            <InputField label="Valor" required icon={Euro} inputMode="decimal" value={form.valor} onChange={set("valor")} placeholder="0,00" autoFocus />
            <InputField label="Data" type="date" value={form.data} onChange={set("data")} />
          </FieldGrid>

          <div className="surface-muted space-y-3 p-3">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>
                Acrescentar IVA
                <span className="block text-xs text-muted-foreground">Desligado = o valor vai tal como está</span>
              </span>
              <Switch checked={form.comIva} onCheckedChange={(v) => setForm((f) => ({ ...f, comIva: v }))} />
            </label>
            {form.comIva && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Taxa</span>
                <Input inputMode="decimal" value={form.taxaIva} onChange={set("taxaIva")} className="h-9 w-20 text-right" />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            )}
            {valid && (
              <p className="text-sm tabular-nums">
                {form.comIva ? (
                  <>
                    {formatEuro(amounts.base)} + IVA {formatEuro(amounts.iva)} ={" "}
                    <strong className="text-primary">{formatEuro(amounts.total)}</strong>
                  </>
                ) : (
                  <>
                    Valor a faturar: <strong className="text-primary">{formatEuro(amounts.total)}</strong>
                  </>
                )}
              </p>
            )}
          </div>

          <Field label="Texto da solicitação">
            <Textarea rows={3} value={form.texto} onChange={set("texto")} />
          </Field>

          <div className="space-y-3">
            <p className="text-sm font-medium">Dados do cliente <span className="font-normal text-muted-foreground">(só para este PDF)</span></p>
            <FieldGrid cols={2}>
              <InputField label="Cliente" required value={form.name} onChange={set("name")} />
              <InputField label="NIF" value={form.nif} onChange={set("nif")} />
              <InputField label="Telefone" value={form.phone} onChange={set("phone")} />
              <InputField label="E-mail" type="email" value={form.email} onChange={set("email")} />
            </FieldGrid>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_11rem]">
              <InputField label="Morada" value={form.address} onChange={set("address")} />
              <InputField label="Código postal / localidade" value={form.postalCode} onChange={set("postalCode")} />
            </div>
          </div>

          <Field label="Nota">
            <Textarea rows={2} value={form.nota} onChange={set("nota")} />
          </Field>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!valid || generating}>
              {generating ? <Loader2 className="animate-spin" /> : <FileText />}
              Gerar PDF
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SolicitarFaturaDialog;
