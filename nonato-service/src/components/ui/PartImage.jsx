// PartImage.jsx - OTIMIZADO: Componente de imagem com cache inteligente
import { useState, useEffect, useRef, useCallback } from "react";
import { Package } from "lucide-react";
import imageCache from "../../context/ImageCacheManager";

const PartImage = ({
  src,
  imageHash,
  alt = "Imagem da peça",
  className = "",
  defaultImage = null,
  onLoad,
  onError,
  lazy = true, // Lazy loading por padrão
  priority = false, // Para imagens importantes
}) => {
  const [imageSrc, setImageSrc] = useState(defaultImage);
  const [isLoading, setIsLoading] = useState(!!imageHash);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy || priority);

  const imgRef = useRef(null);
  const observerRef = useRef(null);
  const loadAttemptRef = useRef(0);

  // 👁️ Intersection Observer para lazy loading
  useEffect(() => {
    if (!lazy || priority || isInView) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin: "50px", // Carrega 50px antes de aparecer
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [lazy, priority, isInView]);

  // 🖼️ Carrega imagem quando entra na viewport
  const loadImage = useCallback(async () => {
    if (!isInView || (!imageHash && !src) || hasError) return;

    // Evita múltiplas tentativas
    if (loadAttemptRef.current > 2) {
      console.warn(
        `⚠️ Muitas tentativas para carregar imagem: ${imageHash || src}`
      );
      setHasError(true);
      setIsLoading(false);
      return;
    }

    loadAttemptRef.current++;
    setIsLoading(true);
    setHasError(false);

    try {
      let imageData = null;

      // 1. Prioridade: Nova estrutura com hash (biblioteca)
      if (imageHash) {
        console.log(`🔍 Carregando imagem da biblioteca: ${imageHash}`);
        imageData = await imageCache.loadImage(imageHash);

        if (imageData) {
          setImageSrc(imageData);
          setIsLoading(false);
          onLoad?.();
          return;
        } else {
          console.warn(`❌ Imagem não encontrada na biblioteca: ${imageHash}`);
        }
      }

      // 2. Fallback: Estrutura legacy (src direto)
      if (src && src !== defaultImage) {
        console.log(`📷 Usando imagem legacy direta`);

        // Verifica se é base64 válido
        if (src.startsWith("data:image/")) {
          setImageSrc(src);
          setIsLoading(false);
          onLoad?.();
          return;
        }
      }

      // 3. Nenhuma imagem encontrada
      console.log(`🚫 Nenhuma imagem disponível para: ${alt}`);
      setImageSrc(defaultImage);
      setIsLoading(false);
    } catch (error) {
      console.error(`❌ Erro ao carregar imagem:`, error);
      setHasError(true);
      setIsLoading(false);
      setImageSrc(defaultImage);
      onError?.(error);
    }
  }, [isInView, imageHash, src, defaultImage, alt, hasError, onLoad, onError]);

  // ⚡ Effect para carregar imagem
  useEffect(() => {
    let timeoutId;

    if (isInView) {
      // Pequeno delay para evitar muitas chamadas simultâneas
      timeoutId = setTimeout(loadImage, 10);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loadImage, isInView]);

  // 🔄 Reset quando props mudam
  useEffect(() => {
    loadAttemptRef.current = 0;
    setHasError(false);
    setImageSrc(defaultImage);
    setIsLoading(!!imageHash || !!src);
  }, [imageHash, src, defaultImage]);

  // 🎨 Handler para erro da tag img
  const handleImageError = useCallback(() => {
    console.warn(`🖼️ Erro ao renderizar imagem: ${imageSrc}`);
    setHasError(true);
    setIsLoading(false);
    setImageSrc(defaultImage);
    onError?.();
  }, [imageSrc, defaultImage, onError]);

  // 📸 Handler para sucesso da tag img
  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  // 🖼️ Renderização
  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden bg-zinc-700 ${className}`}
      style={{ minHeight: "100%", minWidth: "100%" }}
    >
      {/* Loading state */}
      {isLoading && isInView && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-700 animate-pulse">
          <div className="w-6 h-6 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Placeholder quando não está na viewport */}
      {!isInView && lazy && !priority && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-700">
          <Package className="w-8 h-8 text-zinc-500" />
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-700 text-zinc-400">
          <Package className="w-8 h-8 mb-1" />
          <span className="text-xs">Sem imagem</span>
        </div>
      )}

      {/* Imagem principal */}
      {imageSrc && !hasError && isInView && (
        <img
          src={imageSrc}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            isLoading ? "opacity-0" : "opacity-100"
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
        />
      )}
    </div>
  );
};

// 🚀 Hook para pré-carregar imagens
export const usePreloadImages = () => {
  const preloadImages = useCallback(async (imageHashes) => {
    if (!imageHashes?.length) return;

    // Filtra apenas hashes válidos
    const validHashes = imageHashes.filter(
      (hash) => hash && typeof hash === "string" && hash.length > 0
    );

    if (validHashes.length > 0) {
      await imageCache.preloadImages(validHashes);
    }
  }, []);

  return { preloadImages };
};

// 📊 Hook para estatísticas do cache
export const useImageCacheStats = () => {
  const [stats, setStats] = useState(imageCache.getStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(imageCache.getStats());
    }, 5000); // Atualiza a cada 5 segundos

    return () => clearInterval(interval);
  }, []);

  return stats;
};

// 🧹 Hook para limpeza de cache
export const useImageCacheControl = () => {
  const clearCache = useCallback(() => {
    imageCache.clearAllCache();
  }, []);

  const clearImageFromCache = useCallback((imageHash) => {
    imageCache.removeFromCache(imageHash);
  }, []);

  return { clearCache, clearImageFromCache };
};

export default PartImage;
