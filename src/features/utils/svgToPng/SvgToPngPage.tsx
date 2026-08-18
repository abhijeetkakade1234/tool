import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileDropzone } from "@/components/FileDropzone"
import { FileQueue } from "@/components/FileQueue"
import { ResultList, type ResultEntry } from "@/components/ResultList"
import { ToolPage } from "@/components/ToolPage"
import { stripExtension } from "@/lib/file"

async function svgToPng(file: File, targetWidth: number): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode().catch(() => {
      throw new Error(`"${file.name}" could not be parsed as SVG.`)
    })
    // SVGs without explicit width/height report 0; fall back to a square.
    const naturalW = img.naturalWidth || targetWidth
    const naturalH = img.naturalHeight || targetWidth
    const scale = targetWidth / naturalW
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(naturalW * scale))
    canvas.height = Math.max(1, Math.round(naturalH * scale))
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas 2D context is not available.")
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"))
    if (!blob) throw new Error("PNG encoding failed.")
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}

export default function SvgToPngPage() {
  const [files, setFiles] = useState<File[]>([])
  const [width, setWidth] = useState("1024")
  const [results, setResults] = useState<ResultEntry[]>([])
  const [busy, setBusy] = useState(false)

  async function run() {
    const w = Number(width)
    if (!w || w < 1) {
      toast.error("Enter a valid output width.")
      return
    }
    setBusy(true)
    setResults([])
    const out: ResultEntry[] = []
    for (const file of files) {
      try {
        const blob = await svgToPng(file, w)
        out.push({ blob, filename: `${stripExtension(file.name)}-${w}w.png` })
      } catch (e) {
        toast.error(e instanceof Error ? e.message : `Failed to convert ${file.name}`)
      }
    }
    setResults(out)
    setBusy(false)
  }

  return (
    <ToolPage
      title="SVG → PNG"
      description="Rasterize SVG files to PNG at any width. Vector quality, no upload."
    >
      <FileDropzone
        accept=".svg,image/svg+xml"
        onFiles={(f) => {
          setFiles((prev) => [...prev, ...f])
          setResults([])
        }}
        label="Drop SVG files here"
      />
      <FileQueue files={files} onChange={setFiles} />
      {files.length > 0 && (
        <Card>
          <CardContent className="space-y-4">
            <div className="max-w-40 space-y-2">
              <Label htmlFor="w">Output width (px)</Label>
              <Input
                id="w"
                type="number"
                inputMode="numeric"
                min={1}
                max={8192}
                value={width}
                onChange={(e) => setWidth(e.target.value)}
              />
            </div>
            <Button onClick={run} disabled={busy} className="w-full sm:w-auto">
              {busy ? "Converting…" : `Convert ${files.length} file${files.length > 1 ? "s" : ""}`}
            </Button>
          </CardContent>
        </Card>
      )}
      <ResultList results={results} zipName="converted-svgs.zip" />
    </ToolPage>
  )
}
