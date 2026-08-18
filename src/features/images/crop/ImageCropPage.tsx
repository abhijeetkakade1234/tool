import { useRef, useState } from "react"
import type { PointerEvent } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileDropzone } from "@/components/FileDropzone"
import { ResultList, type ResultEntry } from "@/components/ResultList"
import { ToolPage } from "@/components/ToolPage"
import {
  acceptedImageTypes,
  encodeCanvas,
  formatExtension,
  type OutputFormat,
} from "@/lib/image"

type Aspect = "free" | "1:1" | "4:3" | "16:9"
const aspectValue: Record<Exclude<Aspect, "free">, number> = {
  "1:1": 1,
  "4:3": 4 / 3,
  "16:9": 16 / 9,
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export default function ImageCropPage() {
  const [file, setFile] = useState<File | null>(null)
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [aspect, setAspect] = useState<Aspect>("free")
  const [rect, setRect] = useState<Rect | null>(null)
  const [results, setResults] = useState<ResultEntry[]>([])
  const [busy, setBusy] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)

  function onFile(files: File[]) {
    const f = files[0]
    if (imgUrl) URL.revokeObjectURL(imgUrl)
    setFile(f)
    setImgUrl(URL.createObjectURL(f))
    setRect(null)
    setResults([])
  }

  function localPoint(e: PointerEvent): { x: number; y: number } {
    const el = imgRef.current!
    const b = el.getBoundingClientRect()
    return {
      x: Math.min(Math.max(e.clientX - b.left, 0), b.width),
      y: Math.min(Math.max(e.clientY - b.top, 0), b.height),
    }
  }

  function constrain(start: { x: number; y: number }, cur: { x: number; y: number }): Rect {
    let w = cur.x - start.x
    let h = cur.y - start.y
    if (aspect !== "free") {
      const ratio = aspectValue[aspect]
      const signW = w < 0 ? -1 : 1
      const signH = h < 0 ? -1 : 1
      if (Math.abs(w) / ratio > Math.abs(h)) {
        h = (Math.abs(w) / ratio) * signH
      } else {
        w = Math.abs(h) * ratio * signW
      }
    }
    return {
      x: w < 0 ? start.x + w : start.x,
      y: h < 0 ? start.y + h : start.y,
      w: Math.abs(w),
      h: Math.abs(h),
    }
  }

  function onPointerDown(e: PointerEvent) {
    e.preventDefault()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    dragStart.current = localPoint(e)
    setRect(null)
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragStart.current) return
    setRect(constrain(dragStart.current, localPoint(e)))
  }

  function onPointerUp() {
    dragStart.current = null
  }

  async function crop() {
    if (!file || !rect || !imgRef.current || rect.w < 2 || rect.h < 2) return
    setBusy(true)
    try {
      const img = imgRef.current
      const scaleX = img.naturalWidth / img.clientWidth
      const scaleY = img.naturalHeight / img.clientHeight
      const sx = Math.round(rect.x * scaleX)
      const sy = Math.round(rect.y * scaleY)
      const sw = Math.max(1, Math.round(rect.w * scaleX))
      const sh = Math.max(1, Math.round(rect.h * scaleY))
      const canvas = document.createElement("canvas")
      canvas.width = sw
      canvas.height = sh
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Canvas 2D context is not available.")
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
      const type: OutputFormat =
        file.type === "image/jpeg" || file.type === "image/webp" ? file.type : "image/png"
      const blob = await encodeCanvas(canvas, type, type === "image/png" ? undefined : 0.92)
      const base = file.name.replace(/\.[^.]+$/, "")
      setResults([
        { blob, filename: `${base}-cropped.${formatExtension[type]}`, note: `${sw} × ${sh}` },
      ])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Crop failed.")
    }
    setBusy(false)
  }

  return (
    <ToolPage
      title="Crop Image"
      description="Drag on the image to select an area, then crop at full resolution."
    >
      <FileDropzone
        accept={acceptedImageTypes}
        multiple={false}
        onFiles={onFile}
        label="Drop an image here"
      />
      {imgUrl && (
        <Card>
          <CardContent className="space-y-4">
            <Tabs
              value={aspect}
              onValueChange={(v) => {
                setAspect(v as Aspect)
                setRect(null)
              }}
            >
              <TabsList>
                <TabsTrigger value="free">Free</TabsTrigger>
                <TabsTrigger value="1:1">1:1</TabsTrigger>
                <TabsTrigger value="4:3">4:3</TabsTrigger>
                <TabsTrigger value="16:9">16:9</TabsTrigger>
              </TabsList>
            </Tabs>
            <div
              className="relative inline-block max-w-full touch-none select-none"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              <img
                ref={imgRef}
                src={imgUrl}
                alt={file?.name ?? "Image to crop"}
                className="max-h-[70vh] max-w-full cursor-crosshair rounded-md"
                draggable={false}
              />
              {rect && rect.w > 1 && (
                <div
                  className="pointer-events-none absolute border-2 border-primary bg-primary/15"
                  style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
                />
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={crop} disabled={busy || !rect || rect.w < 2}>
                {busy ? "Cropping…" : "Crop"}
              </Button>
              {rect && rect.w > 1 && imgRef.current && (
                <span className="text-sm text-muted-foreground">
                  {Math.round((rect.w * imgRef.current.naturalWidth) / imgRef.current.clientWidth)}{" "}
                  ×{" "}
                  {Math.round(
                    (rect.h * imgRef.current.naturalHeight) / imgRef.current.clientHeight,
                  )}{" "}
                  px
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      <ResultList results={results} />
    </ToolPage>
  )
}
