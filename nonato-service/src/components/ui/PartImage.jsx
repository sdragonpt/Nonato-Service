// PartImage.jsx - Componente otimizado para imagens de peças com fallback

import React, { useState } from "react";
import { Package } from "lucide-react";

const PartImage = ({
  src,
  alt = "Peça",
  className = "",
  fallbackClassName = "",
  showIcon = true,
  ...props
}) => {
  const [hasError, setHasError] = useState(!src);
  const [isLoading, setIsLoading] = useState(!!src);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  // Se não há src ou houve erro, mostrar fallback
  if (!src || hasError) {
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
        src={src}
        alt={alt}
        className={`${className} ${
          isLoading ? "opacity-0" : "opacity-100"
        } transition-opacity duration-200`}
        onError={handleError}
        onLoad={handleLoad}
        loading="lazy"
        {...props}
      />
    </div>
  );
};

export default PartImage;
