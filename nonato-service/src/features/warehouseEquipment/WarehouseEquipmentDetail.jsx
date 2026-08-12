// src/features/warehouseEquipment/WarehouseEquipmentDetail.jsx
// Detalhe de um Equipamento do Armazém — histórico, documentos, fotos,
// itens inclusos (sequência de volumes para carga) e etiquetas imprimíveis.
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "../../firebase.jsx";
import JsBarcode from "jsbarcode";
import { compressImage } from "../../utils/imageCompression.js";
import { formatDateTime } from "../../utils/formatDate.js";
import {
  ArrowLeft,
  Edit2,
  Loader2,
  AlertTriangle,
  Barcode,
  Package,
  Hash,
  MapPin,
  Layers,
  History,
  FileText,
  Image as ImageIcon,
  Boxes,
  Printer,
  Plus,
  Trash2,
  Download,
  X,
  Wrench,
  Camera,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";

import { ESTADO_META } from "./ManageWarehouseEquipment.jsx";

const TIPO_EVENTO_OPTIONS = [
  "Entrada no Armazém",
  "Saída do Armazém",
  "Manutenção",
  "Reparação",
  "Inspeção",
  "Movimentação",
  "Outro",
];

const TABS = [
  { id: "historico", label: "Histórico", icon: History },
  { id: "documentos", label: "Documentos PDF", icon: FileText },
  { id: "fotos", label: "Álbum de Fotos", icon: ImageIcon },
  { id: "itens", label: "Itens Inclusos", icon: Boxes },
  { id: "etiquetas", label: "Etiquetas (carga)", icon: Printer },
];

const genId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;


const pad2 = (n) => String(n).padStart(2, "0");

// Código de barras (CODE128) desenhado em SVG — usado na etiqueta imprimível.
// Preto sobre branco sempre, independentemente do tema escuro da app.
const BarcodeImg = ({ value }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        width: 1.6,
        height: 38,
        displayValue: false,
        margin: 0,
        background: "#ffffff",
        lineColor: "#000000",
      });
    } catch (err) {
      console.error("Erro ao gerar código de barras:", err);
    }
  }, [value]);

  if (!value) return null;
  return <svg ref={svgRef} className="w-full max-w-[220px]" />;
};

