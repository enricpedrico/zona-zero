const VALID_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const AVATAR_SIZE = 512;

export async function processAvatarImage(file: File): Promise<Blob> {
  if (!VALID_TYPES.has(file.type) || file.size > MAX_FILE_SIZE) {
    throw new Error("invalid-image");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("invalid-image");
  }

  if (bitmap.width < 32 || bitmap.height < 32 || bitmap.width > 12_000 || bitmap.height > 12_000) {
    bitmap.close();
    throw new Error("invalid-image");
  }

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    bitmap.close();
    throw new Error("image-processing");
  }

  const sourceSize = Math.min(bitmap.width, bitmap.height);
  const sourceX = (bitmap.width - sourceSize) / 2;
  const sourceY = (bitmap.height - sourceSize) / 2;
  context.fillStyle = "#111816";
  context.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  context.drawImage(bitmap, sourceX, sourceY, sourceSize, sourceSize, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
  if (!blob) throw new Error("image-processing");
  return blob;
}
