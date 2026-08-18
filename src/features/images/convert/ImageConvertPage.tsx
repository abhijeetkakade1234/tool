import { useState } from "react"
import { toast } from "sonner"
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
import { Slider } from "@/components/ui/slider"
import { FileDropzone } from "@/components/FileDropzone"
import { FileQueue } from "@/components/FileQueue"
import { ResultList, type ResultEntry } from "@/components/ResultList"
import { ToolPage } from "@/components/ToolPage"
import { acceptedImageTypes, convertImage, type OutputFormat } from "@/lib/image"

export default function ImageConvertPage() {
  const [files, setFiles] = useState<File[]>([])
  const [format, setFormat] = useState<OutputFormat>("image/png")
  const [quality, setQuality] = useState(80)
  const [background, setBackground] = useState("#ffffff")
  const [results, setResults] = useState<ResultEntry[]>([])
  const [busy, setBusy] = useState(false)

  const lossy = format !== "image/png"

  async function convert() {
    setBusy(true)
    setResults([])
    const out: ResultEntry[] = []
    for (const file of files) {
      try {
        const r = await convertImage(file, format, {
          quality: lossy ? quality / 100 : undefined,
          background,
        })
        out.push(r)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : `Failed to convert ${file.name}`)
      }
    }
    setResults(out)
    setBusy(false)
  }

  return (
    <ToolPage
      title="Convert Image"
      description="Convert JPG, PNG and WebP in any direction. Runs entirely in your browser."
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
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Output format</Label>
                <Select value={format} onValueChange={(v) => setFormat(v as OutputFormat)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image/png">PNG (lossless)</SelectItem>
                    <SelectItem value="image/jpeg">JPG</SelectItem>
                    <SelectItem value="image/webp">WebP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {lossy && (
                <div className="space-y-2">
                  <Label>Quality: {quality}</Label>
                  <Slider
                    value={[quality]}
                    min={10}
                    max={100}
                    step={5}
                    onValueChange={([v]) => setQuality(v)}
                  />
                </div>
              )}
              {format === "image/jpeg" && (
                <div className="space-y-2">
                  <Label htmlFor="bg">Background (for transparency)</Label>
                  <input
                    id="bg"
                    type="color"
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                    className="h-9 w-16 cursor-pointer rounded-md border bg-transparent p-1"
                  />
                </div>
              )}
            </div>
            <Button onClick={convert} disabled={busy} className="w-full sm:w-auto">
              {busy ? "Converting…" : `Convert ${files.length} image${files.length > 1 ? "s" : ""}`}
            </Button>
          </CardContent>
        </Card>
      )}
      <ResultList results={results} zipName="converted-images.zip" />
    </ToolPage>
  )
}
