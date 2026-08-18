export type OutputFormat = "image/png" | "image/jpeg" | "image/webp"

export const formatExtension: Record<OutputFormat, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
}

export const acceptedImageTypes = "image/png,image/jpeg,image/webp,image/bmp,image/gif"

export async function decodeImage(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file)
  } catch {
    throw new Error(
      `"${file.name}" could not be decoded. It may be corrupted or use a format this browser cannot read.`,
    )
  }
}

export interface RenderOptions {
  width?: number
  height?: number
  /** Fill color painted behind the image (needed for JPEG from transparent sources). */
  background?: string
  /** Quarter-turn rotation in degrees: 0 | 90 | 180 | 270 */
  rotate?: number
  flipH?: boolean
  flipV?: boolean
}

export function renderToCanvas(bitmap: ImageBitmap, opts: RenderOptions = {}): HTMLCanvasElement {
  const rotate = ((opts.rotate ?? 0) % 360 + 360) % 360
  const swap = rotate === 90 || rotate === 270
  const targetW = Math.max(1, Math.round(opts.width ?? bitmap.width))
  const targetH = Math.max(1, Math.round(opts.height ?? bitmap.height))

  const canvas = document.createElement("canvas")
  canvas.width = swap ? targetH : targetW
  canvas.height = swap ? targetW : targetH

  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas 2D context is not available in this browser.")

  if (opts.background) {
    ctx.fillStyle = opts.background
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  ctx.save()
  ctx.translate(canvas.width / 2, canvas.height / 2)
  if (rotate) ctx.rotate((rotate * Math.PI) / 180)
  ctx.scale(opts.flipH ? -1 : 1, opts.flipV ? -1 : 1)
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(bitmap, -targetW / 2, -targetH / 2, targetW, targetH)
  ctx.restore()
  return canvas
}

export async function encodeCanvas(
  canvas: HTMLCanvasElement,
  type: OutputFormat,
  quality?: number,
): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, quality),
  )
  if (!blob) throw new Error("The browser failed to encode the image.")
  return blob
}

export interface ConvertResult {
  blob: Blob
  filename: string
}

export async function convertImage(
  file: File,
  type: OutputFormat,
  options: { quality?: number; background?: string; maxWidth?: number; maxHeight?: number } = {},
): Promise<ConvertResult> {
  const bitmap = await decodeImage(file)
  try {
    let width = bitmap.width
    let height = bitmap.height
    const scale = Math.min(
      options.maxWidth ? options.maxWidth / width : 1,
      options.maxHeight ? options.maxHeight / height : 1,
      1,
    )
    width = Math.round(width * scale)
    height = Math.round(height * scale)

    const needsBackground = type === "image/jpeg"
    const canvas = renderToCanvas(bitmap, {
      width,
      height,
      background: needsBackground ? (options.background ?? "#ffffff") : undefined,
    })
    const blob = await encodeCanvas(canvas, type, options.quality)
    const base = file.name.replace(/\.[^.]+$/, "")
    return { blob, filename: `${base}.${formatExtension[type]}` }
  } finally {
    bitmap.close()
  }
}
