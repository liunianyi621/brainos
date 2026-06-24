(function () {
  const MAX_WIDTH = 1200;
  const MAX_HEIGHT = 1200;
  const TARGET_BYTES = 800 * 1024;
  const HARD_LIMIT_BYTES = 1.5 * 1024 * 1024;
  const QUALITIES = [0.75, 0.6, 0.45];

  function process(file) {
    if (!file || !file.type || !file.type.startsWith("image/")) {
      return Promise.reject(createError("NOT_IMAGE", "请选择图片文件。"));
    }

    return readAsDataUrl(file).then((sourceUrl) => {
      return compressDataUrl(sourceUrl).then((result) => {
        if (result.bytes > HARD_LIMIT_BYTES) {
          throw createError("IMAGE_TOO_LARGE", "这张图片仍然太大。");
        }

        return {
          imageData: result.dataUrl,
          originalImageName: file.name || "粘贴图片",
          imageSize: {
            originalBytes: file.size || estimateDataUrlBytes(sourceUrl),
            compressedBytes: result.bytes,
            width: result.width,
            height: result.height,
            quality: result.quality
          }
        };
      });
    });
  }

  function readAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || createError("IMAGE_READ_FAILED", "图片读取失败。"));
      reader.readAsDataURL(file);
    });
  }

  function compressDataUrl(sourceUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();

      image.onload = () => {
        try {
          const bounds = fitWithin(image.naturalWidth || image.width, image.naturalHeight || image.height);
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          let bestResult = null;

          canvas.width = bounds.width;
          canvas.height = bounds.height;
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, bounds.width, bounds.height);
          context.drawImage(image, 0, 0, bounds.width, bounds.height);

          QUALITIES.some((quality) => {
            const dataUrl = canvas.toDataURL("image/jpeg", quality);
            bestResult = {
              dataUrl,
              bytes: estimateDataUrlBytes(dataUrl),
              width: bounds.width,
              height: bounds.height,
              quality
            };

            return bestResult.bytes <= TARGET_BYTES;
          });

          resolve(bestResult);
        } catch (error) {
          reject(error);
        }
      };

      image.onerror = () => reject(createError("IMAGE_DECODE_FAILED", "图片解析失败。"));
      image.src = sourceUrl;
    });
  }

  function fitWithin(width, height) {
    const safeWidth = Math.max(1, Number(width) || 1);
    const safeHeight = Math.max(1, Number(height) || 1);
    const ratio = Math.min(1, MAX_WIDTH / safeWidth, MAX_HEIGHT / safeHeight);

    return {
      width: Math.max(1, Math.round(safeWidth * ratio)),
      height: Math.max(1, Math.round(safeHeight * ratio))
    };
  }

  function estimateDataUrlBytes(dataUrl) {
    const base64 = String(dataUrl || "").split(",")[1] || "";
    return Math.ceil(base64.length * 0.75);
  }

  function formatBytes(bytes) {
    const value = Number(bytes) || 0;

    if (value >= 1024 * 1024) {
      return `${(value / 1024 / 1024).toFixed(2)} MB`;
    }

    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  function createError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  window.BrainOSImageProcessor = {
    process,
    formatBytes,
    limits: {
      targetBytes: TARGET_BYTES,
      hardLimitBytes: HARD_LIMIT_BYTES
    }
  };
})();
