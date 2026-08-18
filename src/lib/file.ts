export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** i
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[i]}`
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Give the browser a moment to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function stripExtension(filename: string): string {
  const i = filename.lastIndexOf(".")
  return i > 0 ? filename.slice(0, i) : filename
}

export async function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return await file.arrayBuffer()
}
