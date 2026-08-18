import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { FileDropzone } from "@/components/FileDropzone"
import { FileQueue } from "@/components/FileQueue"
import { ResultList, type ResultEntry } from "@/components/ResultList"
import { ToolPage } from "@/components/ToolPage"
import { mergePdfs } from "@/lib/pdf"

export default function PdfMergePage() {
  const [files, setFiles] = useState<File[]>([])
  const [results, setResults] = useState<ResultEntry[]>([])
  const [busy, setBusy] = useState(false)

  async function merge() {
    setBusy(true)
    setResults([])
    try {
      const blob = await mergePdfs(files)
      setResults([{ blob, filename: "merged.pdf" }])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Merge failed.")
    }
    setBusy(false)
  }

  return (
    <ToolPage
      title="Merge PDF"
      description="Combine multiple PDFs into one. Use the arrows to set the order."
    >
      <FileDropzone
        accept="application/pdf"
        onFiles={(f) => {
          setFiles((prev) => [...prev, ...f])
          setResults([])
        }}
        label="Drop PDFs here"
      />
      <FileQueue files={files} onChange={setFiles} reorder />
      {files.length >= 2 && (
        <Button onClick={merge} disabled={busy} className="w-full sm:w-auto">
          {busy ? "Merging…" : `Merge ${files.length} PDFs`}
        </Button>
      )}
      {files.length === 1 && (
        <p className="text-sm text-muted-foreground">Add at least one more PDF to merge.</p>
      )}
      <ResultList results={results} />
    </ToolPage>
  )
}
