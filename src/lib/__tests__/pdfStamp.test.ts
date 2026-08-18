import { PDFDocument } from "pdf-lib"
import { describe, expect, it } from "vitest"
import { stampImageOnPdf } from "../pdfStamp"

// 1×1 transparent PNG.
const PNG_1PX = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  ),
  (c) => c.charCodeAt(0),
).buffer as ArrayBuffer

async function makePdf(pages: number): Promise<File> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pages; i++) doc.addPage([600, 800])
  const bytes = await doc.save()
  return new File([bytes as unknown as BlobPart], "sign-me.pdf", {
    type: "application/pdf",
  })
}

describe("stampImageOnPdf", () => {
  it("stamps only the requested pages", async () => {
    const blob = await stampImageOnPdf(await makePdf(3), PNG_1PX, {
      pages: [2],
      position: "bottom-right",
      widthPct: 25,
    })
    const doc = await PDFDocument.load(await blob.arrayBuffer())
    expect(doc.getPageCount()).toBe(3)
    // Only page 2 should reference an image XObject.
    const hasImage = doc.getPages().map((p) => {
      const res = p.node.Resources()
      return res ? res.toString().includes("XObject") : false
    })
    expect(hasImage).toEqual([false, true, false])
  })

  it("ignores out-of-range page numbers instead of crashing", async () => {
    const blob = await stampImageOnPdf(await makePdf(1), PNG_1PX, {
      pages: [1, 99],
      position: "center",
      widthPct: 30,
    })
    const doc = await PDFDocument.load(await blob.arrayBuffer())
    expect(doc.getPageCount()).toBe(1)
  })
})
