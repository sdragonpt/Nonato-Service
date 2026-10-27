// ProtocolDetail.jsx - Vista de leitura + gerar PDF + enviar por email/WhatsApp
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../../firebase.jsx";
import generateProtocolPDF from "./pdf/generateProtocolPDF.jsx";
import {
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
  ClipboardCheck,
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
import { PageLoader, PageHeader } from "../../../components/app";

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
      // ✅ Nome do ficheiro = número do protocolo (ex.: PROT-0826-0003.pdf)
      link.download = `${protocol.protocolNumber || `PROT-${protocolId}`}.pdf`;
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
      <PageLoader />
    );
  }

  if (!protocol) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">Protocolo não encontrado</p>
          <Button
            onClick={() => navigate("/app/protocols")}
            className="mt-4"
          >
            Voltar à Lista
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title={protocol.title || "Protocolo sem título"}
        description={<span className="font-mono text-xs">{protocol.protocolNumber || `PROT-${protocolId}`}</span>}
        badge={
          <Badge variant={protocol.status === "concluido" ? "success" : "warning"}>
            {protocol.status === "concluido" ? "Concluído" : "Rascunho"}
          </Badge>
        }
        icon={ClipboardCheck}
        back="/app/protocols"
        actions={
          <>
            <Button variant="outline" onClick={() => navigate(`/app/edit-protocol/${protocolId}`)}>
              <Edit2 /> Editar
            </Button>
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 /> Apagar
            </Button>
          </>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {emailNotice && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            PDF descarregado. Anexe o ficheiro descarregado na janela que foi
            aberta para concluir o envio.
          </AlertDescription>
        </Alert>
      )}

      {/* Informações + Ações */}
      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="text-foreground">{protocol.clientName || "N/A"}</p>
              </div>
            </div>
            {protocol.equipmentName && (
              <div className="flex items-center gap-3">
                <Printer className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Equipamento</p>
                  <p className="text-foreground">{protocol.equipmentName}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
            <Button
              onClick={handleDownloadPdf}
              disabled={generatingPdf}
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
            >
              <Mail className="w-4 h-4" />
              Enviar por Email
            </Button>
            <Button
              variant="outline"
              onClick={handleSendWhatsApp}
              disabled={generatingPdf}
            >
              <MessageCircle className="w-4 h-4" />
              Enviar por WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Antes / Depois */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[
          { label: "Antes", accent: "bg-red-500", blocks: protocol.blocosAntes },
          { label: "Depois", accent: "bg-primary", blocks: protocol.blocosDepois },
        ].map((section) => (
          <Card key={section.label}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${section.accent}`} />
                {section.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!section.blocks || section.blocks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Sem conteúdo registado
                </p>
              ) : (
                section.blocks.map((block) =>
                  block.tipo === "texto" ? (
                    <p
                      key={block.id}
                      className="text-sm text-foreground/90 whitespace-pre-wrap bg-muted/30 p-3 rounded-lg border border-border"
                    >
                      {block.texto}
                    </p>
                  ) : (
                    <img
                      key={block.id}
                      src={block.imageUrl}
                      alt="Anexo do protocolo"
                      className="max-h-64 rounded-lg border border-border"
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Peças Trocadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {protocol.pecasTrocadas.map((peca) => (
              <div
                key={peca.id}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
              >
                <span className="text-foreground">{peca.name}</span>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {peca.code && <span>{peca.code}</span>}
                  <Badge className="bg-muted text-foreground hover:bg-accent">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirmar exclusão</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Tem a certeza que deseja apagar este protocolo? Esta ação não
              pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="bg-accent"
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
