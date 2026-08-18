import { useState } from "react"
import { heicTo, isHeic } from "heic-to"
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
import { stripExtension } from "@/lib/file"

type Format = "image/jpeg" | "image/png"

export default function HeicConvertPage() {
  const [files, setFiles] = useState<File[]>([])
  const [format, setFormat] = useState<Format>("image/jpeg")
  const [quality, setQuality] = useState(85)
  const [results, setResults] = useState<ResultEntry[]>([])
  const [busy, setBusy] = useState(false)

  async function onFiles(added: File[]) {
    const accepted: File[] = []
    for (const file of added) {
      // File pickers often report no MIME type for HEIC; verify by content.
      if (await isHeic(file).catch(() => false)) {
        accepted.push(file)
      } else {
        toast.error(`"${file.name}" is not a HEIC/HEIF file.`)
      }
    }
    if (accepted.length > 0) {
      setFiles((prev) => [...prev, ...accepted])
      setResults([])
    }
  }

  async function convert() {
    setBusy(true)
    setResults([])
    const out: ResultEntry[] = []
    for (const file of files) {
      try {
        const blob = await heicTo({
          blob: file,
          type: format,
          quality: format === "image/jpeg" ? quality / 100 : undefined,
        })
        const ext = format === "image/jpeg" ? "jpg" : "png"
        out.push({ blob, filename: `${stripExtension(file.name)}.${ext}` })
      } catch {
        toast.error(`"${file.name}" could not be converted. The file may be corrupted.`)
      }
    }
    setResults(out)
    setBusy(false)
  }

  return (
    <ToolPage
      title="HEIC → JPG / PNG"
      description="Convert iPhone HEIC photos to formats that work everywhere. Fully local."
    >
      <FileDropzone
        accept=".heic,.heif,image/heic,image/heif"
        onFiles={onFiles}
        label="Drop HEIC photos here"
      />
      <FileQueue files={files} onChange={setFiles} />
      {files.length > 0 && (
        <Card>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Output format</Label>
                <Select value={format} onValueChange={(v) => setFormat(v as Format)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image/jpeg">JPG</SelectItem>
                    <SelectItem value="image/png">PNG (lossless)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {format === "image/jpeg" && (
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
            </div>
            <Button onClick={convert} disabled={busy} className="w-full sm:w-auto">
              {busy
                ? "Converting…"
                : `Convert ${files.length} photo${files.length > 1 ? "s" : ""}`}
            </Button>
          </CardContent>
        </Card>
      )}
      <ResultList results={results} zipName="converted-photos.zip" />
    </ToolPage>
  )
}
