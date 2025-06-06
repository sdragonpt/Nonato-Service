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
  defaultImage = null, // ✅ NOVO: Imagem padrão
  ...props
}) => {
  const [currentSrc, setCurrentSrc] = useState("");
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFromLibrary, setIsLoadingFromLibrary] = useState(false);

  // ✅ FILTRAR props customizadas para não irem para o DOM
  const {
    defaultImage: _,
    showLibraryIndicator: __,
    showIcon: ___,
    fallbackClassName: ____,
    ...domProps
  } = props;

  // ✅ FUNÇÃO para carregar imagem da biblioteca
  const loadImageFromLibrary = async (hash) => {
    try {
      if (!hash) return null;

      const imageRef = doc(db, "image_library", hash);
      const imageDoc = await getDoc(imageRef);

      if (imageDoc.exists()) {
        return imageDoc.data().data;
      }
      return null;
    } catch (error) {
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
            setCurrentSrc(libraryImage);
            setIsLoadingFromLibrary(false);
            return;
          }
        } catch (error) {
          // Falha silenciosa - tenta fallback
        }
        setIsLoadingFromLibrary(false);
      }

      // 2. FALLBACK: Sistema legacy (src/image)
      if (src) {
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
        {...domProps}
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
    // Se tem imagem padrão, usar ela
    if (defaultImage) {
      return (
        <img
          src={defaultImage}
          alt={alt}
          className={`${className} opacity-75`}
          loading="lazy"
          onError={(e) => {
            e.target.style.display = "none";
            // Mostrar ícone como fallback final
            const parent = e.target.parentNode;
            parent.innerHTML = `
              <div class="flex items-center justify-center bg-gradient-to-br from-zinc-700 to-zinc-800 ${className} ${fallbackClassName}">
                <svg class="h-6 w-6 text-zinc-500 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            `;
          }}
          {...domProps}
        />
      );
    }

    // Senão, mostrar ícone como antes
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-zinc-700 to-zinc-800 ${className} ${fallbackClassName}`}
        {...domProps}
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
        {...domProps}
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
