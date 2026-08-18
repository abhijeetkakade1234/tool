import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import { formatBytes, stripExtension } from "@/lib/file"
import { getPageCount } from "@/lib/pdf"
import { compressPdf } from "@/lib/pdfCompress"

export default function PdfCompressPage() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [quality, setQuality] = useState(60)
  const [scale, setScale] = useState("1.5")
  const [progress, setProgress] = useState<number | null>(null)
  const [results, setResults] = useState<ResultEntry[]>([])
  const [busy, setBusy] = useState(false)

  async function onFile(files: File[]) {
    const f = files[0]
    setResults([])
    try {
      setPageCount(await getPageCount(f))
      setFile(f)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read PDF.")
    }
  }

  async function run() {
    if (!file) return
    setBusy(true)
    setResults([])
    setProgress(0)
    try {
      const blob = await compressPdf(file, {
        scale: Number(scale),
        quality: quality / 100,
        onProgress: (done, total) => setProgress(Math.round((done / total) * 100)),
      })
      const saved = file.size > 0 ? Math.round((1 - blob.size / file.size) * 100) : 0
      if (blob.size >= file.size) {
        toast.warning(
          "The compressed file is not smaller than the original. This PDF is probably already well optimized — keep the original.",
        )
      }
      setResults([
        {
          blob,
          filename: `${stripExtension(file.name)}-compressed.pdf`,
          note: `was ${formatBytes(file.size)} · saved ${saved}%`,
        },
      ])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Compression failed.")
    }
    setProgress(null)
    setBusy(false)
  }

  return (
    <ToolPage
      title="Compress PDF"
      description="Shrink a PDF by re-rendering its pages as JPEG. Best on scanned documents."
    >
      <FileDropzone accept="application/pdf" multiple={false} onFiles={onFile} label="Drop a PDF here" />
      {file && (
        <Card>
          <CardContent className="space-y-4">
            <p className="text-sm">
              <span className="font-medium">{file.name}</span>{" "}
              <span className="text-muted-foreground">
                · {pageCount} pages · {formatBytes(file.size)}
              </span>
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Quality: {quality}</Label>
                <Slider
                  value={[quality]}
                  min={20}
                  max={95}
                  step={5}
                  onValueChange={([v]) => setQuality(v)}
                />
              </div>
              <div className="space-y-2">
                <Label>Sharpness</Label>
                <Select value={scale} onValueChange={setScale}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Smaller file (72 DPI)</SelectItem>
                    <SelectItem value="1.5">Balanced (108 DPI)</SelectItem>
                    <SelectItem value="2">Sharper (144 DPI)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Note: pages are converted to images, so text in the output can't be selected
              or searched. Your original file is untouched.
            </p>
            {progress !== null && <Progress value={progress} />}
            <Button onClick={run} disabled={busy} className="w-full sm:w-auto">
              {busy ? "Compressing…" : "Compress PDF"}
            </Button>
          </CardContent>
        </Card>
      )}
      <ResultList results={results} />
    </ToolPage>
  )
}
