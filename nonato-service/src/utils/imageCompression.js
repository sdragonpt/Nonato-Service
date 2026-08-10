// src/utils/imageCompression.js
// Comprime uma imagem no browser antes do upload (redimensiona + reencode
// em JPEG), para não encher o Storage com fotos de câmara de telemóvel a
// vários MB só para mostrar uma miniatura. Sem dependências novas — usa
// só <canvas>.

/**
 * @param {File|Blob} file - imagem original
 * @param {Object} [options]
 * @param {number} [options.maxDimension=1000] - maior lado (largura ou altura) em px
 * @param {number} [options.quality=0.75] - qualidade JPEG (0-1)
 * @returns {Promise<Blob>} imagem comprimida (image/jpeg)
 */
export function compressImage(file, { maxDimension = 1000, quality = 0.75 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height / width) * maxDimension);
          width = maxDimension;
        } else {
          width = Math.round((width / height) * maxDimension);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Falha ao comprimir imagem"));
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Falha ao carregar imagem para compressão"));
    };

    img.src = objectUrl;
  });
}

export default compressImage;
