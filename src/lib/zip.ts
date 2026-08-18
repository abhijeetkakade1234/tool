import JSZip from "jszip"

export async function zipBlobs(entries: { filename: string; blob: Blob }[]): Promise<Blob> {
  const zip = new JSZip()
  const used = new Set<string>()
  for (const { filename, blob } of entries) {
    let name = filename
    let n = 1
    while (used.has(name)) {
      const dot = filename.lastIndexOf(".")
      name =
        dot > 0
          ? `${filename.slice(0, dot)}-${n}${filename.slice(dot)}`
          : `${filename}-${n}`
      n++
    }
    used.add(name)
    zip.file(name, blob)
  }
  return await zip.generateAsync({ type: "blob" })
}
