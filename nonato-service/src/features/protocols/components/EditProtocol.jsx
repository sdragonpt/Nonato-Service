// EditProtocol.jsx - Editor de blocos (texto/imagem) para Antes/Depois + peças trocadas
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "../../../firebase.jsx";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Save,
  Plus,
  Type,
  Image as ImageIcon,
  Trash2,
  Eye,
  Wrench,
  FileCheck,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";

let blockIdCounter = 0;
const nextBlockId = () => `blk_${Date.now()}_${++blockIdCounter}`;

/** Secção reutilizável (Antes / Depois) com blocos de texto e imagem. */
const BlockSection = ({ title, accent, blocks, onChange, protocolId }) => {
  const fileInputRef = useRef(null);
  const [uploadingId, setUploadingId] = useState(null);

  const addTextBlock = () => {
    onChange([...blocks, { id: nextBlockId(), tipo: "texto", texto: "" }]);
  };

  const updateTextBlock = (id, texto) => {
    onChange(blocks.map((b) => (b.id === id ? { ...b, texto } : b)));
  };

  const removeBlock = async (block) => {
    if (block.tipo === "imagem" && block.storagePath) {
      try {
        await deleteObject(ref(storage, block.storagePath));
      } catch {
        // ficheiro pode já não existir
      }
    }
    onChange(blocks.filter((b) => b.id !== block.id));
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem deve ter menos de 5MB");
      return;
    }

    const blockId = nextBlockId();
    setUploadingId(blockId);

    const safeName = file.name.replace(/[^a-zA-Z0-9_\-. ]/g, "_");
    const storagePath = `protocolos/${protocolId}/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, storagePath);
    const task = uploadBytesResumable(storageRef, file);

    task.on(
      "state_changed",
      null,
      (err) => {
        console.error("Erro ao enviar imagem:", err);
        setUploadingId(null);
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        onChange([
          ...blocks,
          { id: blockId, tipo: "imagem", imageUrl: url, storagePath },
        ]);
        setUploadingId(null);
      }
    );
  };

  return (
    <Card className="bg-zinc-800 border-zinc-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={`text-lg text-white flex items-center gap-2`}>
            <span className={`h-2.5 w-2.5 rounded-full ${accent}`} />
            {title}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addTextBlock}
              className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-900"
            >
              <Type className="w-4 h-4 mr-2" />
              Texto
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={!!uploadingId}
              className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-900"
            >
              {uploadingId ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ImageIcon className="w-4 h-4 mr-2" />
              )}
              Imagem
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {blocks.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-6">
            Sem blocos ainda — adicione texto ou imagens acima
          </p>
        ) : (
          blocks.map((block) => (
            <div
              key={block.id}
              className="p-3 bg-zinc-700/30 rounded-lg border border-zinc-600 relative"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeBlock(block)}
                className="absolute top-2 right-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 h-7 w-7"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              {block.tipo === "texto" ? (
                <Textarea
                  value={block.texto}
                  onChange={(e) => updateTextBlock(block.id, e.target.value)}
                  placeholder="Descreva o estado, observações ou intervenção..."
                  rows={3}
                  className="bg-zinc-900 border-zinc-700 text-white pr-8 [&::placeholder]:text-zinc-500"
                />
              ) : (
                <img
                  src={block.imageUrl}
                  alt="Anexo do protocolo"
                  className="max-h-64 rounded-lg border border-zinc-600"
                />
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

const EditProtocol = () => {
  const { protocolId } = useParams();
  const navigate = useNavigate();

  const [protocol, setProtocol] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

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

  const updateField = (field, value) => {
    setProtocol((prev) => ({ ...prev, [field]: value }));
  };

  const addPeca = () => {
    setProtocol((prev) => ({
      ...prev,
      pecasTrocadas: [
        ...(prev.pecasTrocadas || []),
        { id: nextBlockId(), name: "", code: "", quantity: 1 },
      ],
    }));
  };

  const updatePeca = (id, patch) => {
    setProtocol((prev) => ({
      ...prev,
      pecasTrocadas: prev.pecasTrocadas.map((p) =>
        p.id === id ? { ...p, ...patch } : p
      ),
    }));
  };

  const removePeca = (id) => {
    setProtocol((prev) => ({
      ...prev,
      pecasTrocadas: prev.pecasTrocadas.filter((p) => p.id !== id),
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSaved(false);

      await updateDoc(doc(db, "protocolosServico", protocolId), {
        title: protocol.title || "",
        status: protocol.status || "rascunho",
        blocosAntes: protocol.blocosAntes || [],
        blocosDepois: protocol.blocosDepois || [],
        pecasTrocadas: protocol.pecasTrocadas || [],
        updatedAt: new Date(),
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Erro ao guardar protocolo:", err);
      setError("Erro ao guardar protocolo.");
    } finally {
      setSaving(false);
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
          <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
            <FileCheck className="h-5 w-5 text-green-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
              Editar Protocolo
            </h1>
            <p className="text-sm text-zinc-400 truncate">
              {protocol.clientName}
              {protocol.equipmentName ? ` · ${protocol.equipmentName}` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/app/protocol/${protocolId}`)}
            className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800"
          >
            <Eye className="w-4 h-4 mr-2" />
            Pré-visualizar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Guardar
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}
      {saved && (
        <Alert className="border-green-600 bg-green-600/10">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-400">
            Protocolo guardado com sucesso.
          </AlertDescription>
        </Alert>
      )}

      {/* Título e Estado */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 space-y-2">
            <label className="text-sm font-medium text-zinc-400">Título</label>
            <Input
              value={protocol.title || ""}
              onChange={(e) => updateField("title", e.target.value)}
              className="bg-zinc-900 border-zinc-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Estado</label>
            <Select
              value={protocol.status || "rascunho"}
              onValueChange={(value) => updateField("status", value)}
            >
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="rascunho" className="text-white hover:bg-zinc-700">
                  Rascunho
                </SelectItem>
                <SelectItem value="concluido" className="text-white hover:bg-zinc-700">
                  Concluído
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Antes / Depois */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BlockSection
          title="Antes"
          accent="bg-red-500"
          blocks={protocol.blocosAntes || []}
          onChange={(blocks) => updateField("blocosAntes", blocks)}
          protocolId={protocolId}
        />
        <BlockSection
          title="Depois"
          accent="bg-green-500"
          blocks={protocol.blocosDepois || []}
          onChange={(blocks) => updateField("blocosDepois", blocks)}
          protocolId={protocolId}
        />
      </div>

      {/* Peças Trocadas */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Peças Trocadas
              <Badge className="bg-zinc-700 text-white hover:bg-zinc-700">
                {(protocol.pecasTrocadas || []).length}
              </Badge>
            </CardTitle>
            <Button
              type="button"
              size="sm"
              onClick={addPeca}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Peça
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {(protocol.pecasTrocadas || []).length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">
              Nenhuma peça registada
            </p>
          ) : (
            (protocol.pecasTrocadas || []).map((peca) => (
              <div key={peca.id} className="flex flex-wrap gap-2 items-center">
                <Input
                  value={peca.name}
                  onChange={(e) => updatePeca(peca.id, { name: e.target.value })}
                  placeholder="Nome da peça"
                  className="bg-zinc-900 border-zinc-700 text-white flex-1 min-w-[160px]"
                />
                <Input
                  value={peca.code}
                  onChange={(e) => updatePeca(peca.id, { code: e.target.value })}
                  placeholder="Código"
                  className="bg-zinc-900 border-zinc-700 text-white w-32"
                />
                <Input
                  type="number"
                  min="1"
                  value={peca.quantity}
                  onChange={(e) =>
                    updatePeca(peca.id, { quantity: parseInt(e.target.value) || 1 })
                  }
                  className="bg-zinc-900 border-zinc-700 text-white w-20"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removePeca(peca.id)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-green-600 hover:bg-green-700"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            A guardar...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Guardar Protocolo
          </>
        )}
      </Button>
    </div>
  );
};

export default EditProtocol;
