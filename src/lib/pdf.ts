import { PDFDocument, degrees } from "pdf-lib"

/** Parse "1-3, 5, 8-10" into a sorted, unique, 1-based page list clamped to pageCount. */
export function parsePageRanges(input: string, pageCount: number): number[] {
  const pages = new Set<number>()
  for (const part of input.split(",")) {
    const token = part.trim()
    if (!token) continue
    const m = token.match(/^(\d+)\s*-\s*(\d+)$/)
    if (m) {
      const from = Number(m[1])
      const to = Number(m[2])
      if (from < 1 || to < from) throw new Error(`Invalid range "${token}".`)
      for (let p = from; p <= Math.min(to, pageCount); p++) pages.add(p)
    } else if (/^\d+$/.test(token)) {
      const p = Number(token)
      if (p < 1) throw new Error(`Invalid page "${token}".`)
      if (p <= pageCount) pages.add(p)
    } else {
      throw new Error(`"${token}" is not a page number or range like 2-5.`)
    }
  }
  if (pages.size === 0) throw new Error("No valid pages selected.")
  return [...pages].sort((a, b) => a - b)
}

/** Parse "1-3, 5, 8-10" into groups (one output file per comma-separated part). */
export function parseRangeGroups(
  input: string,
  pageCount: number,
): { label: string; pages: number[] }[] {
  const groups: { label: string; pages: number[] }[] = []
  for (const part of input.split(",")) {
    const token = part.trim()
    if (!token) continue
    const pages = parsePageRanges(token, pageCount)
    groups.push({ label: token.replace(/\s+/g, ""), pages })
  }
  if (groups.length === 0) throw new Error("No valid pages selected.")
  return groups
}

export async function loadPdf(file: File): Promise<PDFDocument> {
  const bytes = await file.arrayBuffer()
  try {
    return await PDFDocument.load(bytes)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.toLowerCase().includes("encrypt")) {
      throw new Error(
        `"${file.name}" is password-protected. Encrypted PDFs are not supported yet.`,
      )
    }
    throw new Error(
      `"${file.name}" could not be read. It may be corrupted or not a valid PDF.`,
    )
  }
}

async function saveAsBlob(doc: PDFDocument): Promise<Blob> {
  const bytes = await doc.save()
  return new Blob([bytes as unknown as BlobPart], { type: "application/pdf" })
}

export async function mergePdfs(files: File[]): Promise<Blob> {
  const merged = await PDFDocument.create()
  for (const file of files) {
    const src = await loadPdf(file)
    const pages = await merged.copyPages(src, src.getPageIndices())
    for (const page of pages) merged.addPage(page)
  }
  return await saveAsBlob(merged)
}

/** Create a new PDF containing only the given 1-based pages, in the given order. */
export async function extractPages(file: File, pages: number[]): Promise<Blob> {
  const src = await loadPdf(file)
  const out = await PDFDocument.create()
  const copied = await out.copyPages(src, pages.map((p) => p - 1))
  for (const page of copied) out.addPage(page)
  return await saveAsBlob(out)
}

export async function deletePages(file: File, pagesToDelete: number[]): Promise<Blob> {
  const src = await loadPdf(file)
  const total = src.getPageCount()
  const drop = new Set(pagesToDelete)
  const keep = Array.from({ length: total }, (_, i) => i + 1).filter((p) => !drop.has(p))
  if (keep.length === 0) throw new Error("You can't delete every page.")
  return await extractFromDoc(src, keep)
}

async function extractFromDoc(src: PDFDocument, pages: number[]): Promise<Blob> {
  const out = await PDFDocument.create()
  const copied = await out.copyPages(src, pages.map((p) => p - 1))
  for (const page of copied) out.addPage(page)
  return await saveAsBlob(out)
}

/** Rotate the given 1-based pages (or all when pages is null) by delta degrees. */
export async function rotatePdfPages(
  file: File,
  pages: number[] | null,
  delta: number,
): Promise<Blob> {
  const doc = await loadPdf(file)
  const targets = pages ?? Array.from({ length: doc.getPageCount() }, (_, i) => i + 1)
  for (const p of targets) {
    const page = doc.getPage(p - 1)
    const current = page.getRotation().angle
    page.setRotation(degrees((current + delta) % 360))
  }
  return await saveAsBlob(doc)
}

export interface PdfInfo {
  pageCount: number
  title?: string
  author?: string
  subject?: string
  creator?: string
  producer?: string
  creationDate?: Date
  modificationDate?: Date
}

export async function readPdfInfo(file: File): Promise<PdfInfo> {
  const doc = await loadPdf(file)
  return {
    pageCount: doc.getPageCount(),
    title: doc.getTitle(),
    author: doc.getAuthor(),
    subject: doc.getSubject(),
    creator: doc.getCreator(),
    producer: doc.getProducer(),
    creationDate: doc.getCreationDate(),
    modificationDate: doc.getModificationDate(),
  }
}

/** Get just the page count without keeping the document around. */
export async function getPageCount(file: File): Promise<number> {
  const doc = await loadPdf(file)
  return doc.getPageCount()
}

export async function reorderPdf(file: File, order: number[]): Promise<Blob> {
  const src = await loadPdf(file)
  return await extractFromDoc(src, order)
}

async function fileToEmbeddable(file: File): Promise<{ bytes: ArrayBuffer; kind: "jpg" | "png" }> {
  if (file.type === "image/jpeg") return { bytes: await file.arrayBuffer(), kind: "jpg" }
  if (file.type === "image/png") return { bytes: await file.arrayBuffer(), kind: "png" }
  // Re-encode anything else (WebP, BMP, …) to PNG via canvas.
  const bitmap = await createImageBitmap(file)
  try {
    const canvas = document.createElement("canvas")
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas 2D context is not available.")
    ctx.drawImage(bitmap, 0, 0)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"))
    if (!blob) throw new Error(`"${file.name}" could not be converted for embedding.`)
    return { bytes: await blob.arrayBuffer(), kind: "png" }
  } finally {
    bitmap.close()
  }
}

export type PageSizeMode = "image" | "a4"

export async function imagesToPdf(files: File[], pageSize: PageSizeMode): Promise<Blob> {
  const doc = await PDFDocument.create()
  const A4: [number, number] = [595.28, 841.89]
  const MARGIN = 24

  for (const file of files) {
    const { bytes, kind } = await fileToEmbeddable(file)
    const image =
      kind === "jpg" ? await doc.embedJpg(bytes) : await doc.embedPng(bytes)

    if (pageSize === "image") {
      const page = doc.addPage([image.width, image.height])
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
    } else {
      const landscape = image.width > image.height
      const [pw, ph] = landscape ? [A4[1], A4[0]] : A4
      const page = doc.addPage([pw, ph])
      const maxW = pw - MARGIN * 2
      const maxH = ph - MARGIN * 2
      const scale = Math.min(maxW / image.width, maxH / image.height, 1)
      const w = image.width * scale
      const h = image.height * scale
      page.drawImage(image, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h })
    }
  }
  return await saveAsBlob(doc)
}
