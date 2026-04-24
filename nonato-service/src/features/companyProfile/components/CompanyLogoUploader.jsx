import { useState } from "react";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage } from "../../../firebase";
import { Camera, X, Loader2, AlertTriangle } from "lucide-react";

/**
 * Upload de logo da empresa para o Firebase Storage.
 *
 * Propaga as alterações para o componente-pai através de `onLogoChange(url, path)`.
 * - url: URL pública para apresentação (getDownloadURL)
 * - path: caminho no bucket para permitir substituir/apagar mais tarde
 */
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const CompanyLogoUploader = ({
  logoUrl,
  logoStoragePath,
  onLogoChange,
  disabled = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE_BYTES) {
      setError("O logo deve ter menos de 5 MB");
      e.target.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Apenas ficheiros de imagem são permitidos");
      e.target.value = "";
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Gera um caminho único (evita colisões e permite manter histórico se quiseres)
      const extension = file.name.split(".").pop()?.toLowerCase() || "png";
      const newPath = `companyProfile/logo_${Date.now()}.${extension}`;
      const newRef = ref(storage, newPath);

      await uploadBytes(newRef, file, { contentType: file.type });
      const downloadUrl = await getDownloadURL(newRef);

      // Tenta apagar o logo anterior, se existir (não bloqueante)
      if (logoStoragePath) {
        try {
          await deleteObject(ref(storage, logoStoragePath));
        } catch {
          // Se o ficheiro antigo já não existir, ignora.
        }
      }

      onLogoChange(downloadUrl, newPath);
    } catch (err) {
      console.error("Erro no upload do logo:", err);
      setError("Falha ao fazer upload do logo");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    setError(null);
    // Tenta apagar do Storage se tivermos o path; não falha se não conseguir.
    if (logoStoragePath) {
      try {
        await deleteObject(ref(storage, logoStoragePath));
      } catch {
        // Ignora — o utilizador pode ter apagado manualmente no console.
      }
    }
    onLogoChange("", "");
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 p-3">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <span className="text-sm text-red-400">{error}</span>
        </div>
      )}

      <div className="flex items-start gap-4">
        {logoUrl ? (
          <div className="group relative h-32 w-32 shrink-0">
            <img
              src={logoUrl}
              alt="Logo da empresa"
              className="h-full w-full rounded-lg border border-zinc-700 bg-white/5 object-contain p-2"
            />
            <button
              type="button"
              onClick={handleRemoveLogo}
              disabled={disabled || isUploading}
              className="absolute -top-2 -right-2 rounded-full bg-red-600 p-1 text-white shadow-md transition hover:bg-red-700 disabled:opacity-50"
              aria-label="Remover logo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label
            className={`flex h-32 w-32 shrink-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-600 bg-zinc-800/60 text-zinc-400 transition hover:border-green-500/60 hover:text-green-400 ${
              disabled || isUploading ? "pointer-events-none opacity-50" : ""
            }`}
          >
            {isUploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-green-500" />
            ) : (
              <>
                <Camera className="h-6 w-6" />
                <span className="text-xs">Carregar logo</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              disabled={disabled || isUploading}
              className="hidden"
            />
          </label>
        )}

        <div className="space-y-1 pt-1 text-sm text-zinc-400">
          <p>Formatos suportados: PNG, JPG, SVG ou WebP.</p>
          <p>Tamanho máximo: 5 MB.</p>
          <p>
            O logo aparece no cabeçalho dos PDFs (orçamentos, OS, comprovantes,
            dados bancários).
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompanyLogoUploader;
