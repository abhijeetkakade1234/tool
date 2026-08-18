import { useState } from "react"
import { toast } from "sonner"
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
import { FileQueue } from "@/components/FileQueue"
import { ResultList, type ResultEntry } from "@/components/ResultList"
import { ToolPage } from "@/components/ToolPage"
import { formatBytes } from "@/lib/file"
import { acceptedImageTypes, convertImage, type OutputFormat } from "@/lib/image"

export default function ImageCompressPage() {
  const [files, setFiles] = useState<File[]>([])
  const [format, setFormat] = useState<OutputFormat>("image/webp")
  const [quality, setQuality] = useState(75)
  const [maxWidth, setMaxWidth] = useState("")
  const [results, setResults] = useState<ResultEntry[]>([])
  const [busy, setBusy] = useState(false)

  async function compress() {
    setBusy(true)
    setResults([])
    const out: ResultEntry[] = []
    for (const file of files) {
      try {
        const r = await convertImage(file, format, {
          quality: quality / 100,
          maxWidth: maxWidth ? Number(maxWidth) : undefined,
        })
        const saved = file.size > 0 ? Math.round((1 - r.blob.size / file.size) * 100) : 0
        out.push({
          ...r,
          note: `was ${formatBytes(file.size)} · saved ${saved}%`,
        })
      } catch (e) {
        toast.error(e instanceof Error ? e.message : `Failed to compress ${file.name}`)
      }
    }
    setResults(out)
    setBusy(false)
  }

  return (
    <ToolPage
      title="Compress Image"
      description="Reduce file size with quality and dimension controls. Originals are never touched."
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
                    <SelectItem value="image/webp">WebP (best compression)</SelectItem>
                    <SelectItem value="image/jpeg">JPG</SelectItem>
                    <SelectItem value="image/png">PNG (lossless)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              <div className="space-y-2">
                <Label htmlFor="maxw">Max width (px, optional)</Label>
                <Input
                  id="maxw"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  placeholder="e.g. 1920"
                  value={maxWidth}
                  onChange={(e) => setMaxWidth(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={compress} disabled={busy} className="w-full sm:w-auto">
              {busy ? "Compressing…" : `Compress ${files.length} image${files.length > 1 ? "s" : ""}`}
            </Button>
          </CardContent>
        </Card>
      )}
      <ResultList results={results} zipName="compressed-images.zip" />
    </ToolPage>
  )
}
