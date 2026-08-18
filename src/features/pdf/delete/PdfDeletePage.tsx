import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileDropzone } from "@/components/FileDropzone"
import { ResultList, type ResultEntry } from "@/components/ResultList"
import { ToolPage } from "@/components/ToolPage"
import { stripExtension } from "@/lib/file"
import { deletePages, getPageCount, parsePageRanges } from "@/lib/pdf"

export default function PdfDeletePage() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [ranges, setRanges] = useState("")
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
      const pages = parsePageRanges(ranges, pageCount)
      const blob = await deletePages(file, pages)
      setResults([
        {
          blob,
          filename: `${stripExtension(file.name)}-trimmed.pdf`,
          note: `removed ${pages.length} page${pages.length > 1 ? "s" : ""}`,
        },
      ])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed.")
    }
    setBusy(false)
  }

  return (
    <ToolPage title="Delete Pages" description="Remove pages you don't need from a PDF.">
      <FileDropzone accept="application/pdf" multiple={false} onFiles={onFile} label="Drop a PDF here" />
      {file && (
        <Card>
          <CardContent className="space-y-4">
            <p className="text-sm">
              <span className="font-medium">{file.name}</span>{" "}
              <span className="text-muted-foreground">· {pageCount} pages</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="ranges">Pages to delete (e.g. 2, 4-6)</Label>
              <Input
                id="ranges"
                value={ranges}
                placeholder="2, 4-6"
                onChange={(e) => setRanges(e.target.value)}
              />
            </div>
            <Button onClick={run} disabled={busy || !ranges.trim()} className="w-full sm:w-auto">
              {busy ? "Working…" : "Delete pages"}
            </Button>
          </CardContent>
        </Card>
      )}
      <ResultList results={results} />
    </ToolPage>
  )
}
