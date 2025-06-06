// PartImage.jsx - Componente inteligente para imagens (Biblioteca + Legacy)

import React, { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { Package } from "lucide-react";

const PartImage = ({
  src, // Campo image legacy (sistema antigo)
  imageHash, // Nova referência da biblioteca (sistema novo)
  alt = "Peça",
  className = "",
  fallbackClassName = "",
  showIcon = true,
  showLibraryIndicator = false, // ✅ NOVO: Controla se mostra ♻️
  ...props
}) => {
  const [currentSrc, setCurrentSrc] = useState("");
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFromLibrary, setIsLoadingFromLibrary] = useState(false);

  // ✅ FUNÇÃO para carregar imagem da biblioteca
  const loadImageFromLibrary = async (hash) => {
    try {
      if (!hash) return null;

      console.log("🖼️ Carregando da biblioteca:", hash.substring(0, 8) + "...");

      const imageRef = doc(db, "image_library", hash);
      const imageDoc = await getDoc(imageRef);

      if (imageDoc.exists()) {
        return imageDoc.data().data;
      }
      return null;
    } catch (error) {
      console.error("❌ Erro ao carregar imagem da biblioteca:", error);
      return null;
    }
  };

  // ✅ EFFECT para determinar qual imagem usar
  useEffect(() => {
    const determineImageSource = async () => {
      setHasError(false);

      // 1. PRIORIDADE: Nova biblioteca (imageHash)
      if (imageHash) {
        setIsLoadingFromLibrary(true);
        try {
          const libraryImage = await loadImageFromLibrary(imageHash);
          if (libraryImage) {
            console.log("✅ Imagem carregada da biblioteca");
            setCurrentSrc(libraryImage);
            setIsLoadingFromLibrary(false);
            return;
          }
        } catch (error) {
          console.error("❌ Erro ao carregar da biblioteca:", error);
        }
        setIsLoadingFromLibrary(false);
      }

      // 2. FALLBACK: Sistema legacy (src/image)
      if (src) {
        console.log("🖼️ Usando imagem legacy");
        setCurrentSrc(src);
        return;
      }

      // 3. Nenhuma imagem disponível
      setCurrentSrc("");
      setHasError(true);
    };

    // Só determina source se tem alguma fonte
    if (imageHash || src) {
      determineImageSource();
    } else {
      setCurrentSrc("");
      setHasError(true);
    }
  }, [imageHash, src]);

  // ✅ HANDLERS para a imagem HTML
  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
  };

  // ✅ LOADING STATE (carregando da biblioteca)
  if (isLoadingFromLibrary) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-zinc-700 to-zinc-800 ${className} ${fallbackClassName}`}
        {...props}
      >
        {showIcon && (
          <div className="flex flex-col items-center">
            <Package className="h-1/2 w-1/2 text-zinc-500 opacity-60 animate-pulse mb-1" />
            <div className="w-6 h-1 bg-zinc-600 rounded-full overflow-hidden">
              <div className="w-full h-full bg-green-500 animate-pulse"></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ✅ FALLBACK STATE (sem imagem ou erro)
  if (!currentSrc || hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-zinc-700 to-zinc-800 ${className} ${fallbackClassName}`}
        {...props}
      >
        {showIcon && (
          <Package className="h-1/2 w-1/2 text-zinc-500 opacity-60" />
        )}
      </div>
    );
  }

  // ✅ IMAGEM VÁLIDA
  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div
          className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-700 to-zinc-800 ${fallbackClassName}`}
        >
          {showIcon && (
            <Package className="h-1/2 w-1/2 text-zinc-500 opacity-60 animate-pulse" />
          )}
        </div>
      )}

      <img
        src={currentSrc}
        alt={alt}
        className={`${className} ${
          isLoading ? "opacity-0" : "opacity-100"
        } transition-opacity duration-200`}
        onError={handleError}
        onLoad={handleLoad}
        onLoadStart={handleLoadStart}
        loading="lazy"
        {...props}
      />

      {/* ✅ INDICADOR VISUAL para sistema usado (só se habilitado) */}
      {showLibraryIndicator && imageHash && currentSrc && !hasError && (
        <div className="absolute bottom-0 right-0 bg-green-600/80 text-white text-xs px-1 py-0.5 rounded-tl-md">
          ♻️
        </div>
      )}
    </div>
  );
};

export default PartImage;
