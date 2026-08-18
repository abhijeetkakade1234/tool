import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { FileDropzone } from "@/components/FileDropzone"
import { ToolPage } from "@/components/ToolPage"
import { formatBytes } from "@/lib/file"
import { readPdfInfo, type PdfInfo } from "@/lib/pdf"

export default function PdfMetadataPage() {
  const [file, setFile] = useState<File | null>(null)
  const [info, setInfo] = useState<PdfInfo | null>(null)

  async function onFile(files: File[]) {
    const f = files[0]
    setInfo(null)
    try {
      setInfo(await readPdfInfo(f))
      setFile(f)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read PDF.")
    }
  }

  const rows: [string, string | undefined][] = info
    ? [
        ["Filename", file?.name],
        ["File size", file ? formatBytes(file.size) : undefined],
        ["Pages", String(info.pageCount)],
        ["Title", info.title],
        ["Author", info.author],
        ["Subject", info.subject],
        ["Creator", info.creator],
        ["Producer", info.producer],
        ["Created", info.creationDate?.toLocaleString()],
        ["Modified", info.modificationDate?.toLocaleString()],
      ]
    : []

  return (
    <ToolPage title="PDF Info" description="View a PDF's metadata without opening it anywhere else.">
      <FileDropzone accept="application/pdf" multiple={false} onFiles={onFile} label="Drop a PDF here" />
      {info && (
        <Card>
          <CardContent>
            <dl className="divide-y text-sm">
              {rows
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="grid grid-cols-3 gap-2 py-2">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="col-span-2 break-words">{v}</dd>
                  </div>
                ))}
            </dl>
          </CardContent>
        </Card>
      )}
    </ToolPage>
  )
}
