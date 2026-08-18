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
import { Switch } from "@/components/ui/switch"
import { FileDropzone } from "@/components/FileDropzone"
import { ResultList, type ResultEntry } from "@/components/ResultList"
import { ToolPage } from "@/components/ToolPage"
import { stripExtension } from "@/lib/file"
import { getPageCount, parsePageRanges, rotatePdfPages } from "@/lib/pdf"

export default function PdfRotatePage() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [allPages, setAllPages] = useState(true)
  const [ranges, setRanges] = useState("")
  const [angle, setAngle] = useState("90")
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
    try {
      const pages = allPages ? null : parsePageRanges(ranges, pageCount)
      const blob = await rotatePdfPages(file, pages, Number(angle))
      setResults([{ blob, filename: `${stripExtension(file.name)}-rotated.pdf` }])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rotate failed.")
    }
    setBusy(false)
  }

  return (
    <ToolPage title="Rotate Pages" description="Rotate all pages or a selection, in 90° steps.">
      <FileDropzone accept="application/pdf" multiple={false} onFiles={onFile} label="Drop a PDF here" />
      {file && (
        <Card>
          <CardContent className="space-y-4">
            <p className="text-sm">
              <span className="font-medium">{file.name}</span>{" "}
              <span className="text-muted-foreground">· {pageCount} pages</span>
            </p>
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-44 space-y-2">
                <Label>Rotation</Label>
                <Select value={angle} onValueChange={setAngle}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="90">90° clockwise</SelectItem>
                    <SelectItem value="180">180°</SelectItem>
                    <SelectItem value="270">90° counter-clockwise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch id="all" checked={allPages} onCheckedChange={setAllPages} />
                <Label htmlFor="all">All pages</Label>
              </div>
              {!allPages && (
                <div className="w-48 space-y-2">
                  <Label htmlFor="ranges">Pages (e.g. 1, 3-5)</Label>
                  <Input
                    id="ranges"
                    value={ranges}
                    placeholder="1, 3-5"
                    onChange={(e) => setRanges(e.target.value)}
                  />
                </div>
              )}
            </div>
            <Button
              onClick={run}
              disabled={busy || (!allPages && !ranges.trim())}
              className="w-full sm:w-auto"
            >
              {busy ? "Working…" : "Rotate PDF"}
            </Button>
          </CardContent>
        </Card>
      )}
      <ResultList results={results} />
    </ToolPage>
  )
}
