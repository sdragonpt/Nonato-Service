// PartImage.jsx - OTIMIZADO: Simples e eficiente

import { useState, useEffect, useRef } from "react";
import { Package } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase.jsx";

// Cache simples em memória
const imageCache = new Map();
const CACHE_SIZE = 50; // Máximo de imagens em cache

// Imagem default em Data URL (não precisa de arquivo externo)
const DEFAULT_IMAGE_DATA_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%2327272a'/%3E%3Cg transform='translate(100 100)'%3E%3Crect x='-30' y='-40' width='60' height='50' fill='none' stroke='%2371717a' stroke-width='2' rx='2'/%3E%3Cpath d='M-30,-10 L0,-25 L30,-10' fill='none' stroke='%2371717a' stroke-width='2'/%3E%3Cpath d='M0,-25 L0,-40' stroke='%2371717a' stroke-width='2'/%3E%3C/g%3E%3C/svg%3E";

const PartImage = ({
  src,
  imageHash,
  alt = "Imagem da peça",
  className = "",
  defaultImage = DEFAULT_IMAGE_DATA_URL, // Default com SVG inline
  lazy = true,
}) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!lazy || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true);
        }
      },
      { rootMargin: "50px", threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, isInView]);

  useEffect(() => {
    if (!isInView) return;

    const loadImage = async () => {
      // Se já tem src direto e é válido, usar
      if (src && src !== defaultImage && src.startsWith("data:")) {
        setImageSrc(src);
        return;
      }

      // Se tem hash, buscar da biblioteca
      if (imageHash) {
        // Verificar cache
        if (imageCache.has(imageHash)) {
          setImageSrc(imageCache.get(imageHash));
          return;
        }

        setIsLoading(true);
        try {
          const imageDoc = await getDoc(doc(db, "image_library", imageHash));

          if (imageDoc.exists()) {
            const imageData = imageDoc.data().data;

            // Adicionar ao cache (com limite)
            if (imageCache.size >= CACHE_SIZE) {
              const firstKey = imageCache.keys().next().value;
              imageCache.delete(firstKey);
            }
            imageCache.set(imageHash, imageData);

            setImageSrc(imageData);
          } else {
            // Se não encontrou, usar default
            setImageSrc(defaultImage);
          }
        } catch (error) {
          setHasError(true);
          setImageSrc(defaultImage);
        } finally {
          setIsLoading(false);
        }
      } else {
        // Sem src e sem hash, usar default
        setImageSrc(defaultImage);
      }
    };

    loadImage();
  }, [isInView, imageHash, src, defaultImage]);

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden bg-zinc-700 ${className}`}
    >
      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-800 animate-pulse">
          <div className="w-6 h-6 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Placeholder antes de carregar */}
      {!isInView && lazy && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
          <Package className="w-8 h-8 text-zinc-500" />
        </div>
      )}

      {/* Estado de erro ou sem imagem */}
      {(hasError || (!imageSrc && !isLoading && isInView)) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-800 text-zinc-400">
          <Package className="w-8 h-8 mb-1" />
          <span className="text-xs">Sem imagem</span>
        </div>
      )}

      {/* Imagem carregada */}
      {imageSrc && !hasError && isInView && (
        <img
          src={imageSrc}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            isLoading ? "opacity-0" : "opacity-100"
          }`}
          onError={() => {
            setHasError(true);
            // Se der erro, tenta usar o default
            if (defaultImage && imageSrc !== defaultImage) {
              setImageSrc(defaultImage);
              setHasError(false);
            }
          }}
          onLoad={() => setIsLoading(false)}
          loading="lazy"
        />
      )}
    </div>
  );
};

export default PartImage;
