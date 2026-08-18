import { useRef, useState } from "react"
import type { PointerEvent } from "react"
import { toast } from "sonner"
import { Eraser } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { FileDropzone } from "@/components/FileDropzone"
import { ResultList, type ResultEntry } from "@/components/ResultList"
import { ToolPage } from "@/components/ToolPage"
import { stripExtension } from "@/lib/file"
import { getPageCount, parsePageRanges } from "@/lib/pdf"
import { stampImageOnPdf, type StampPosition } from "@/lib/pdfStamp"

const PAD_W = 500
const PAD_H = 200

/** Crop the drawing to its inked bounding box (with padding) for tighter placement. */
function trimCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = source.getContext("2d")!
  const { data, width, height } = ctx.getImageData(0, 0, source.width, source.height)
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 0) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return source
  const pad = 6
  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(width - 1, maxX + pad)
  maxY = Math.min(height - 1, maxY + pad)
  const out = document.createElement("canvas")
  out.width = maxX - minX + 1
  out.height = maxY - minY + 1
  out.getContext("2d")!.drawImage(source, -minX, -minY)
  return out
}

export default function PdfSignPage() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [pages, setPages] = useState("")
  const [position, setPosition] = useState<StampPosition>("bottom-right")
  const [widthPct, setWidthPct] = useState(25)
  const [hasInk, setHasInk] = useState(false)
  const [results, setResults] = useState<ResultEntry[]>([])
  const [busy, setBusy] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)

  async function onFile(files: File[]) {
    const f = files[0]
    setResults([])
    try {
      const count = await getPageCount(f)
      setPageCount(count)
      setFile(f)
      setPages(String(count)) // default: sign the last page
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read PDF.")
    }
  }

  function point(e: PointerEvent) {
    const canvas = canvasRef.current!
    const b = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - b.left) / b.width) * canvas.width,
      y: ((e.clientY - b.top) / b.height) * canvas.height,
    }
  }

  function onPointerDown(e: PointerEvent) {
    e.preventDefault()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    drawing.current = true
    const ctx = canvasRef.current!.getContext("2d")!
    const p = point(e)
    ctx.beginPath()
    ctx.lineWidth = 3
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = "#111827"
    ctx.moveTo(p.x, p.y)
    // A dot for taps.
    ctx.lineTo(p.x + 0.1, p.y + 0.1)
    ctx.stroke()
    setHasInk(true)
  }

  function onPointerMove(e: PointerEvent) {
    if (!drawing.current) return
    const ctx = canvasRef.current!.getContext("2d")!
    const p = point(e)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }

  function onPointerUp() {
    drawing.current = false
  }

  function clear() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height)
    setHasInk(false)
  }

  async function apply() {
    if (!file || !canvasRef.current) return
    setBusy(true)
    setResults([])
    try {
      const pageList = parsePageRanges(pages, pageCount)
      const trimmed = trimCanvas(canvasRef.current)
      const png = await new Promise<Blob | null>((r) => trimmed.toBlob(r, "image/png"))
      if (!png) throw new Error("Could not encode the signature.")
      const blob = await stampImageOnPdf(file, await png.arrayBuffer(), {
        pages: pageList,
        position,
        widthPct,
      })
      setResults([{ blob, filename: `${stripExtension(file.name)}-signed.pdf` }])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Signing failed.")
    }
    setBusy(false)
  }

  return (
    <ToolPage
      title="Sign / Stamp PDF"
      description="Draw a signature and place it on any page. Nothing is uploaded anywhere."
    >
      <FileDropzone accept="application/pdf" multiple={false} onFiles={onFile} label="Drop a PDF here" />
      {file && (
        <Card>
          <CardContent className="space-y-4">
            <p className="text-sm">
              <span className="font-medium">{file.name}</span>{" "}
              <span className="text-muted-foreground">· {pageCount} pages</span>
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Draw your signature</Label>
                <Button variant="ghost" size="sm" onClick={clear} disabled={!hasInk}>
                  <Eraser className="size-4" aria-hidden /> Clear
                </Button>
              </div>
              <canvas
                ref={canvasRef}
                width={PAD_W}
                height={PAD_H}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                className="w-full max-w-lg cursor-crosshair touch-none rounded-md border bg-white dark:bg-neutral-100"
                aria-label="Signature drawing area"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="pages">Pages (e.g. 1, 3-4)</Label>
                <Input id="pages" value={pages} onChange={(e) => setPages(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Position</Label>
                <Select value={position} onValueChange={(v) => setPosition(v as StampPosition)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-right">Bottom right</SelectItem>
                    <SelectItem value="bottom-left">Bottom left</SelectItem>
                    <SelectItem value="top-right">Top right</SelectItem>
                    <SelectItem value="top-left">Top left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Size: {widthPct}% of page width</Label>
                <Slider
                  value={[widthPct]}
                  min={10}
                  max={50}
                  step={5}
                  onValueChange={([v]) => setWidthPct(v)}
                />
              </div>
            </div>
            <Button
              onClick={apply}
              disabled={busy || !hasInk || !pages.trim()}
              className="w-full sm:w-auto"
            >
              {busy ? "Signing…" : "Sign PDF"}
            </Button>
          </CardContent>
        </Card>
      )}
      <ResultList results={results} />
    </ToolPage>
  )
}
