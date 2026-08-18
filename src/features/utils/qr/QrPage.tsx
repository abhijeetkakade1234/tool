import { useEffect, useRef, useState } from "react"
import QRCode from "qrcode"
import jsQR from "jsqr"
import { toast } from "sonner"
import { Copy, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileDropzone } from "@/components/FileDropzone"
import { ToolPage } from "@/components/ToolPage"
import { downloadBlob } from "@/lib/file"
import { acceptedImageTypes, decodeImage } from "@/lib/image"

function Generator() {
  const [text, setText] = useState("")
  const [size, setSize] = useState("512")
  const [level, setLevel] = useState<"L" | "M" | "Q" | "H">("M")
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!text) {
      const ctx = canvas.getContext("2d")
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
      return
    }
    QRCode.toCanvas(canvas, text, {
      width: Number(size),
      errorCorrectionLevel: level,
      margin: 2,
    }).catch(() => toast.error("This text is too long for a QR code."))
  }, [text, size, level])

  function download() {
    canvasRef.current?.toBlob((blob) => {
      if (blob) downloadBlob(blob, "qr-code.png")
    }, "image/png")
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="qr-text">Text or URL</Label>
          <textarea
            id="qr-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="https://example.com"
            rows={3}
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Size</Label>
            <Select value={size} onValueChange={setSize}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="256">256 px</SelectItem>
                <SelectItem value="512">512 px</SelectItem>
                <SelectItem value="1024">1024 px</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Error correction</Label>
            <Select value={level} onValueChange={(v) => setLevel(v as typeof level)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="L">Low (smallest code)</SelectItem>
                <SelectItem value="M">Medium</SelectItem>
                <SelectItem value="Q">Quartile</SelectItem>
                <SelectItem value="H">High (most damage-proof)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3">
          <canvas
            ref={canvasRef}
            className="max-w-full rounded-md border bg-white [image-rendering:pixelated]"
            style={{ width: 256, height: 256 }}
            aria-label="Generated QR code"
          />
          <Button onClick={download} disabled={!text}>
            <Download className="size-4" aria-hidden /> Download PNG
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function Scanner() {
  const [decoded, setDecoded] = useState<string | null>(null)

  async function onFiles(files: File[]) {
    setDecoded(null)
    const file = files[0]
    try {
      const bitmap = await decodeImage(file)
      try {
        const canvas = document.createElement("canvas")
        canvas.width = bitmap.width
        canvas.height = bitmap.height
        const ctx = canvas.getContext("2d")
        if (!ctx) throw new Error("Canvas 2D context is not available.")
        ctx.drawImage(bitmap, 0, 0)
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const result = jsQR(data.data, data.width, data.height)
        if (result?.data) {
          setDecoded(result.data)
        } else {
          toast.error("No QR code found in this image.")
        }
      } finally {
        bitmap.close()
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read the image.")
    }
  }

  async function copy() {
    if (!decoded) return
    await navigator.clipboard.writeText(decoded)
    toast.success("Copied to clipboard")
  }

  const isUrl = decoded !== null && /^https?:\/\//i.test(decoded)

  return (
    <div className="space-y-4">
      <FileDropzone
        accept={acceptedImageTypes}
        multiple={false}
        onFiles={onFiles}
        label="Drop a QR code image here"
      />
      {decoded !== null && (
        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium">Decoded content</h3>
              <Button variant="ghost" size="icon" aria-label="Copy decoded text" onClick={copy}>
                <Copy className="size-4" aria-hidden />
              </Button>
            </div>
            <code className="block break-all rounded bg-muted px-2 py-1.5 text-sm">{decoded}</code>
            {isUrl && (
              <p className="text-xs text-muted-foreground">
                This is a link. Only open it if you trust the source.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function QrPage() {
  const [tab, setTab] = useState("generate")
  return (
    <ToolPage
      title="QR Code"
      description="Generate QR codes or decode them from images — nothing leaves your device."
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="scan">Scan image</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "generate" ? <Generator /> : <Scanner />}
    </ToolPage>
  )
}
