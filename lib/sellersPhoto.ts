// lib/sellersPhoto.ts
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { compressImage } from "@/lib/imageCompress";

export async function uploadSellerPhoto(
  file: File,
  sellerId: string,
  oldPath?: string | null
) {
  // ✅ Comprimir al máximo razonable
  const compressed = await compressImage(file, {
    maxSize: 900,
    quality: 0.75,
    mimeType: "image/webp",
  });

  // ✅ Path estándar: si siempre es el mismo, “reemplaza” (y no acumula basura)
  const newPath = `seller_photos/${sellerId}/profile.webp`;

  // ✅ Si antes guardabas en otro path, lo eliminamos
  if (oldPath && oldPath !== newPath) {
    try {
      await deleteObject(ref(storage, oldPath));
    } catch {
      // si no existe o no hay permisos, no tumbamos el flujo
    }
  }

  // ✅ Subir (si el path es el mismo, queda reemplazada)
  const storageRef = ref(storage, newPath);
  await uploadBytes(storageRef, compressed, {
    contentType: compressed.type,
    cacheControl: "public,max-age=3600",
  });

  const url = await getDownloadURL(storageRef);
  return { url, path: newPath };
}