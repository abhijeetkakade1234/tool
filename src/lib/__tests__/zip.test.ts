import JSZip from "jszip"
import { describe, expect, it } from "vitest"
import { zipBlobs } from "../zip"

describe("zipBlobs", () => {
  it("packs all entries into a zip", async () => {
    const zip = await zipBlobs([
      { filename: "a.txt", blob: new Blob(["hello"]) },
      { filename: "b.txt", blob: new Blob(["world"]) },
    ])
    const loaded = await JSZip.loadAsync(await zip.arrayBuffer())
    expect(Object.keys(loaded.files).sort()).toEqual(["a.txt", "b.txt"])
    expect(await loaded.files["a.txt"].async("string")).toBe("hello")
  })

  it("deduplicates colliding filenames", async () => {
    const zip = await zipBlobs([
      { filename: "page.pdf", blob: new Blob(["one"]) },
      { filename: "page.pdf", blob: new Blob(["two"]) },
      { filename: "page.pdf", blob: new Blob(["three"]) },
    ])
    const loaded = await JSZip.loadAsync(await zip.arrayBuffer())
    expect(Object.keys(loaded.files).sort()).toEqual([
      "page-1.pdf",
      "page-2.pdf",
      "page.pdf",
    ])
    expect(await loaded.files["page-2.pdf"].async("string")).toBe("three")
  })
})
