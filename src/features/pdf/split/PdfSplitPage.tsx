import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileDropzone } from "@/components/FileDropzone"
import { ResultList, type ResultEntry } from "@/components/ResultList"
import { ToolPage } from "@/components/ToolPage"
import { stripExtension } from "@/lib/file"
import { extractPages, getPageCount, parsePageRanges, parseRangeGroups } from "@/lib/pdf"

type Mode = "extract" | "ranges" | "all"

export default function PdfSplitPage() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [mode, setMode] = useState<Mode>("extract")
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
    const base = stripExtension(file.name)
    try {
      if (mode === "extract") {
        const pages = parsePageRanges(ranges, pageCount)
        const blob = await extractPages(file, pages)
        setResults([{ blob, filename: `${base}-extracted.pdf`, note: `${pages.length} pages` }])
      } else if (mode === "ranges") {
        const groups = parseRangeGroups(ranges, pageCount)
        const out: ResultEntry[] = []
        for (const g of groups) {
          const blob = await extractPages(file, g.pages)
          out.push({ blob, filename: `${base}-pages-${g.label}.pdf` })
        }
        setResults(out)
      } else {
        const out: ResultEntry[] = []
        for (let p = 1; p <= pageCount; p++) {
          const blob = await extractPages(file, [p])
          out.push({ blob, filename: `${base}-page-${String(p).padStart(2, "0")}.pdf` })
        }
        setResults(out)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Split failed.")
    }
    setBusy(false)
  }

  return (
    <ToolPage
      title="Split / Extract Pages"
      description="Pull pages out of a PDF — as one new file, one file per range, or every page separately."
    >
      <FileDropzone accept="application/pdf" multiple={false} onFiles={onFile} label="Drop a PDF here" />
      {file && (
        <Card>
          <CardContent className="space-y-4">
            <p className="text-sm">
              <span className="font-medium">{file.name}</span>{" "}
              <span className="text-muted-foreground">· {pageCount} pages</span>
            </p>
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <TabsList className="flex-wrap">
                <TabsTrigger value="extract">One new PDF</TabsTrigger>
                <TabsTrigger value="ranges">File per range</TabsTrigger>
                <TabsTrigger value="all">Every page</TabsTrigger>
              </TabsList>
            </Tabs>
            {mode !== "all" && (
              <div className="space-y-2">
                <Label htmlFor="ranges">Pages (e.g. 1-3, 5, 8-10)</Label>
                <Input
                  id="ranges"
                  value={ranges}
                  placeholder="1-3, 5"
                  onChange={(e) => setRanges(e.target.value)}
                />
              </div>
            )}
            <Button
              onClick={run}
              disabled={busy || (mode !== "all" && !ranges.trim())}
              className="w-full sm:w-auto"
            >
              {busy ? "Working…" : "Split PDF"}
            </Button>
          </CardContent>
        </Card>
      )}
      <ResultList results={results} zipName={file ? `${stripExtension(file.name)}-split.zip` : "split.zip"} />
    </ToolPage>
  )
}
