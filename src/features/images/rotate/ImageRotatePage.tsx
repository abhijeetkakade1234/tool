import { useState } from "react"
import { toast } from "sonner"
import { FlipHorizontal, FlipVertical, RotateCcw, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FileDropzone } from "@/components/FileDropzone"
import { FileQueue } from "@/components/FileQueue"
import { ResultList, type ResultEntry } from "@/components/ResultList"
import { ToolPage } from "@/components/ToolPage"
import {
  acceptedImageTypes,
  decodeImage,
  encodeCanvas,
  formatExtension,
  renderToCanvas,
  type OutputFormat,
} from "@/lib/image"

function outputTypeFor(file: File): OutputFormat {
  if (file.type === "image/jpeg" || file.type === "image/webp") return file.type
  return "image/png"
}

export default function ImageRotatePage() {
  const [files, setFiles] = useState<File[]>([])
  const [rotate, setRotate] = useState(0)
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)
  const [results, setResults] = useState<ResultEntry[]>([])
  const [busy, setBusy] = useState(false)

  const noop = rotate === 0 && !flipH && !flipV

  async function apply() {
    setBusy(true)
    setResults([])
    const out: ResultEntry[] = []
    for (const file of files) {
      try {
        const bitmap = await decodeImage(file)
        try {
          const type = outputTypeFor(file)
          const canvas = renderToCanvas(bitmap, { rotate, flipH, flipV })
          const blob = await encodeCanvas(canvas, type, type === "image/png" ? undefined : 0.92)
          const base = file.name.replace(/\.[^.]+$/, "")
          out.push({ blob, filename: `${base}-rotated.${formatExtension[type]}` })
        } finally {
          bitmap.close()
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : `Failed to process ${file.name}`)
      }
    }
    setResults(out)
    setBusy(false)
  }

  return (
    <ToolPage
      title="Rotate / Flip Image"
      description="Rotate in 90° steps or mirror horizontally and vertically."
    >
      <FileDropzone
        accept={acceptedImageTypes}
        onFiles={(f) => {
          setFiles((prev) => [...prev, ...f])
          setResults([])
        }}
        label="Drop images here"
      />
      <FileQueue files={files} onChange={setFiles} />
      {files.length > 0 && (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setRotate((r) => (r + 90) % 360)}>
                <RotateCw className="size-4" aria-hidden /> 90° right
              </Button>
              <Button variant="outline" onClick={() => setRotate((r) => (r + 270) % 360)}>
                <RotateCcw className="size-4" aria-hidden /> 90° left
              </Button>
              <Button
                variant={flipH ? "default" : "outline"}
                onClick={() => setFlipH((v) => !v)}
              >
                <FlipHorizontal className="size-4" aria-hidden /> Flip H
              </Button>
              <Button
                variant={flipV ? "default" : "outline"}
                onClick={() => setFlipV((v) => !v)}
              >
                <FlipVertical className="size-4" aria-hidden /> Flip V
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Current: rotate {rotate}°{flipH ? " · flipped horizontally" : ""}
              {flipV ? " · flipped vertically" : ""}
            </p>
            <Button onClick={apply} disabled={busy || noop} className="w-full sm:w-auto">
              {busy ? "Processing…" : `Apply to ${files.length} image${files.length > 1 ? "s" : ""}`}
            </Button>
          </CardContent>
        </Card>
      )}
      <ResultList results={results} zipName="rotated-images.zip" />
    </ToolPage>
  )
}
