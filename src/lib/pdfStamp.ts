import { loadPdf } from "./pdf"

export type StampPosition =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left"
  | "center"

export interface StampOptions {
  /** 1-based page numbers to stamp. */
  pages: number[]
  position: StampPosition
  /** Stamp width as a percentage of the page width. */
  widthPct: number
  margin?: number
}

export async function stampImageOnPdf(
  file: File,
  png: ArrayBuffer,
  { pages, position, widthPct, margin = 24 }: StampOptions,
): Promise<Blob> {
  const doc = await loadPdf(file)
  const image = await doc.embedPng(png)
  const aspect = image.height / image.width

  for (const p of pages) {
    if (p < 1 || p > doc.getPageCount()) continue
    const page = doc.getPage(p - 1)
    const { width: pw, height: ph } = page.getSize()
    const w = (pw * widthPct) / 100
    const h = w * aspect
    let x = margin
    let y = margin
    if (position.includes("right")) x = pw - w - margin
    if (position.includes("top")) y = ph - h - margin
    if (position === "center") {
      x = (pw - w) / 2
      y = (ph - h) / 2
    }
    page.drawImage(image, { x, y, width: w, height: h })
  }
  const bytes = await doc.save()
  return new Blob([bytes as unknown as BlobPart], { type: "application/pdf" })
}
