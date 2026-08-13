// src/features/prepOrders/components/OrdemPreparacaoDetail.jsx
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, addDoc, updateDoc, deleteDoc, collection } from "firebase/firestore";
import { db } from "../../../firebase.jsx";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Printer,
  FileCheck2,
  Trash2,
  CheckCircle2,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";

const STATUS_META = {
  rascunho: { label: "Rascunho", className: "bg-yellow-500/20 text-yellow-400" },
  finalizada: { label: "Finalizada", className: "bg-green-500/20 text-green-400" },
};

const Field = ({ label, value }) => {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-sm text-white">{value}</p>
    </div>
  );
};

const TagList = ({ items }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Badge key={item} className="bg-zinc-700 text-white hover:bg-zinc-700">
          {item}
        </Badge>
      ))}
    </div>
  );
};

const buildPrintableHtml = (order) => {
  const line = (label, value) => (value ? `<p><strong>${label}:</strong> ${value}</p>` : "");
  const tags = (label, items) =>
    items && items.length ? `<p><strong>${label}:</strong> ${items.join(", ")}</p>` : "";

  return `
    <html>
      <head>
        <title>Ordem de Preparação — SME_UP ${order.codigoSmeUp || ""}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          h2 { font-size: 14px; margin-top: 20px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
          p { font-size: 13px; margin: 4px 0; }
        </style>
      </head>
      <body>
        <h1>Ordem de Preparação — SME_UP ${order.codigoSmeUp || ""}</h1>
        <p>Gerado em ${new Date().toLocaleDateString("pt-PT")}</p>

        <h2>Dados Gerais</h2>
        ${line("Descrição", order.descricao)}
        ${line("Modelo", order.modelo)}
        ${line("Marca", order.marca)}
        ${line("Cliente", order.clientName)}
        ${line("Técnico Responsável", order.tecnicoResponsavelNome)}
        ${line("Modalidade de Venda", order.modalidadeVenda)}
        ${line("País", order.pais)}
        ${line("Instalação", order.instalacao)}
        ${line("Test Run", order.testRun ? "Sim" : "Não")}

        <h2>Material e Configuração</h2>
        ${tags("Material Trabalhado", order.materialTrabalhado)}
        ${line("Material Trabalhado (Outro)", order.materialTrabalhadoOutro)}
        ${line("Tipologia Folheado", order.tipologiaFolheado || order.tipologiaFolheadoOutro)}
        ${line("Cor", order.cor || order.corOutro)}
        ${line("Dimensões Máx", order.dimensoesMax)}
        ${line("Dimensões Mín", order.dimensoesMin)}
        ${tags("Tipologia de Borda", order.tipologiaBorda)}
        ${tags("Espessura Borda", order.espessuraBorda)}
        ${tags("Tipo de Cola", order.tipoCola)}
        ${tags("Grades de Proteção", order.gradesProtecao)}

        <h2>Ferramentas</h2>
        ${line("Fornecido pelo Cliente", order.ferramentasFornecidoCliente ? "Sim" : "Não")}
        ${line("Antes do Test Run", order.ferramentasAntesTestRun ? "Sim" : "Não")}
        ${line("A cargo do Fabricante", order.ferramentasCargoFerwood ? "Sim" : "Não")}
        ${line("Tapete de Evacuação", order.tapeteEvacuacao ? "Sim" : "Não")}
        ${line("Quais", order.ferramentasQuais)}
        ${line("Ventosas", order.ventosas)}

        <h2>Material Test Run</h2>
        ${line("Fornecido pelo Cliente", order.materialTestRunFornecidoCliente ? "Sim" : "Não")}
        ${line("Armazém Nonato", order.materialTestRunArmazemFW ? "Sim" : "Não")}
        ${line("Quais e Qtd", order.materialTestRunQuaisQtd)}

        <h2>Língua e Documentação</h2>
        ${line("Língua Destino", order.linguaDestino)}
        ${line("Manuais", order.manuais)}
        ${line("Adesivos", order.adesivos)}

        <h2>Notas de Produção</h2>
        <p>${order.notasProducao || "—"}</p>

        <h2>Impressões</h2>
        <p>${order.impressoes || "—"}</p>

        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `;
};

