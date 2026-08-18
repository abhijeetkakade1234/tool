import { GlobalWorkerOptions, getDocument } from "pdfjs-dist"
import type { PDFDocumentProxy } from "pdfjs-dist"

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString()

export async function openPdfForRender(file: File): Promise<PDFDocumentProxy> {
  const data = await file.arrayBuffer()
  try {
    return await getDocument({ data }).promise
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.toLowerCase().includes("password")) {
      throw new Error(`"${file.name}" is password-protected. Encrypted PDFs are not supported yet.`)
    }
    throw new Error(`"${file.name}" could not be rendered. It may be corrupted or not a valid PDF.`)
  }
}

/**
 * Render every page as a small JPEG thumbnail and return object URLs
 * (index = page number - 1). Caller must revoke the URLs when done.
 */
export async function renderThumbnails(file: File, maxWidth = 96): Promise<string[]> {
  const doc = await openPdfForRender(file)
  const urls: string[] = []
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p)
      const base = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: maxWidth / base.width })
      const canvas = document.createElement("canvas")
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Canvas 2D context is not available.")
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      await page.render({ canvas, canvasContext: ctx, viewport }).promise
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.8))
      page.cleanup()
      urls.push(blob ? URL.createObjectURL(blob) : "")
    }
  } finally {
    await doc.loadingTask.destroy()
  }
  return urls
}

export interface RenderPageOptions {
  scale: number
  type: "image/jpeg" | "image/png"
  quality?: number
}

export async function renderPageToBlob(
  doc: PDFDocumentProxy,
  pageNumber: number,
  { scale, type, quality }: RenderPageOptions,
): Promise<Blob> {
  const page = await doc.getPage(pageNumber)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement("canvas")
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas 2D context is not available.")
  if (type === "image/jpeg") {
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  await page.render({ canvas, canvasContext: ctx, viewport }).promise
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, type, quality))
  page.cleanup()
  if (!blob) throw new Error(`Page ${pageNumber} could not be encoded.`)
  return blob
}
