import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FileDropzone } from "@/components/FileDropzone"
import { ResultList, type ResultEntry } from "@/components/ResultList"
import { ToolPage } from "@/components/ToolPage"
import { acceptedImageTypes, decodeImage } from "@/lib/image"
import { buildIco } from "@/lib/ico"

const PNG_SIZES = [16, 32, 180, 192, 512] as const
const ICO_SIZES = [16, 32, 48] as const

const SNIPPET = `<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<!-- PWA manifest icons: icon-192.png and icon-512.png -->`

function squareCrop(bitmap: ImageBitmap, size: number): HTMLCanvasElement {
  const side = Math.min(bitmap.width, bitmap.height)
  const sx = (bitmap.width - side) / 2
  const sy = (bitmap.height - side) / 2
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas 2D context is not available.")
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size)
  return canvas
}

async function toPng(canvas: HTMLCanvasElement): Promise<ArrayBuffer> {
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"))
  if (!blob) throw new Error("PNG encoding failed.")
  return await blob.arrayBuffer()
}

const PNG_NAMES: Record<number, string> = {
  16: "favicon-16.png",
  32: "favicon-32.png",
  180: "apple-touch-icon.png",
  192: "icon-192.png",
  512: "icon-512.png",
}

export default function FaviconPage() {
  const [file, setFile] = useState<File | null>(null)
  const [results, setResults] = useState<ResultEntry[]>([])
  const [busy, setBusy] = useState(false)

  async function run() {
    if (!file) return
    setBusy(true)
    setResults([])
    try {
      const bitmap = await decodeImage(file)
      try {
        const out: ResultEntry[] = []
        for (const size of PNG_SIZES) {
          const png = await toPng(squareCrop(bitmap, size))
          out.push({
            blob: new Blob([png], { type: "image/png" }),
            filename: PNG_NAMES[size],
            note: `${size} × ${size}`,
          })
        }
        const icoImages = []
        for (const size of ICO_SIZES) {
          icoImages.push({ size, png: await toPng(squareCrop(bitmap, size)) })
        }
        out.unshift({
          blob: buildIco(icoImages),
          filename: "favicon.ico",
          note: "16 + 32 + 48",
        })
        out.push({
          blob: new Blob([SNIPPET], { type: "text/html" }),
          filename: "snippet.html",
          note: "HTML tags to paste in <head>",
        })
        setResults(out)
      } finally {
        bitmap.close()
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Favicon generation failed.")
    }
    setBusy(false)
  }

  return (
    <ToolPage
      title="Favicon Generator"
      description="Turn any image into a full favicon set — ICO, PNGs, apple-touch and PWA sizes."
    >
      <FileDropzone
        accept={acceptedImageTypes}
        multiple={false}
        onFiles={(f) => {
          setFile(f[0])
          setResults([])
        }}
        label="Drop a square-ish image here"
        hint="It will be center-cropped to a square"
      />
      {file && (
        <Card>
          <CardContent className="space-y-3">
            <p className="text-sm">
              <span className="font-medium">{file.name}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Output: favicon.ico (16/32/48), favicon-16/32.png, apple-touch-icon.png (180),
              icon-192.png, icon-512.png, plus a ready-to-paste HTML snippet.
            </p>
            <Button onClick={run} disabled={busy} className="w-full sm:w-auto">
              {busy ? "Generating…" : "Generate favicon set"}
            </Button>
          </CardContent>
        </Card>
      )}
      <ResultList results={results} zipName="favicons.zip" />
    </ToolPage>
  )
}
