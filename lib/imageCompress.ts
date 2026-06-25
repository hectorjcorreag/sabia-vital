// lib/imageCompress.ts
export async function compressImage(
  file: File,
  opts?: { maxSize?: number; quality?: number; mimeType?: "image/webp" | "image/jpeg" }
): Promise<File> {
  const maxSize = opts?.maxSize ?? 900; // px
  const quality = opts?.quality ?? 0.75;
  const mimeType = opts?.mimeType ?? "image/webp";

  const img = await loadImage(file);
  const { width, height } = fitInside(img.width, img.height, maxSize);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  // Fondo blanco (por si llega PNG con transparencia y lo pasas a JPEG)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.drawImage(img, 0, 0, width, height);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, mimeType, quality)
  );

  if (!blob) return file;

  // nombre limpio
  const ext = mimeType === "image/webp" ? "webp" : "jpg";
  const newName = file.name.replace(/\.[^/.]+$/, "") + `.${ext}`;

  return new File([blob], newName, { type: mimeType });
}

function fitInside(w: number, h: number, maxSize: number) {
  if (w <= maxSize && h <= maxSize) return { width: w, height: h };
  const ratio = w / h;
  if (ratio >= 1) return { width: maxSize, height: Math.round(maxSize / ratio) };
  return { width: Math.round(maxSize * ratio), height: maxSize };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo cargar la imagen"));
    };
    img.src = url;
  });
}