const OrdemPreparacaoDetail = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [generatedMsg, setGeneratedMsg] = useState(null);

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      const snap = await getDoc(doc(db, "ordensPreparacao", orderId));
      if (!snap.exists()) {
        setError("Ordem de preparação não encontrada.");
        return;
      }
      setOrder({ id: snap.id, ...snap.data() });
    } catch (err) {
      console.error("Erro ao carregar ordem de preparação:", err);
      setError("Erro ao carregar ordem de preparação.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handlePrint = () => {
    if (!order) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(buildPrintableHtml(order));
    win.document.close();
  };

  const handleGerarFormulario = async () => {
    if (!order) return;
    try {
      setGenerating(true);
      setError(null);
      await addDoc(collection(db, "formulariosChecklistTecnicos"), {
        tipo: "ordem-preparacao",
        ordemPreparacaoId: order.id,
        codigoSmeUp: order.codigoSmeUp || "",
        descricao: order.descricao || "",
        clientId: order.clientId || "",
        clientName: order.clientName || "",
        tecnicoResponsavelId: order.tecnicoResponsavelId || "",
        tecnicoResponsavelNome: order.tecnicoResponsavelNome || "",
        status: "pendente",
        observacoesTecnico: "",
        createdAt: new Date(),
      });
      await updateDoc(doc(db, "ordensPreparacao", order.id), {
        status: "finalizada",
        updatedAt: new Date(),
      });
      setOrder((prev) => ({ ...prev, status: "finalizada" }));
      setGeneratedMsg("Formulário gerado com sucesso e enviado para os Formulários de Técnicos.");
    } catch (err) {
      console.error("Erro ao gerar formulário:", err);
      setError("Erro ao gerar formulário.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, "ordensPreparacao", orderId));
      navigate("/app/ordens-preparacao");
    } catch (err) {
      console.error("Erro ao apagar ordem de preparação:", err);
      setError("Erro ao apagar.");
      setDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (error && !order) {
    return (
      <Alert variant="destructive" className="border-red-500 bg-red-500/10">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-red-400">{error}</AlertDescription>
      </Alert>
    );
  }

  const meta = STATUS_META[order.status] || STATUS_META.rascunho;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/app/ordens-preparacao")}
            className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              SME_UP {order.codigoSmeUp}
            </h1>
            <Badge className={meta.className}>{meta.label}</Badge>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-900"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          <Button
            onClick={handleGerarFormulario}
            disabled={generating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileCheck2 className="w-4 h-4 mr-2" />
            )}
            Gerar Formulário
          </Button>
          <Button
            variant="outline"
            onClick={() => setDeleteOpen(true)}
            className="border-red-600 text-red-400 hover:bg-red-600/10 bg-zinc-900"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Apagar
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}
      {generatedMsg && (
        <Alert className="border-green-600 bg-green-600/10">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-400 flex items-center justify-between gap-4">
            <span>{generatedMsg}</span>
            <Button
              size="sm"
              onClick={() => navigate("/app/formularios-tecnicos")}
              className="bg-green-600 hover:bg-green-700"
            >
              Ver Formulários
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-base text-white">Dados Gerais</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Descrição" value={order.descricao} />
          <Field label="Modelo" value={order.modelo} />
          <Field label="Marca" value={order.marca} />
          <Field label="Cliente" value={order.clientName} />
          <Field label="Técnico Responsável" value={order.tecnicoResponsavelNome} />
          <Field label="Modalidade de Venda" value={order.modalidadeVenda} />
          <Field label="País" value={order.pais} />
          <Field label="Instalação" value={order.instalacao} />
          <Field label="Test Run" value={order.testRun ? "Sim" : "Não"} />
        </CardContent>
      </Card>

      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-base text-white">Material e Configuração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <TagList items={order.materialTrabalhado} />
          <Field label="Material Trabalhado (Outro)" value={order.materialTrabalhadoOutro} />
          <Field
            label="Tipologia Folheado"
            value={order.tipologiaFolheado || order.tipologiaFolheadoOutro}
          />
          <Field label="Cor" value={order.cor || order.corOutro} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Dimensões Máx" value={order.dimensoesMax} />
            <Field label="Dimensões Mín" value={order.dimensoesMin} />
            <Field label="Dimensões (Outro)" value={order.dimensoesOutro} />
          </div>
          <TagList items={order.tipologiaBorda} />
          <TagList items={order.espessuraBorda} />
          <TagList items={order.tipoCola} />
          <TagList items={order.gradesProtecao} />
        </CardContent>
      </Card>

      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-base text-white">Ferramentas &amp; Test Run</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Ferramentas Fornecidas pelo Cliente" value={order.ferramentasFornecidoCliente ? "Sim" : "Não"} />
          <Field label="Antes do Test Run" value={order.ferramentasAntesTestRun ? "Sim" : "Não"} />
          <Field label="A cargo do Fabricante" value={order.ferramentasCargoFerwood ? "Sim" : "Não"} />
          <Field label="Tapete de Evacuação" value={order.tapeteEvacuacao ? "Sim" : "Não"} />
          <Field label="Ferramentas — Quais" value={order.ferramentasQuais} />
          <Field label="Ventosas" value={order.ventosas} />
          <Field label="Material Test Run — Cliente" value={order.materialTestRunFornecidoCliente ? "Sim" : "Não"} />
          <Field label="Material Test Run — Armazém" value={order.materialTestRunArmazemFW ? "Sim" : "Não"} />
          <Field label="Material Test Run — Quais/Qtd" value={order.materialTestRunQuaisQtd} />
        </CardContent>
      </Card>

      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-base text-white">Documentação &amp; Notas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Língua Destino" value={order.linguaDestino} />
          <Field label="Manuais" value={order.manuais} />
          <Field label="Adesivos" value={order.adesivos} />
          {order.notasProducao && (
            <div className="sm:col-span-3">
              <p className="text-xs text-zinc-500">Notas de Produção</p>
              <p className="text-sm text-white whitespace-pre-wrap">{order.notasProducao}</p>
            </div>
          )}
          {order.impressoes && (
            <div className="sm:col-span-3">
              <p className="text-xs text-zinc-500">Impressões</p>
              <p className="text-sm text-white whitespace-pre-wrap">{order.impressoes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar Exclusão</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem a certeza que deseja excluir esta ordem de preparação? Esta ação não pode
              ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              className="border-zinc-600 text-zinc-300 bg-zinc-800 hover:bg-zinc-700"
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdemPreparacaoDetail;
