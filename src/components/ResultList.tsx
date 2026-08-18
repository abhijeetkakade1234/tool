import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { downloadBlob, formatBytes } from "@/lib/file"
import { zipBlobs } from "@/lib/zip"

export interface ResultEntry {
  filename: string
  blob: Blob
  note?: string
}

export function ResultList({
  results,
  zipName = "files.zip",
}: {
  results: ResultEntry[]
  zipName?: string
}) {
  if (results.length === 0) return null

  async function downloadAll() {
    if (results.length === 1) {
      downloadBlob(results[0].blob, results[0].filename)
      return
    }
    const zip = await zipBlobs(results)
    downloadBlob(zip, zipName)
  }

  return (
    <Card>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-medium">
            {results.length} file{results.length > 1 ? "s" : ""} ready
          </h3>
          <Button onClick={downloadAll}>
            <Download className="size-4" aria-hidden />
            {results.length > 1 ? "Download ZIP" : "Download"}
          </Button>
        </div>
        <ul className="divide-y">
          {results.map((r, i) => (
            <li key={i} className="flex items-center justify-between gap-2 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{r.filename}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(r.blob.size)}
                  {r.note ? ` · ${r.note}` : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Download ${r.filename}`}
                onClick={() => downloadBlob(r.blob, r.filename)}
              >
                <Download className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
