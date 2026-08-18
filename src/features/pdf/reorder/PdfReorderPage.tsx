import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { ArrowDown, ArrowUp, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FileDropzone } from "@/components/FileDropzone"
import { ResultList, type ResultEntry } from "@/components/ResultList"
import { ToolPage } from "@/components/ToolPage"
import { stripExtension } from "@/lib/file"
import { getPageCount, reorderPdf } from "@/lib/pdf"
import { renderThumbnails } from "@/lib/pdfRender"

export default function PdfReorderPage() {
  const [file, setFile] = useState<File | null>(null)
  const [order, setOrder] = useState<number[]>([])
  const [thumbs, setThumbs] = useState<string[]>([])
  const [results, setResults] = useState<ResultEntry[]>([])
  const [busy, setBusy] = useState(false)
  const thumbsRef = useRef<string[]>([])

  function releaseThumbs() {
    for (const url of thumbsRef.current) if (url) URL.revokeObjectURL(url)
    thumbsRef.current = []
    setThumbs([])
  }

  useEffect(() => releaseThumbs, [])

  async function onFile(files: File[]) {
    const f = files[0]
    setResults([])
    releaseThumbs()
    try {
      const count = await getPageCount(f)
      setFile(f)
      setOrder(Array.from({ length: count }, (_, i) => i + 1))
      // Thumbnails render in the background; the list is usable immediately.
      renderThumbnails(f)
        .then((urls) => {
          thumbsRef.current = urls
          setThumbs(urls)
        })
        .catch(() => {
          /* thumbnails are optional; the numbered list still works */
        })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read PDF.")
    }
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= order.length) return
    const next = [...order]
    ;[next[i], next[j]] = [next[j], next[i]]
    setOrder(next)
  }

  const changed = order.some((p, i) => p !== i + 1)

  async function run() {
    if (!file) return
    setBusy(true)
    setResults([])
    try {
      const blob = await reorderPdf(file, order)
      setResults([{ blob, filename: `${stripExtension(file.name)}-reordered.pdf` }])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reorder failed.")
    }
    setBusy(false)
  }

  return (
    <ToolPage title="Reorder Pages" description="Rearrange PDF pages, then export a new file.">
      <FileDropzone accept="application/pdf" multiple={false} onFiles={onFile} label="Drop a PDF here" />
      {file && (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm">
                <span className="font-medium">{file.name}</span>{" "}
                <span className="text-muted-foreground">· {order.length} pages</span>
              </p>
              <Button
                variant="ghost"
                size="sm"
                disabled={!changed}
                onClick={() => setOrder(Array.from({ length: order.length }, (_, i) => i + 1))}
              >
                <RotateCcw className="size-4" aria-hidden /> Reset
              </Button>
            </div>
            <ul className="divide-y rounded-lg border">
              {order.map((page, i) => (
                <li key={`${page}-${i}`} className="flex items-center gap-3 px-3 py-1.5 text-sm">
                  {thumbs[page - 1] ? (
                    <img
                      src={thumbs[page - 1]}
                      alt={`Page ${page} preview`}
                      className="h-14 w-11 shrink-0 rounded border object-contain"
                    />
                  ) : (
                    <div className="flex h-14 w-11 shrink-0 items-center justify-center rounded border text-xs text-muted-foreground">
                      {page}
                    </div>
                  )}
                  <span className="flex-1">
                    Position {i + 1}: <span className="font-medium">page {page}</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Move page ${page} up`}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUp className="size-4" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Move page ${page} down`}
                    disabled={i === order.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown className="size-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
            <Button onClick={run} disabled={busy || !changed} className="w-full sm:w-auto">
              {busy ? "Working…" : "Export reordered PDF"}
            </Button>
          </CardContent>
        </Card>
      )}
      <ResultList results={results} />
    </ToolPage>
  )
}
