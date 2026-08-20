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
import { FileDropzone } from "@/components/FileDropzone"
import { FileQueue } from "@/components/FileQueue"
import { ResultList, type ResultEntry } from "@/components/ResultList"
import { ToolPage } from "@/components/ToolPage"
import { acceptedImageTypes } from "@/lib/image"
import { imagesToPdf, type PageSizeMode } from "@/lib/pdf"

type OutputMode = "combine" | "separate"

export default function ImagesToPdfPage() {
  const [files, setFiles] = useState<File[]>([])
  const [pageSize, setPageSize] = useState<PageSizeMode>("image")
  const [output, setOutput] = useState<OutputMode>("combine")
  const [results, setResults] = useState<ResultEntry[]>([])
  const [busy, setBusy] = useState(false)

  async function run() {
    setBusy(true)
    setResults([])
    try {
      if (output === "separate" && files.length > 1) {
        const entries: ResultEntry[] = []
        for (const file of files) {
          const blob = await imagesToPdf([file], pageSize)
          const base = file.name.replace(/\.[^.]+$/, "")
          entries.push({ blob, filename: `${base}.pdf`, note: "1 page" })
        }
        setResults(entries)
      } else {
        const blob = await imagesToPdf(files, pageSize)
        setResults([{ blob, filename: "images.pdf", note: `${files.length} pages` }])
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Conversion failed.")
    }
    setBusy(false)
  }

  return (
    <ToolPage
      title="Images → PDF"
      description="Turn JPG, PNG or WebP images into a single PDF. One image per page, in your order."
    >
      <FileDropzone
        accept={acceptedImageTypes}
        onFiles={(f) => {
          setFiles((prev) => [...prev, ...f])
          setResults([])
        }}
        label="Drop images here"
      />
      <FileQueue files={files} onChange={setFiles} reorder />
      {files.length > 0 && (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="w-full max-w-60 space-y-2">
                <Label>Page size</Label>
                <Select value={pageSize} onValueChange={(v) => setPageSize(v as PageSizeMode)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Match image size</SelectItem>
                    <SelectItem value="a4">A4 with margins</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {files.length > 1 && (
                <div className="w-full max-w-60 space-y-2">
                  <Label>Output</Label>
                  <Select value={output} onValueChange={(v) => setOutput(v as OutputMode)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="combine">One combined PDF</SelectItem>
                      <SelectItem value="separate">One PDF per image</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <Button onClick={run} disabled={busy} className="w-full sm:w-auto">
              {busy
                ? "Building PDF…"
                : output === "separate" && files.length > 1
                  ? `Create ${files.length} PDFs`
                  : `Create PDF from ${files.length} image${files.length > 1 ? "s" : ""}`}
            </Button>
          </CardContent>
        </Card>
      )}
      <ResultList results={results} />
    </ToolPage>
  )
}
