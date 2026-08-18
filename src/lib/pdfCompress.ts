import { PDFDocument } from "pdf-lib"
import { openPdfForRender } from "./pdfRender"

export interface CompressPdfOptions {
  /** Render scale: 1 = 72 DPI, 1.5 = 108 DPI, 2 = 144 DPI. */
  scale: number
  /** JPEG quality 0..1 for the re-encoded pages. */
  quality: number
  onProgress?: (done: number, total: number) => void
}

/**
 * Compress a PDF by re-rendering every page as a JPEG at the given scale
 * and rebuilding the document. Output pages keep the original point size,
 * but text becomes rasterized (no longer selectable).
 */
export async function compressPdf(
  file: File,
  { scale, quality, onProgress }: CompressPdfOptions,
): Promise<Blob> {
  const src = await openPdfForRender(file)
  try {
    const out = await PDFDocument.create()
    for (let p = 1; p <= src.numPages; p++) {
      const page = await src.getPage(p)
      // Viewport at scale 1 is in PDF points; keep that as the output page size.
      const pointSize = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement("canvas")
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Canvas 2D context is not available.")
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      await page.render({ canvas, canvasContext: ctx, viewport }).promise
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality))
      page.cleanup()
      if (!blob) throw new Error(`Page ${p} could not be encoded.`)
      const jpg = await out.embedJpg(await blob.arrayBuffer())
      const outPage = out.addPage([pointSize.width, pointSize.height])
      outPage.drawImage(jpg, { x: 0, y: 0, width: pointSize.width, height: pointSize.height })
      onProgress?.(p, src.numPages)
    }
    const bytes = await out.save()
    return new Blob([bytes as unknown as BlobPart], { type: "application/pdf" })
  } finally {
    await src.loadingTask.destroy()
  }
}
