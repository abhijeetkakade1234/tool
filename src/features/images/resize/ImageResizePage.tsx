import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

export default function ImageResizePage() {
  const [files, setFiles] = useState<File[]>([])
  const [mode, setMode] = useState<"percent" | "pixels">("percent")
  const [percent, setPercent] = useState("50")
  const [width, setWidth] = useState("")
  const [height, setHeight] = useState("")
  const [lockAspect, setLockAspect] = useState(true)
  const [results, setResults] = useState<ResultEntry[]>([])
  const [busy, setBusy] = useState(false)

  async function resize() {
    setBusy(true)
    setResults([])
    const out: ResultEntry[] = []
    for (const file of files) {
      try {
        const bitmap = await decodeImage(file)
        try {
          let w = bitmap.width
          let h = bitmap.height
          if (mode === "percent") {
            const p = Number(percent)
            if (!p || p <= 0) throw new Error("Enter a valid percentage.")
            w = Math.max(1, Math.round((bitmap.width * p) / 100))
            h = Math.max(1, Math.round((bitmap.height * p) / 100))
          } else {
            const tw = width ? Number(width) : undefined
            const th = height ? Number(height) : undefined
            if (!tw && !th) throw new Error("Enter a width or a height.")
            if (lockAspect) {
              const scale = Math.min(
                tw ? tw / bitmap.width : Infinity,
                th ? th / bitmap.height : Infinity,
              )
              w = Math.max(1, Math.round(bitmap.width * scale))
              h = Math.max(1, Math.round(bitmap.height * scale))
            } else {
              w = tw ?? bitmap.width
              h = th ?? bitmap.height
            }
          }
          const type = outputTypeFor(file)
          const canvas = renderToCanvas(bitmap, { width: w, height: h })
          const blob = await encodeCanvas(canvas, type, type === "image/png" ? undefined : 0.92)
          const base = file.name.replace(/\.[^.]+$/, "")
          out.push({
            blob,
            filename: `${base}-${w}x${h}.${formatExtension[type]}`,
            note: `${w} × ${h}`,
          })
        } finally {
          bitmap.close()
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : `Failed to resize ${file.name}`)
      }
    }
    setResults(out)
    setBusy(false)
  }

  return (
    <ToolPage
      title="Resize Image"
      description="Resize by percentage or exact pixels. Aspect ratio is kept by default."
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
            <Tabs value={mode} onValueChange={(v) => setMode(v as "percent" | "pixels")}>
              <TabsList>
                <TabsTrigger value="percent">Percentage</TabsTrigger>
                <TabsTrigger value="pixels">Pixels</TabsTrigger>
              </TabsList>
            </Tabs>
            {mode === "percent" ? (
              <div className="max-w-40 space-y-2">
                <Label htmlFor="pct">Scale (%)</Label>
                <Input
                  id="pct"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={1000}
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                />
              </div>
            ) : (
              <div className="flex flex-wrap items-end gap-4">
                <div className="w-32 space-y-2">
                  <Label htmlFor="w">Width (px)</Label>
                  <Input
                    id="w"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                  />
                </div>
                <div className="w-32 space-y-2">
                  <Label htmlFor="h">Height (px)</Label>
                  <Input
                    id="h"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <Switch id="lock" checked={lockAspect} onCheckedChange={setLockAspect} />
                  <Label htmlFor="lock">Lock aspect ratio</Label>
                </div>
              </div>
            )}
            <Button onClick={resize} disabled={busy} className="w-full sm:w-auto">
              {busy ? "Resizing…" : `Resize ${files.length} image${files.length > 1 ? "s" : ""}`}
            </Button>
          </CardContent>
        </Card>
      )}
      <ResultList results={results} zipName="resized-images.zip" />
    </ToolPage>
  )
}
