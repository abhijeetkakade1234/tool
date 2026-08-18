import { PDFDocument } from "pdf-lib"
import { describe, expect, it } from "vitest"
import {
  deletePages,
  editPdfMetadata,
  extractPages,
  getPageCount,
  loadPdf,
  mergePdfs,
  parsePageRanges,
  parseRangeGroups,
  readPdfInfo,
  reorderPdf,
  rotatePdfPages,
} from "../pdf"

/** Build an in-memory PDF file with the given number of (labeled-size) pages. */
async function makePdf(pages: number, name = "test.pdf"): Promise<File> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pages; i++) {
    // Unique width per page so page identity survives copying.
    doc.addPage([500 + i, 700])
  }
  const bytes = await doc.save()
  return new File([bytes as unknown as BlobPart], name, { type: "application/pdf" })
}

async function pageWidths(blob: Blob): Promise<number[]> {
  const doc = await PDFDocument.load(await blob.arrayBuffer())
  return doc.getPages().map((p) => Math.round(p.getWidth()))
}

describe("parsePageRanges", () => {
  it("parses single pages and ranges", () => {
    expect(parsePageRanges("1-3, 5", 10)).toEqual([1, 2, 3, 5])
  })

  it("deduplicates and sorts", () => {
    expect(parsePageRanges("5, 1, 2-5", 10)).toEqual([1, 2, 3, 4, 5])
  })

  it("clamps pages beyond the page count", () => {
    expect(parsePageRanges("2-99", 4)).toEqual([2, 3, 4])
  })

  it("rejects reversed ranges", () => {
    expect(() => parsePageRanges("5-2", 10)).toThrow(/Invalid range/)
  })

  it("rejects garbage tokens", () => {
    expect(() => parsePageRanges("abc", 10)).toThrow(/not a page number/)
  })

  it("rejects selections with no valid pages", () => {
    expect(() => parsePageRanges("99", 4)).toThrow(/No valid pages/)
    expect(() => parsePageRanges("", 4)).toThrow(/No valid pages/)
  })

  it("tolerates whitespace around numbers and dashes", () => {
    expect(parsePageRanges(" 1 - 3 ,  5 ", 10)).toEqual([1, 2, 3, 5])
  })
})

describe("parseRangeGroups", () => {
  it("creates one group per comma-separated part", () => {
    const groups = parseRangeGroups("1-2, 4", 10)
    expect(groups).toHaveLength(2)
    expect(groups[0]).toEqual({ label: "1-2", pages: [1, 2] })
    expect(groups[1]).toEqual({ label: "4", pages: [4] })
  })

  it("rejects invalid parts", () => {
    expect(() => parseRangeGroups("1-2, oops", 10)).toThrow(/not a page number/)
    expect(() => parseRangeGroups("", 10)).toThrow(/No valid pages/)
  })
})

describe("loadPdf", () => {
  it("rejects non-PDF data with a friendly message", async () => {
    const junk = new File([new Uint8Array([1, 2, 3, 4])], "junk.pdf")
    await expect(loadPdf(junk)).rejects.toThrow(/could not be read/)
  })
})

describe("getPageCount", () => {
  it("counts pages", async () => {
    expect(await getPageCount(await makePdf(7))).toBe(7)
  })
})

describe("mergePdfs", () => {
  it("concatenates documents in order", async () => {
    const blob = await mergePdfs([await makePdf(2), await makePdf(3)])
    expect(await pageWidths(blob)).toEqual([500, 501, 500, 501, 502])
  })

  it("fails with a friendly error when any input is corrupt", async () => {
    const junk = new File([new Uint8Array([9, 9, 9])], "broken.pdf")
    await expect(mergePdfs([await makePdf(1), junk])).rejects.toThrow(
      /"broken\.pdf" could not be read/,
    )
  })
})

describe("extractPages", () => {
  it("keeps only the selected pages in the given order", async () => {
    const blob = await extractPages(await makePdf(5), [1, 3, 5])
    expect(await pageWidths(blob)).toEqual([500, 502, 504])
  })
})

describe("deletePages", () => {
  it("removes the selected pages", async () => {
    const blob = await deletePages(await makePdf(5), [2, 4])
    expect(await pageWidths(blob)).toEqual([500, 502, 504])
  })

  it("refuses to delete every page", async () => {
    await expect(deletePages(await makePdf(2), [1, 2])).rejects.toThrow(
      /can't delete every page/,
    )
  })
})

describe("reorderPdf", () => {
  it("reorders pages", async () => {
    const blob = await reorderPdf(await makePdf(3), [3, 1, 2])
    expect(await pageWidths(blob)).toEqual([502, 500, 501])
  })
})

describe("rotatePdfPages", () => {
  it("rotates all pages when pages is null", async () => {
    const blob = await rotatePdfPages(await makePdf(2), null, 90)
    const doc = await PDFDocument.load(await blob.arrayBuffer())
    expect(doc.getPages().map((p) => p.getRotation().angle)).toEqual([90, 90])
  })

  it("rotates only the selected pages", async () => {
    const blob = await rotatePdfPages(await makePdf(3), [2], 180)
    const doc = await PDFDocument.load(await blob.arrayBuffer())
    expect(doc.getPages().map((p) => p.getRotation().angle)).toEqual([0, 180, 0])
  })

  it("wraps rotation past 360 degrees", async () => {
    const first = await rotatePdfPages(await makePdf(1), null, 270)
    const firstFile = new File([await first.arrayBuffer()], "r.pdf")
    const second = await rotatePdfPages(firstFile, null, 180)
    const doc = await PDFDocument.load(await second.arrayBuffer())
    expect(doc.getPage(0).getRotation().angle).toBe(90)
  })
})

describe("editPdfMetadata", () => {
  it("writes new fields and clears with empty strings", async () => {
    const doc = await PDFDocument.create()
    doc.setTitle("Old Title")
    doc.setAuthor("Old Author")
    doc.addPage()
    const bytes = await doc.save()
    const file = new File([bytes as unknown as BlobPart], "meta.pdf")

    const blob = await editPdfMetadata(file, { title: "New Title", author: "" })
    const edited = await PDFDocument.load(await blob.arrayBuffer())
    expect(edited.getTitle()).toBe("New Title")
    expect(edited.getAuthor() ?? "").toBe("")
    expect(edited.getPageCount()).toBe(1)
  })

  it("leaves undefined fields untouched", async () => {
    const doc = await PDFDocument.create()
    doc.setSubject("Keep Me")
    doc.addPage()
    const bytes = await doc.save()
    const file = new File([bytes as unknown as BlobPart], "meta.pdf")

    const blob = await editPdfMetadata(file, { title: "Only Title" })
    const edited = await PDFDocument.load(await blob.arrayBuffer())
    expect(edited.getSubject()).toBe("Keep Me")
    expect(edited.getTitle()).toBe("Only Title")
  })
})

describe("readPdfInfo", () => {
  it("reads metadata and page count", async () => {
    const doc = await PDFDocument.create()
    doc.setTitle("My Title")
    doc.setAuthor("An Author")
    doc.addPage()
    const bytes = await doc.save()
    const file = new File([bytes as unknown as BlobPart], "meta.pdf")
    const info = await readPdfInfo(file)
    expect(info.pageCount).toBe(1)
    expect(info.title).toBe("My Title")
    expect(info.author).toBe("An Author")
  })
})
