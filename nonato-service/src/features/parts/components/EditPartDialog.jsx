// EditPartDialog.jsx
// Editar nome, descrição e imagem de uma peça do catálogo HOMAG. As
// alterações ficam na coleção "pecasEditadas" (ver services/partEdits.js) e
// são aplicadas por cima do catálogo estático — o JSON nunca é alterado.
// O código não é editável: é ele que liga a peça ao catálogo, às categorias
// e aos orçamentos.

import { useState, useEffect, useRef } from "react";
import {
  savePartEdit,
  resetPartEdit,
  uploadPartImage,
} from "../../../services/partEdits.js";
import { Loader2, Pencil, Upload, RotateCcw, Package, X } from "lucide-react";

import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";

const EditPartDialog = ({ open, onOpenChange, part, onSaved }) => {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [imagem, setImagem] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (open && part) {
      setNome(part.nome || "");
      setDescricao(part.descricao || "");
      setImagem(part.imagem || "");
      setImageFailed(false);
      setError(null);
    }
  }, [open, part]);

  // Valores tal como estão no catálogo, sem edições — para só guardar o que
  // mudou de facto.
  const original = part?.original || {
    nome: part?.nome || "",
    imagem: part?.imagem || "",
    descricao: part?.descricao || "",
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !part) return;
    if (!file.type.startsWith("image/")) {
      setError("O ficheiro escolhido não é uma imagem.");
      return;
    }
    try {
      setUploading(true);
      setError(null);
      const url = await uploadPartImage(part.codigo, file);
      setImagem(url);
      setImageFailed(false);
    } catch (err) {
      console.error("Erro ao carregar imagem da peça:", err);
      setError("A imagem não foi carregada. Verifique a ligação e tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!part) return;
    const nomeLimpo = nome.replace(/\s+/g, " ").trim();
    if (!nomeLimpo) {
      setError("O nome da peça não pode ficar vazio.");
      return;
    }

    const changes = {};
    if (nomeLimpo !== original.nome) changes.nome = nomeLimpo;
    if (descricao.trim() !== (original.descricao || "")) {
      changes.descricao = descricao.trim();
    }
    if (imagem.trim() !== (original.imagem || "")) {
      changes.imagem = imagem.trim();
    }

    try {
      setSaving(true);
      setError(null);
      if (Object.keys(changes).length === 0) {
        // Tudo igual ao catálogo: se havia edições, deixam de fazer falta.
        if (part.editada) await resetPartEdit(part.codigo);
      } else {
        await savePartEdit(part.codigo, changes);
      }
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      console.error("Erro ao guardar alterações da peça:", err);
      setError("As alterações não foram guardadas. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!part) return;
    try {
      setSaving(true);
      setError(null);
      await resetPartEdit(part.codigo);
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      console.error("Erro ao repor peça original:", err);
      setError("Não foi possível repor o original. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || uploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-800 border-zinc-700 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Pencil className="h-4 w-4 text-green-500" />
            Editar Peça
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Código {part?.codigo}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="border-red-500 bg-red-500/10">
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Nome</label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="bg-zinc-900 border-zinc-700 text-white"
            />
            {part?.editada && original.nome !== nome.trim() && (
              <p className="text-xs text-zinc-500">
                No catálogo: {original.nome}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Descrição</label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              placeholder="Notas, medidas, equivalências…"
              className="bg-zinc-900 border-zinc-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Imagem</label>
            <div className="flex gap-3 items-start">
              <div className="h-20 w-20 rounded-lg overflow-hidden bg-zinc-700 flex items-center justify-center flex-shrink-0">
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                ) : imagem && !imageFailed ? (
                  <img
                    src={imagem}
                    alt={nome}
                    className="h-full w-full object-cover"
                    onError={() => setImageFailed(true)}
                  />
                ) : (
                  <Package className="h-8 w-8 text-zinc-500" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-zinc-700 border-zinc-600 text-white hover:bg-zinc-600 hover:text-white"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Carregar fotografia
                  </Button>
                  {imagem && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => setImagem("")}
                      className="text-zinc-400 hover:text-white hover:bg-zinc-700"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Tirar imagem
                    </Button>
                  )}
                </div>
                <Input
                  value={imagem}
                  onChange={(e) => {
                    setImagem(e.target.value);
                    setImageFailed(false);
                  }}
                  placeholder="Ou cole o endereço de uma imagem"
                  className="bg-zinc-900 border-zinc-700 text-white text-xs"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFile}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {part?.editada && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleReset}
              disabled={busy}
              className="text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 sm:mr-auto"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Repor original
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-zinc-700 text-white hover:text-white hover:bg-zinc-700 bg-zinc-600"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={busy}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditPartDialog;