const WarehouseEquipmentDetail = () => {
  const { equipmentId } = useParams();
  const navigate = useNavigate();

  const [equipment, setEquipment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("historico");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Histórico form
  const [histTipo, setHistTipo] = useState("Outro");
  const [histDescricao, setHistDescricao] = useState("");
  const [histResponsavel, setHistResponsavel] = useState("");
  const [histObservacoes, setHistObservacoes] = useState("");

  // Documentos
  const docInputRef = useRef(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docProgress, setDocProgress] = useState(0);

  // Fotos
  const fotoInputRef = useRef(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [fotoProgress, setFotoProgress] = useState(0);
  const [lightboxFoto, setLightboxFoto] = useState(null);

  // Itens Inclusos
  const [itemNome, setItemNome] = useState("");
  const itemImagemInputRef = useRef(null);
  const [addingItem, setAddingItem] = useState(false);

  // Delete confirmation (genérico para entradas de listas)
  const [deleteTarget, setDeleteTarget] = useState(null); // { kind, id, storagePath }

  const fetchEquipment = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const snap = await getDoc(doc(db, "equipamentosArmazem", equipmentId));
      if (!snap.exists()) {
        setError("Equipamento não encontrado");
        return;
      }
      setEquipment({ id: snap.id, ...snap.data() });
    } catch (err) {
      console.error("Erro ao carregar equipamento:", err);
      setError("Erro ao carregar equipamento. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [equipmentId]);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  const persist = useCallback(
    async (fields) => {
      setSaving(true);
      try {
        await updateDoc(doc(db, "equipamentosArmazem", equipmentId), {
          ...fields,
          updatedAt: new Date(),
        });
        setEquipment((prev) => ({ ...prev, ...fields }));
        return true;
      } catch (err) {
        console.error("Erro ao guardar alterações:", err);
        setError("Erro ao guardar alterações. Por favor, tente novamente.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [equipmentId]
  );

  const uploadToStorage = useCallback(
    (file, subfolder, onProgress) =>
      new Promise((resolve, reject) => {
        const safeName = file.name.replace(/[^a-zA-Z0-9_.\- ]/g, "_");
        const storagePath = `equipamentosArmazem/${equipmentId}/${subfolder}/${Date.now()}_${safeName}`;
        const storageRef = ref(storage, storagePath);
        const task = uploadBytesResumable(storageRef, file);
        task.on(
          "state_changed",
          (snap) => {
            if (onProgress) {
              onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
            }
          },
          (err) => reject(err),
          async () => {
            const url = await getDownloadURL(task.snapshot.ref);
            resolve({ url, storagePath });
          }
        );
      }),
    [equipmentId]
  );

  // ── FOTO PRINCIPAL (capa, mostrada na lista de equipamentos) ────────────
  const handleUploadFotoPerfil = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const compressed = await compressImage(file, { maxDimension: 1000, quality: 0.75 });
      const { url, storagePath } = await uploadToStorage(compressed, "capa");
      const oldStoragePath = equipment?.fotoPerfilStoragePath;
      const ok = await persist({ fotoPerfilUrl: url, fotoPerfilStoragePath: storagePath });
      if (ok && oldStoragePath && oldStoragePath !== storagePath) {
        try {
          await deleteObject(ref(storage, oldStoragePath));
        } catch {
          // foto antiga pode já não existir no storage
        }
      }
    } catch (err) {
      console.error("Erro ao enviar foto principal:", err);
      setError("Erro ao enviar a foto principal. Por favor, tente novamente.");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  // ── HISTÓRICO ──────────────────────────────────────────────────────────
  const historico = useMemo(
    () =>
      [...(equipment?.historico || [])].sort((a, b) => {
        const da = a.criadoEm?.toDate ? a.criadoEm.toDate() : new Date(a.criadoEm || 0);
        const db_ = b.criadoEm?.toDate ? b.criadoEm.toDate() : new Date(b.criadoEm || 0);
        return db_ - da;
      }),
    [equipment?.historico]
  );

  const handleAddHistorico = async () => {
    if (!histDescricao.trim()) {
      setError("A descrição do evento é obrigatória");
      return;
    }
    setError(null);
    const novoEvento = {
      id: genId(),
      tipo: histTipo,
      descricao: histDescricao.trim(),
      responsavel: histResponsavel.trim(),
      observacoes: histObservacoes.trim(),
      criadoEm: new Date(),
    };
    const ok = await persist({
      historico: [...(equipment?.historico || []), novoEvento],
    });
    if (ok) {
      setHistDescricao("");
      setHistResponsavel("");
      setHistObservacoes("");
      setHistTipo("Outro");
    }
  };

  const handleDeleteHistorico = async (id) => {
    await persist({
      historico: (equipment?.historico || []).filter((h) => h.id !== id),
    });
  };

  // ── DOCUMENTOS PDF ──────────────────────────────────────────────────────
  const handleUploadDoc = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    setDocProgress(0);
    try {
      const { url, storagePath } = await uploadToStorage(file, "documentos", setDocProgress);
      const novoDoc = {
        id: genId(),
        nome: file.name,
        url,
        storagePath,
        criadoEm: new Date(),
      };
      await persist({ documentos: [...(equipment?.documentos || []), novoDoc] });
    } catch (err) {
      console.error("Erro ao enviar documento:", err);
      setError("Erro ao enviar documento. Por favor, tente novamente.");
    } finally {
      setUploadingDoc(false);
      setDocProgress(0);
      if (docInputRef.current) docInputRef.current.value = "";
    }
  };

  const handleDeleteDoc = async (item) => {
    if (item.storagePath) {
      try {
        await deleteObject(ref(storage, item.storagePath));
      } catch {
        // ficheiro pode já não existir no storage
      }
    }
    await persist({
      documentos: (equipment?.documentos || []).filter((d) => d.id !== item.id),
    });
  };

  // ── ÁLBUM DE FOTOS ──────────────────────────────────────────────────────
  const handleUploadFotos = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadingFoto(true);
    try {
      const novasFotos = [];
      for (let i = 0; i < files.length; i++) {
        setFotoProgress(0);
        const { url, storagePath } = await uploadToStorage(files[i], "fotos", setFotoProgress);
        novasFotos.push({ id: genId(), url, storagePath, criadoEm: new Date() });
      }
      await persist({ fotos: [...(equipment?.fotos || []), ...novasFotos] });
    } catch (err) {
      console.error("Erro ao enviar fotos:", err);
      setError("Erro ao enviar fotos. Por favor, tente novamente.");
    } finally {
      setUploadingFoto(false);
      setFotoProgress(0);
      if (fotoInputRef.current) fotoInputRef.current.value = "";
    }
  };

  const handleDeleteFoto = async (item) => {
    if (item.storagePath) {
      try {
        await deleteObject(ref(storage, item.storagePath));
      } catch {
        // ficheiro pode já não existir no storage
      }
    }
    await persist({
      fotos: (equipment?.fotos || []).filter((f) => f.id !== item.id),
    });
    if (lightboxFoto?.id === item.id) setLightboxFoto(null);
  };

  // ── ITENS INCLUSOS (sequência de volumes) ────────────────────────────────
  const itensInclusos = equipment?.itensInclusos || [];
  const totalVolumes = 1 + itensInclusos.length;
  const equipmentCode = equipment?.equipmentCode || "";

  const volumeLabel = (seq) =>
    equipmentCode ? `${equipmentCode}-${pad2(seq)}` : `?-${pad2(seq)}`;

  const handleAddItem = async () => {
    if (!itemNome.trim()) {
      setError("O nome do item é obrigatório");
      return;
    }
    setError(null);
    setAddingItem(true);
    try {
      let imagemUrl = "";
      let storagePath = "";
      const file = itemImagemInputRef.current?.files?.[0];
      if (file) {
        const uploaded = await uploadToStorage(file, "itensInclusos");
        imagemUrl = uploaded.url;
        storagePath = uploaded.storagePath;
      }
      const novoItem = {
        id: genId(),
        nome: itemNome.trim(),
        imagemUrl,
        storagePath,
        criadoEm: new Date(),
      };
      const ok = await persist({ itensInclusos: [...itensInclusos, novoItem] });
      if (ok) {
        setItemNome("");
        if (itemImagemInputRef.current) itemImagemInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Erro ao adicionar item incluso:", err);
      setError("Erro ao adicionar item. Por favor, tente novamente.");
    } finally {
      setAddingItem(false);
    }
  };

  const handleDeleteItem = async (item) => {
    if (item.storagePath) {
      try {
        await deleteObject(ref(storage, item.storagePath));
      } catch {
        // ficheiro pode já não existir no storage
      }
    }
    await persist({
      itensInclusos: itensInclusos.filter((i) => i.id !== item.id),
    });
  };

  // ── ETIQUETAS (CARGA) ────────────────────────────────────────────────────
  const labels = useMemo(() => {
    const list = [
      {
        seq: 1,
        titulo: "Equipamento (máquina principal)",
        codigo: volumeLabel(1),
      },
    ];
    itensInclusos.forEach((item, idx) => {
      list.push({
        seq: idx + 2,
        titulo: item.nome,
        codigo: volumeLabel(idx + 2),
      });
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itensInclusos, equipmentCode]);

  const handlePrintLabels = () => {
    window.print();
  };

  // ── DELETE CONFIRM (genérico) ────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { kind, item } = deleteTarget;
    if (kind === "historico") await handleDeleteHistorico(item.id);
    else if (kind === "documento") await handleDeleteDoc(item);
    else if (kind === "foto") await handleDeleteFoto(item);
    else if (kind === "item") await handleDeleteItem(item);
    setDeleteTarget(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">
            {error || "Equipamento não encontrado"}
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => navigate("/app/warehouse-equipment")}
          className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  const meta = ESTADO_META[equipment.estado] || ESTADO_META.operacional;

  return (
    <div className="space-y-6 pb-24">
      {/* Estilos de impressão: só a área de etiquetas fica visível ao imprimir */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-labels-area, #print-labels-area * { visibility: visible; }
          #print-labels-area {
            position: absolute; top: 0; left: 0; width: 100%;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative group shrink-0">
            <Avatar className="h-14 w-14 sm:h-16 sm:w-16">
              <AvatarImage src={equipment.fotoPerfilUrl} alt={equipment.nome} />
              <AvatarFallback className="bg-zinc-700 text-white">
                <Wrench className="h-6 w-6 text-orange-400" />
              </AvatarFallback>
            </Avatar>
            <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              {uploadingPhoto ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Camera className="w-5 h-5 text-white" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadFotoPerfil}
                disabled={uploadingPhoto}
                className="hidden"
              />
            </label>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
              {equipment.familyName ? `${equipment.familyName} — ` : ""}
              {equipment.nome || "Equipamento"}
            </h1>
            <p className="text-sm text-zinc-400">
              {equipment.marca} {equipment.modelo}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => navigate(`/app/edit-warehouse-equipment/${equipmentId}`)}
            className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-900"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Editar</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/app/warehouse-equipment")}
            className="h-10 w-10 rounded-full border-zinc-700 text-white hover:bg-green-700 bg-green-600"
          >
            <ArrowLeft className="h-4 w-4 text-white" />
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      {/* Informações Básicas */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-white">Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {equipment.equipmentCode && (
              <div className="flex items-center gap-2 text-zinc-300 text-sm">
                <Barcode className="h-4 w-4 text-zinc-400 shrink-0" />
                <span className="text-zinc-400">ID:</span> {equipment.equipmentCode}
              </div>
            )}
            {equipment.marca && (
              <div className="flex items-center gap-2 text-zinc-300 text-sm">
                <Package className="h-4 w-4 text-zinc-400 shrink-0" />
                <span className="text-zinc-400">Marca:</span> {equipment.marca}
              </div>
            )}
            {equipment.numeroSerie && (
              <div className="flex items-center gap-2 text-zinc-300 text-sm">
                <Hash className="h-4 w-4 text-zinc-400 shrink-0" />
                <span className="text-zinc-400">Nº de Série:</span> {equipment.numeroSerie}
              </div>
            )}
            {equipment.familyName && (
              <div className="flex items-center gap-2 text-zinc-300 text-sm">
                <Layers className="h-4 w-4 text-zinc-400 shrink-0" />
                <span className="text-zinc-400">Família:</span> {equipment.familyName}
                {equipment.groupName ? ` / ${equipment.groupName}` : ""}
              </div>
            )}
            {equipment.localizacao && (
              <div className="flex items-center gap-2 text-zinc-300 text-sm">
                <MapPin className="h-4 w-4 text-zinc-400 shrink-0" />
                <span className="text-zinc-400">Localização:</span> {equipment.localizacao}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Wrench className="h-4 w-4 text-zinc-400 shrink-0" />
              <span className="text-zinc-400">Status:</span>
              <Badge className={`${meta.className} border`}>{meta.label}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg border text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "bg-green-600 border-green-600 text-white"
                : "border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── HISTÓRICO ── */}
      {activeTab === "historico" && (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Histórico do Equipamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-700">
              <h3 className="text-sm font-medium text-white">
                Adicionar Evento ao Histórico
              </h3>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Tipo de Evento</label>
                <Select value={histTipo} onValueChange={setHistTipo}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                    {TIPO_EVENTO_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Descrição *</label>
                <Textarea
                  value={histDescricao}
                  onChange={(e) => setHistDescricao(e.target.value)}
                  placeholder="Descreva o evento..."
                  className="bg-zinc-800 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Responsável</label>
                <Input
                  value={histResponsavel}
                  onChange={(e) => setHistResponsavel(e.target.value)}
                  placeholder="Nome do responsável"
                  className="bg-zinc-800 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Observações</label>
                <Textarea
                  value={histObservacoes}
                  onChange={(e) => setHistObservacoes(e.target.value)}
                  placeholder="Observações adicionais..."
                  className="bg-zinc-800 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                />
              </div>
              <Button
                onClick={handleAddHistorico}
                disabled={saving}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Adicionar ao Histórico
              </Button>
            </div>

            {historico.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-4">
                Nenhum evento registado ainda.
              </p>
            ) : (
              <div className="space-y-2">
                {historico.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 bg-zinc-700/30 rounded-lg border border-zinc-600"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="outline" className="border-zinc-600 text-zinc-300 text-xs">
                            {h.tipo}
                          </Badge>
                          <span className="text-xs text-zinc-500">
                            {formatDateTime(h.criadoEm)}
                          </span>
                        </div>
                        <p className="text-sm text-white">{h.descricao}</p>
                        {h.responsavel && (
                          <p className="text-xs text-zinc-400 mt-1">
                            Responsável: {h.responsavel}
                          </p>
                        )}
                        {h.observacoes && (
                          <p className="text-xs text-zinc-500 mt-1">{h.observacoes}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget({ kind: "historico", item: h })}
                        className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-400/10 shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── DOCUMENTOS PDF ── */}
      {activeTab === "documentos" && (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">Documentos PDF</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 p-4 bg-zinc-900/50 rounded-lg border border-zinc-700">
              <label className="text-sm font-medium text-white">
                Adicionar Documento PDF
              </label>
              <p className="text-sm text-zinc-400">Selecione um ficheiro PDF:</p>
              <input
                ref={docInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleUploadDoc}
                disabled={uploadingDoc}
                className="block w-full text-sm text-zinc-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-zinc-700 file:text-white hover:file:bg-zinc-600"
              />
              {uploadingDoc && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>A enviar...</span>
                    <span>{docProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${docProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {(equipment.documentos || []).length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-6">
                Nenhum documento PDF cadastrado.
              </p>
            ) : (
              <div className="space-y-2">
                {equipment.documentos.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between gap-3 p-3 bg-zinc-700/30 rounded-lg border border-zinc-600"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-red-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">{d.nome}</p>
                        <p className="text-xs text-zinc-500">{formatDateTime(d.criadoEm)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(d.url, "_blank")}
                        className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-700"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget({ kind: "documento", item: d })}
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── ÁLBUM DE FOTOS ── */}
      {activeTab === "fotos" && (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">Álbum de Fotos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 p-4 bg-zinc-900/50 rounded-lg border border-zinc-700">
              <label className="text-sm font-medium text-white">
                Adicionar Foto ao Álbum
              </label>
              <input
                ref={fotoInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleUploadFotos}
                disabled={uploadingFoto}
                className="block w-full text-sm text-zinc-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-zinc-700 file:text-white hover:file:bg-zinc-600"
              />
              {uploadingFoto && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>A enviar...</span>
                    <span>{fotoProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${fotoProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {(equipment.fotos || []).length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-6">
                Nenhuma foto no álbum.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {equipment.fotos.map((f) => (
                  <div
                    key={f.id}
                    className="group relative aspect-square rounded-lg overflow-hidden border border-zinc-700 cursor-pointer"
                    onClick={() => setLightboxFoto(f)}
                  >
                    <img
                      src={f.url}
                      alt="Foto do equipamento"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ kind: "foto", item: f });
                      }}
                      className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-black/60 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── ITENS INCLUSOS ── */}
      {activeTab === "itens" && (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Itens que Vieram com o Equipamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-700 space-y-1">
              <p className="text-sm font-medium text-green-400">
                Sequência de volumes (carga)
              </p>
              <p className="text-sm text-zinc-400">
                A máquina é sempre o volume 1. Cada item incluso que
                adicionares soma mais um volume à carga, com etiqueta gerada
                automaticamente a partir do ID do equipamento.
              </p>
              <p className="text-sm text-white pt-1">
                Total de volumes: <span className="text-green-400 font-semibold">{totalVolumes}</span>
              </p>
              {!equipmentCode && (
                <p className="text-xs text-yellow-400 pt-1">
                  Define o &ldquo;ID do Equipamento&rdquo; em Editar para as etiquetas
                  ficarem completas.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-green-900/20 rounded-lg border border-green-700/40">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">
                    {pad2(1)}/{pad2(totalVolumes)} · Equipamento (máquina principal)
                  </p>
                  <p className="text-xs text-zinc-400 truncate">
                    {equipment.familyName || equipment.categoria || "Equipamento"}
                    {equipment.modelo ? ` — ${equipment.modelo}` : ""}
                    {equipment.marca ? ` · ${equipment.marca}` : ""}
                    {equipment.numeroSerie ? ` · S/N ${equipment.numeroSerie}` : ""}
                  </p>
                </div>
                <Badge variant="outline" className="border-green-700 text-green-400 shrink-0">
                  {volumeLabel(1)}
                </Badge>
              </div>

              {itensInclusos.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 p-3 bg-zinc-700/30 rounded-lg border border-zinc-600"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.imagemUrl && (
                      <img
                        src={item.imagemUrl}
                        alt={item.nome}
                        className="h-10 w-10 rounded object-cover shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {pad2(idx + 2)}/{pad2(totalVolumes)} · {item.nome}
                      </p>
                      <Badge variant="outline" className="border-zinc-600 text-zinc-400 text-xs mt-1">
                        {volumeLabel(idx + 2)}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget({ kind: "item", item })}
                    className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-3 p-4 bg-zinc-900/50 rounded-lg border border-zinc-700">
              <label className="text-sm font-medium text-white">Adicionar Item</label>
              <Input
                value={itemNome}
                onChange={(e) => setItemNome(e.target.value)}
                placeholder="Por favor, digite o nome do item."
                className="bg-zinc-800 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
              />
              <div className="space-y-1">
                <label className="text-xs text-zinc-400">Anexar Imagem (opcional)</label>
                <input
                  ref={itemImagemInputRef}
                  type="file"
                  accept="image/*"
                  className="block w-full text-sm text-zinc-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-zinc-700 file:text-white hover:file:bg-zinc-600"
                />
              </div>
              <Button
                onClick={handleAddItem}
                disabled={addingItem}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {addingItem ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Adicionar Item
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── ETIQUETAS (CARGA) ── */}
      {activeTab === "etiquetas" && (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">Etiquetas (carga)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-400">
              As etiquetas seguem automaticamente a sequência de volumes.
              Imprime e cola em cada volume antes da carga no camião.
            </p>

            <div className="flex items-center justify-between flex-wrap gap-2">
              <Button
                onClick={handlePrintLabels}
                disabled={!equipmentCode}
                className="bg-green-600 hover:bg-green-700"
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir etiquetas
              </Button>
              <span className="text-sm text-zinc-400">
                Total de volumes: <span className="text-white">{totalVolumes}</span>
              </span>
            </div>

            {!equipmentCode && (
              <Alert variant="destructive" className="border-yellow-500/40 bg-yellow-500/10">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-yellow-400">
                  Define o &ldquo;ID do Equipamento&rdquo; (em Editar) antes de
                  imprimir etiquetas.
                </AlertDescription>
              </Alert>
            )}

            <p className="text-sm text-zinc-500">
              Resumo: ID {equipmentCode || "—"} · Volumes: {totalVolumes} · S/N:{" "}
              {equipment.numeroSerie || "—"}
            </p>

            {/* Pré-visualização (também é a área usada para impressão) —
                etiqueta simples: fundo branco, texto preto, código de
                barras, para imprimir e colar diretamente no volume. */}
            <div id="print-labels-area" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {labels.map((label) => (
                <div
                  key={label.seq}
                  className="border border-black rounded-md p-4 bg-white text-black break-inside-avoid"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-zinc-600">
                        ID Equipamento
                      </p>
                      <p className="text-xl font-bold leading-tight">
                        {equipmentCode || "—"}
                      </p>
                    </div>
                    <p className="text-sm font-semibold shrink-0">
                      {pad2(label.seq)}/{pad2(totalVolumes)}
                    </p>
                  </div>

                  <p className="text-xs text-zinc-700 mt-1">{label.titulo}</p>

                  {(equipment.marca || equipment.modelo) && (
                    <p className="text-xs text-zinc-700">
                      {equipment.marca} {equipment.modelo}
                    </p>
                  )}
                  {equipment.numeroSerie && (
                    <p className="text-xs text-zinc-700">
                      S/N: {equipment.numeroSerie}
                    </p>
                  )}

                  <div className="mt-2 flex flex-col items-center">
                    <BarcodeImg value={label.codigo} />
                    <p className="text-[10px] tracking-widest mt-0.5">{label.codigo}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lightbox de foto */}
      <Dialog open={!!lightboxFoto} onOpenChange={(open) => !open && setLightboxFoto(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center justify-between">
              Foto
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLightboxFoto(null)}
                className="text-zinc-400 hover:text-white h-7 w-7"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          {lightboxFoto && (
            <img
              src={lightboxFoto.url}
              alt="Foto do equipamento"
              className="w-full max-h-[70vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar exclusão</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem a certeza que deseja remover este registo? Esta ação não
              pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="border-zinc-700 text-white hover:text-white hover:bg-zinc-700 bg-zinc-600"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WarehouseEquipmentDetail;
