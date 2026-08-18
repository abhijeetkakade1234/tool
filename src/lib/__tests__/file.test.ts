import { describe, expect, it } from "vitest"
import { formatBytes, stripExtension } from "../file"

describe("formatBytes", () => {
  it("formats zero", () => {
    expect(formatBytes(0)).toBe("0 B")
  })

  it("formats bytes below 1 KB", () => {
    expect(formatBytes(512)).toBe("512 B")
  })

  it("formats kilobytes", () => {
    expect(formatBytes(1024)).toBe("1.0 KB")
    expect(formatBytes(1536)).toBe("1.5 KB")
  })

  it("rounds three-digit values to whole numbers", () => {
    expect(formatBytes(150 * 1024)).toBe("150 KB")
  })

  it("formats megabytes and gigabytes", () => {
    expect(formatBytes(2.8 * 1024 * 1024)).toBe("2.8 MB")
    expect(formatBytes(3 * 1024 * 1024 * 1024)).toBe("3.0 GB")
  })
})

describe("stripExtension", () => {
  it("removes the extension", () => {
    expect(stripExtension("document.pdf")).toBe("document")
  })

  it("keeps names without an extension", () => {
    expect(stripExtension("README")).toBe("README")
  })

  it("only strips the last extension", () => {
    expect(stripExtension("archive.tar.gz")).toBe("archive.tar")
  })

  it("keeps dotfiles intact", () => {
    expect(stripExtension(".gitignore")).toBe(".gitignore")
  })
})
