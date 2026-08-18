import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileDropzone } from "@/components/FileDropzone"
import { ResultList, type ResultEntry } from "@/components/ResultList"
import { ToolPage } from "@/components/ToolPage"
import { formatBytes, stripExtension } from "@/lib/file"
import { editPdfMetadata, readPdfInfo, type PdfInfo } from "@/lib/pdf"

export default function PdfMetadataPage() {
  const [file, setFile] = useState<File | null>(null)
  const [info, setInfo] = useState<PdfInfo | null>(null)
  const [title, setTitle] = useState("")
  const [author, setAuthor] = useState("")
  const [subject, setSubject] = useState("")
  const [results, setResults] = useState<ResultEntry[]>([])
  const [busy, setBusy] = useState(false)

  async function onFile(files: File[]) {
    const f = files[0]
    setInfo(null)
    setResults([])
    try {
      const i = await readPdfInfo(f)
      setInfo(i)
      setFile(f)
      setTitle(i.title ?? "")
      setAuthor(i.author ?? "")
      setSubject(i.subject ?? "")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read PDF.")
    }
  }

  const changed =
    info !== null &&
    (title !== (info.title ?? "") ||
      author !== (info.author ?? "") ||
      subject !== (info.subject ?? ""))

  async function save() {
    if (!file) return
    setBusy(true)
    setResults([])
    try {
      const blob = await editPdfMetadata(file, { title, author, subject })
      setResults([{ blob, filename: `${stripExtension(file.name)}-metadata.pdf` }])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Saving metadata failed.")
    }
    setBusy(false)
  }

  const readonlyRows: [string, string | undefined][] = info
    ? [
        ["Filename", file?.name],
        ["File size", file ? formatBytes(file.size) : undefined],
        ["Pages", String(info.pageCount)],
        ["Creator", info.creator],
        ["Producer", info.producer],
        ["Created", info.creationDate?.toLocaleString()],
        ["Modified", info.modificationDate?.toLocaleString()],
      ]
    : []

  return (
    <ToolPage
      title="PDF Info"
      description="View a PDF's metadata — and edit title, author and subject if you want."
    >
      <FileDropzone accept="application/pdf" multiple={false} onFiles={onFile} label="Drop a PDF here" />
      {info && (
        <Card>
          <CardContent className="space-y-4">
            <dl className="divide-y text-sm">
              {readonlyRows
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="grid grid-cols-3 gap-2 py-2">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="col-span-2 break-words">{v}</dd>
                  </div>
                ))}
            </dl>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="author">Author</Label>
                <Input id="author" value={author} onChange={(e) => setAuthor(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
            </div>
            <Button onClick={save} disabled={busy || !changed} className="w-full sm:w-auto">
              {busy ? "Saving…" : "Save edited PDF"}
            </Button>
          </CardContent>
        </Card>
      )}
      <ResultList results={results} />
    </ToolPage>
  )
}
