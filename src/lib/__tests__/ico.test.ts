import { describe, expect, it } from "vitest"
import { buildIco } from "../ico"

// Smallest valid PNG signature prefix is enough for container tests.
const fakePng = (fill: number, length = 24): ArrayBuffer => {
  const buf = new Uint8Array(length)
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  buf.fill(fill, 8)
  return buf.buffer as ArrayBuffer
}

describe("buildIco", () => {
  it("writes a valid ICONDIR header", async () => {
    const blob = buildIco([
      { size: 16, png: fakePng(1) },
      { size: 32, png: fakePng(2) },
    ])
    const view = new DataView(await blob.arrayBuffer())
    expect(view.getUint16(0, true)).toBe(0) // reserved
    expect(view.getUint16(2, true)).toBe(1) // type: icon
    expect(view.getUint16(4, true)).toBe(2) // image count
  })

  it("writes entries with correct sizes and offsets", async () => {
    const blob = buildIco([
      { size: 16, png: fakePng(1, 20) },
      { size: 256, png: fakePng(2, 30) },
    ])
    const view = new DataView(await blob.arrayBuffer())
    // First entry starts at byte 6.
    expect(view.getUint8(6)).toBe(16) // width
    expect(view.getUint32(14, true)).toBe(20) // data size
    expect(view.getUint32(18, true)).toBe(6 + 16 * 2) // data offset after directory
    // Second entry: 256 encodes as 0.
    expect(view.getUint8(22)).toBe(0)
    expect(view.getUint32(30, true)).toBe(30)
    expect(view.getUint32(34, true)).toBe(6 + 16 * 2 + 20)
    expect(blob.size).toBe(6 + 32 + 20 + 30)
  })

  it("embeds the PNG payload verbatim", async () => {
    const blob = buildIco([{ size: 32, png: fakePng(7, 16) }])
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const payload = bytes.slice(6 + 16)
    expect([...payload.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47])
    expect(payload[15]).toBe(7)
  })
})
