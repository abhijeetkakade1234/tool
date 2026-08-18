/**
 * Build a .ico file from pre-encoded PNG images.
 * Modern Windows and all browsers accept PNG-compressed ICO entries.
 */
export function buildIco(images: { size: number; png: ArrayBuffer }[]): Blob {
  const HEADER = 6
  const ENTRY = 16
  const dataOffset = HEADER + ENTRY * images.length
  const totalSize = dataOffset + images.reduce((n, i) => n + i.png.byteLength, 0)

  const buffer = new ArrayBuffer(totalSize)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  // ICONDIR: reserved(2)=0, type(2)=1 (icon), count(2)
  view.setUint16(0, 0, true)
  view.setUint16(2, 1, true)
  view.setUint16(4, images.length, true)

  let offset = dataOffset
  images.forEach((img, i) => {
    const e = HEADER + ENTRY * i
    // width/height: one byte each, 0 means 256
    view.setUint8(e, img.size >= 256 ? 0 : img.size)
    view.setUint8(e + 1, img.size >= 256 ? 0 : img.size)
    view.setUint8(e + 2, 0) // palette colors
    view.setUint8(e + 3, 0) // reserved
    view.setUint16(e + 4, 1, true) // color planes
    view.setUint16(e + 6, 32, true) // bits per pixel
    view.setUint32(e + 8, img.png.byteLength, true)
    view.setUint32(e + 12, offset, true)
    bytes.set(new Uint8Array(img.png), offset)
    offset += img.png.byteLength
  })

  return new Blob([buffer], { type: "image/x-icon" })
}
