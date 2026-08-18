import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
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
import { parsePageRanges } from "@/lib/pdf"
import { openPdfForRender, renderPageToBlob } from "@/lib/pdfRender"

type Format = "image/jpeg" | "image/png"

export default function PdfToImagesPage() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [format, setFormat] = useState<Format>("image/jpeg")
  const [quality, setQuality] = useState(85)
  const [scale, setScale] = useState("2")
  const [ranges, setRanges] = useState("")
  const [progress, setProgress] = useState<number | null>(null)
  const [results, setResults] = useState<ResultEntry[]>([])
  const [busy, setBusy] = useState(false)

  async function onFile(files: File[]) {
    const f = files[0]
    setResults([])
    try {
      const doc = await openPdfForRender(f)
      setPageCount(doc.numPages)
      setFile(f)
      await doc.loadingTask.destroy()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read PDF.")
    }
  }

  async function run() {
    if (!file) return
    setBusy(true)
    setResults([])
    setProgress(0)
    const base = stripExtension(file.name)
    const ext = format === "image/jpeg" ? "jpg" : "png"
    try {
      const pages = ranges.trim()
        ? parsePageRanges(ranges, pageCount)
        : Array.from({ length: pageCount }, (_, i) => i + 1)
      const doc = await openPdfForRender(file)
      const out: ResultEntry[] = []
      try {
        for (let i = 0; i < pages.length; i++) {
          const p = pages[i]
          const blob = await renderPageToBlob(doc, p, {
            scale: Number(scale),
            type: format,
            quality: format === "image/jpeg" ? quality / 100 : undefined,
          })
          out.push({ blob, filename: `${base}-page-${String(p).padStart(2, "0")}.${ext}` })
          setProgress(Math.round(((i + 1) / pages.length) * 100))
        }
      } finally {
        await doc.loadingTask.destroy()
      }
      setResults(out)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rendering failed.")
    }
    setProgress(null)
    setBusy(false)
  }

  return (
    <ToolPage
      title="PDF → Images"
      description="Render PDF pages to JPG or PNG. Multiple pages download as a ZIP."
    >
      <FileDropzone accept="application/pdf" multiple={false} onFiles={onFile} label="Drop a PDF here" />
      {file && (
        <Card>
          <CardContent className="space-y-4">
            <p className="text-sm">
              <span className="font-medium">{file.name}</span>{" "}
              <span className="text-muted-foreground">· {pageCount} pages</span>
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Format</Label>
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
              <div className="space-y-2">
                <Label>Resolution</Label>
                <Select value={scale} onValueChange={setScale}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Standard (72 DPI)</SelectItem>
                    <SelectItem value="2">High (144 DPI)</SelectItem>
                    <SelectItem value="3">Very high (216 DPI)</SelectItem>
                    <SelectItem value="4">Maximum (288 DPI)</SelectItem>
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
              <div className="space-y-2">
                <Label htmlFor="ranges">Pages (blank = all)</Label>
                <Input
                  id="ranges"
                  value={ranges}
                  placeholder="e.g. 1-3, 5"
                  onChange={(e) => setRanges(e.target.value)}
                />
              </div>
            </div>
            {progress !== null && <Progress value={progress} />}
            <Button onClick={run} disabled={busy} className="w-full sm:w-auto">
              {busy ? "Rendering…" : "Convert to images"}
            </Button>
          </CardContent>
        </Card>
      )}
      <ResultList
        results={results}
        zipName={file ? `${stripExtension(file.name)}-images.zip` : "images.zip"}
      />
    </ToolPage>
  )
}
