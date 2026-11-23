// ManualPartAdder.jsx
// "Peça fora do catálogo" nos Orçamentos de Peças: peças que não temos no
// catálogo (pedidas a um fornecedor — ver Pedidos de Orçamento Avulsos).
// Cria um item { avulsa: true, name, marca, code, image, quantity, price }
// que entra no orçamento como os outros (margem, portes, IVA, PDF).

import { useRef, useState } from "react";
import { Camera, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { uploadPartImage } from "../../../services/partEdits.js";

export const newManualPart = ({ name = "", marca = "", code = "", image = "", quantity = 1 } = {}) => ({
  id: `avulsa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  avulsa: true,
  name,
  marca,
  code,
  image: image || null,
  imageHash: null,
  quantity: Math.max(1, parseInt(quantity, 10) || 1),
  price: "",
});

const ManualPartAdder = ({ onAdd }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [marca, setMarca] = useState("");
  const [code, setCode] = useState("");
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const reset = () => {
    setName("");
    setMarca("");
    setCode("");
    setImage("");
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    try {
      setUploading(true);
      setImage(await uploadPartImage(`avulsa-${Date.now()}`, file));
    } catch (err) {
      console.error("Erro ao carregar a fotografia:", err);
    } finally {
      setUploading(false);
    }
  };

  const add = () => {
    if (!name.trim() && !code.trim()) return;
    onAdd(newManualPart({ name: name.trim() || code.trim(), marca: marca.trim(), code: code.trim(), image }));
    reset();
    setOpen(false);
  };

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} className="border-dashed">
        <Plus className="h-4 w-4" />
        Peça fora do catálogo
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
      <p className="text-sm font-medium">Peça fora do catálogo</p>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground hover:ring-2 hover:ring-primary/40"
          title="Carregar fotografia (opcional)"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : image ? (
            <img src={image} alt="" className="h-full w-full bg-white object-contain p-1" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-[1fr_9rem_9rem]">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome / descrição da peça" autoFocus />
          <Input value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Marca" />
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Referência" className="font-mono" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            reset();
            setOpen(false);
          }}
        >
          <X className="h-4 w-4" /> Cancelar
        </Button>
        <Button type="button" size="sm" onClick={add} disabled={uploading || (!name.trim() && !code.trim())}>
          <Plus className="h-4 w-4" /> Adicionar peça
        </Button>
      </div>
    </div>
  );
};

export default ManualPartAdder;
