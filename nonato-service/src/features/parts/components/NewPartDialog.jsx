// NewPartDialog.jsx
// Criar uma peça nova na Biblioteca de Peças. Não vai para o catálogo
// estático (JSON): fica na coleção "pecasCriadas" (services/createdParts.js)
// e é junta ao catálogo ao carregar. O código tem de ser único — não pode
// repetir um código do catálogo HOMAG nem de outra peça criada.

import { useEffect, useRef, useState } from "react";
import { Loader2, Package, Plus, Upload, X } from "lucide-react";
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
import { Field, InputField } from "../../../components/app";
import { useAuth } from "../../../hooks/useAuth";
import { loadPartsCatalog } from "../../../utils/partsCatalogLoader.js";
import { uploadPartImage } from "../../../services/partEdits.js";
import { createPart } from "../../../services/createdParts.js";

const NewPartDialog = ({ open, onOpenChange, onCreated }) => {
  const { user } = useAuth();
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [relacionados, setRelacionados] = useState("");
  const [imagem, setImagem] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setCodigo("");
    setNome("");
    setDescricao("");
    setRelacionados("");
    setImagem("");
    setImageFailed(false);
    setError(null);
  }, [open]);

  const cleanCode = codigo.replace(/\s+/g, "").trim();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("O ficheiro escolhido não é uma imagem.");
      return;
    }
    if (!cleanCode) {
      setError("Escreva primeiro o código da peça (a fotografia fica guardada com ele).");
      return;
    }
    try {
      setUploading(true);
      setError(null);
      setImagem(await uploadPartImage(cleanCode, file));
      setImageFailed(false);
    } catch (err) {
      console.error("Erro ao carregar imagem da peça:", err);
      setError("A imagem não foi carregada. Verifique a ligação e tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const nomeLimpo = nome.replace(/\s+/g, " ").trim();
    if (!cleanCode) return setError("O código da peça é obrigatório.");
    if (!nomeLimpo) return setError("O nome da peça é obrigatório.");
    try {
      setSaving(true);
      setError(null);
      // Código repetido? (catálogo HOMAG + peças já criadas)
      const { pecas } = await loadPartsCatalog();
      const lower = cleanCode.toLowerCase();
      const clash = pecas.find((p) => String(p.codigo).toLowerCase() === lower);
      if (clash) {
        setError(`Já existe uma peça com o código ${clash.codigo}: “${clash.nome}”.`);
        return;
      }
      await createPart(
        {
          codigo: cleanCode,
          nome: nomeLimpo,
          descricao,
          imagem: imagem.trim(),
          codigosRelacionados: relacionados
            .split(/[,;\n]/)
            .map((c) => c.trim())
            .filter(Boolean),
        },
        user?.displayName || user?.email || ""
      );
      onCreated?.(cleanCode);
      onOpenChange(false);
    } catch (err) {
      console.error("Erro ao criar a peça:", err);
      setError(err.message?.startsWith("Já existe") ? err.message : "A peça não foi criada. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || uploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Nova peça
          </DialogTitle>
          <DialogDescription>
            Fica na Biblioteca de Peças junto com o catálogo HOMAG e pode ser usada em orçamentos, ordens e documentos.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <InputField
            label="Código"
            required
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Ex.: 4008010048"
            inputClassName="font-mono"
            hint="Tem de ser único. Não se pode alterar depois."
            autoFocus
          />
          <InputField
            label="Nome"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Correia dentada HTD 8M-1200"
          />
          <Field label="Descrição">
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              placeholder="Notas, medidas, equivalências…"
            />
          </Field>
          <InputField
            label="Códigos relacionados"
            value={relacionados}
            onChange={(e) => setRelacionados(e.target.value)}
            placeholder="Separados por vírgulas (opcional)"
            hint="Outros códigos pelos quais esta peça também deve aparecer na pesquisa."
          />

          <Field label="Imagem">
            <div className="flex items-start gap-3">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : imagem && !imageFailed ? (
                  <img src={imagem} alt={nome} className="h-full w-full object-cover" onError={() => setImageFailed(true)} />
                ) : (
                  <Package className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4" />
                    Carregar fotografia
                  </Button>
                  {imagem && (
                    <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setImagem("")}>
                      <X className="h-4 w-4" />
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
                  className="text-xs"
                />
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              </div>
            </div>
          </Field>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={busy || !cleanCode || !nome.trim()}>
            {saving ? <Loader2 className="animate-spin" /> : <Plus />}
            Criar peça
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewPartDialog;
