// ProtocolDetail.jsx - Vista de leitura + gerar PDF + enviar por email/WhatsApp
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../../firebase.jsx";
import generateProtocolPDF from "./pdf/generateProtocolPDF.jsx";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Edit2,
  Trash2,
  Download,
  Mail,
  MessageCircle,
  User,
  Printer,
  Wrench,
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

const ProtocolDetail = () => {
  const { protocolId } = useParams();
  const navigate = useNavigate();

  const [protocol, setProtocol] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [emailNotice, setEmailNotice] = useState(false);

  const fetchProtocol = useCallback(async () => {
    try {
      setLoading(true);
      const snap = await getDoc(doc(db, "protocolosServico", protocolId));
      if (!snap.exists()) {
        setError("Protocolo não encontrado.");
        return;
      }
      setProtocol({ id: snap.id, ...snap.data() });
    } catch (err) {
      console.error("Erro ao carregar protocolo:", err);
      setError("Erro ao carregar protocolo.");
    } finally {
      setLoading(false);
    }
  }, [protocolId]);

  useEffect(() => {
    fetchProtocol();
  }, [fetchProtocol]);

  const fetchCompanyProfile = async () => {
    try {
      const snap = await getDoc(doc(db, "config", "companyProfile"));
      return snap.exists() ? snap.data() : {};
    } catch {
      return {};
    }
  };

  const buildPdfBlob = async () => {
    const companyProfile = await fetchCompanyProfile();
    const pdfBytes = await generateProtocolPDF(protocol, companyProfile);
    return new Blob([pdfBytes], { type: "application/pdf" });
  };

  const handleDownloadPdf = async () => {
    try {
      setGeneratingPdf(true);
      const blob = await buildPdfBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `protocolo-${(protocol.title || protocolId).replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      setError("Erro ao gerar o PDF.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleSendEmail = async () => {
    await handleDownloadPdf();
    setEmailNotice(true);
    const subject = encodeURIComponent(`Protocolo de Serviço — ${protocol.title || ""}`);
    const body = encodeURIComponent(
      `Olá ${protocol.clientName || ""},\n\nSegue em anexo o protocolo de serviço referente a "${protocol.title || ""}".\n\nCumprimentos,\nNonato Service`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const handleSendWhatsApp = async () => {
    try {
      const clientSnap = protocol.clientId
        ? await getDoc(doc(db, "clientes", protocol.clientId))
        : null;
      const phone = clientSnap?.exists() ? clientSnap.data().phone : null;

      await handleDownloadPdf();
      setEmailNotice(true);

      const message = encodeURIComponent(
        `Olá ${protocol.clientName || ""}, segue o protocolo de serviço "${protocol.title || ""}" (ficheiro PDF em anexo — a enviar de seguida).`
      );

      let digits = (phone || "").replace(/\D/g, "");
      if (digits.length === 9) digits = `351${digits}`;

      window.open(
        digits ? `https://wa.me/${digits}?text=${message}` : `https://wa.me/?text=${message}`,
        "_blank"
      );
    } catch (err) {
      console.error("Erro ao preparar envio por WhatsApp:", err);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, "protocolosServico", protocolId));
      navigate("/app/protocols");
    } catch (err) {
      console.error("Erro ao apagar protocolo:", err);
      setError("Erro ao apagar protocolo.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!protocol) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-white">Protocolo não encontrado</p>
          <Button
            onClick={() => navigate("/app/protocols")}
            className="mt-4 bg-green-600 hover:bg-green-700"
          >
            Voltar à Lista
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/app/protocols")}
            className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
              {protocol.title || "Protocolo sem título"}
            </h1>
            <Badge
              className={
                protocol.status === "concluido"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-yellow-500/20 text-yellow-400"
              }
            >
              {protocol.status === "concluido" ? "Concluído" : "Rascunho"}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/app/edit-protocol/${protocolId}`)}
            className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
            className="bg-red-600 hover:bg-red-700"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}
      {emailNotice && (
        <Alert className="border-green-600 bg-green-600/10">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-400">
            PDF descarregado. Anexe o ficheiro descarregado na janela que foi
            aberta para concluir o envio.
          </AlertDescription>
        </Alert>
      )}

      {/* Informações + Ações */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-zinc-400" />
              <div>
                <p className="text-sm text-zinc-400">Cliente</p>
                <p className="text-white">{protocol.clientName || "N/A"}</p>
              </div>
            </div>
            {protocol.equipmentName && (
              <div className="flex items-center gap-3">
                <Printer className="h-4 w-4 text-zinc-400" />
                <div>
                  <p className="text-sm text-zinc-400">Equipamento</p>
                  <p className="text-white">{protocol.equipmentName}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-3 border-t border-zinc-700">
            <Button
              onClick={handleDownloadPdf}
              disabled={generatingPdf}
              className="bg-green-600 hover:bg-green-700"
            >
              {generatingPdf ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Descarregar PDF
            </Button>
            <Button
              variant="outline"
              onClick={handleSendEmail}
              disabled={generatingPdf}
              className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-900"
            >
              <Mail className="w-4 h-4 mr-2" />
              Enviar por Email
            </Button>
            <Button
              variant="outline"
              onClick={handleSendWhatsApp}
              disabled={generatingPdf}
              className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-900"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Enviar por WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Antes / Depois */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[
          { label: "Antes", accent: "bg-red-500", blocks: protocol.blocosAntes },
          { label: "Depois", accent: "bg-green-500", blocks: protocol.blocosDepois },
        ].map((section) => (
          <Card key={section.label} className="bg-zinc-800 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${section.accent}`} />
                {section.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!section.blocks || section.blocks.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-6">
                  Sem conteúdo registado
                </p>
              ) : (
                section.blocks.map((block) =>
                  block.tipo === "texto" ? (
                    <p
                      key={block.id}
                      className="text-sm text-zinc-300 whitespace-pre-wrap bg-zinc-700/30 p-3 rounded-lg border border-zinc-600"
                    >
                      {block.texto}
                    </p>
                  ) : (
                    <img
                      key={block.id}
                      src={block.imageUrl}
                      alt="Anexo do protocolo"
                      className="max-h-64 rounded-lg border border-zinc-600"
                    />
                  )
                )
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Peças Trocadas */}
      {protocol.pecasTrocadas && protocol.pecasTrocadas.length > 0 && (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Peças Trocadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {protocol.pecasTrocadas.map((peca) => (
              <div
                key={peca.id}
                className="flex items-center justify-between p-3 bg-zinc-700/30 rounded-lg border border-zinc-600"
              >
                <span className="text-white">{peca.name}</span>
                <div className="flex items-center gap-3 text-sm text-zinc-400">
                  {peca.code && <span>{peca.code}</span>}
                  <Badge className="bg-zinc-700 text-white hover:bg-zinc-700">
                    x{peca.quantity || 1}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar exclusão</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem a certeza que deseja apagar este protocolo? Esta ação não
              pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-zinc-700 text-white hover:text-white hover:bg-zinc-700 bg-zinc-600"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProtocolDetail;
