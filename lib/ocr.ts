/**
 * Baca teks dari tangkapan layar lowongan, sepenuhnya di browser (tesseract.js).
 * Gambar tidak pernah dikirim ke server Lokerku. Yang diunduh hanya program dan model bahasa pembacanya
 * (sekali, lalu disimpan browser), dari jsDelivr.
 */

export interface OcrProgress {
  pct: number;
  label: string;
}

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export async function imageSize(file: Blob): Promise<{ width: number; height: number }> {
  const bmp = await createImageBitmap(file);
  const size = { width: bmp.width, height: bmp.height };
  bmp.close();
  return size;
}

/**
 * Perbesar tangkapan layar yang kecil dan balik warnanya kalau latarnya gelap:
 * Tesseract jauh lebih akurat pada teks gelap di latar terang dan ukuran huruf yang cukup besar.
 */
async function prepare(file: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = bmp.width < 1400 ? Math.min(3, 1800 / bmp.width) : 1;
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    bmp.close();
    return file;
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();

  const img = ctx.getImageData(0, 0, w, h);
  const px = img.data;
  let sum = 0;
  const step = 4 * 7; // contoh tiap 7 piksel sudah cukup untuk rata-rata kecerahan
  let n = 0;
  for (let i = 0; i < px.length; i += step) {
    sum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    n++;
  }
  if (n && sum / n < 110) {
    for (let i = 0; i < px.length; i += 4) {
      px[i] = 255 - px[i];
      px[i + 1] = 255 - px[i + 1];
      px[i + 2] = 255 - px[i + 2];
    }
    ctx.putImageData(img, 0, 0);
  }
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas"))), "image/png"));
}

export async function readImageText(file: Blob, onProgress?: (p: OcrProgress) => void, signal?: AbortSignal): Promise<string> {
  if (signal?.aborted) throw new DOMException("Dibatalkan", "AbortError");
  onProgress?.({ pct: 0, label: "Menyiapkan gambar" });
  const input = await prepare(file);

  const { createWorker } = await import("tesseract.js");
  onProgress?.({ pct: 0, label: "Menyiapkan pembaca gambar" });
  const worker = await createWorker(["eng", "ind"], 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") onProgress?.({ pct: Math.round(m.progress * 100), label: "Membaca teks" });
    },
  });
  const stop = () => void worker.terminate();
  signal?.addEventListener("abort", stop, { once: true });
  try {
    const { data } = await worker.recognize(input);
    if (signal?.aborted) throw new DOMException("Dibatalkan", "AbortError");
    return data.text;
  } finally {
    signal?.removeEventListener("abort", stop);
    await worker.terminate().catch(() => {});
  }
}
