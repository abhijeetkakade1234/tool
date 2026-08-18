import { useState } from "react"
import { toast } from "sonner"
import { Copy, Download } from "lucide-react"
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
import { FileDropzone } from "@/components/FileDropzone"
import { ToolPage } from "@/components/ToolPage"
import { downloadBlob, stripExtension } from "@/lib/file"
import { acceptedImageTypes } from "@/lib/image"

const LANGUAGES = [
  ["eng", "English"],
  ["hin", "Hindi"],
  ["spa", "Spanish"],
  ["fra", "French"],
  ["deu", "German"],
  ["ara", "Arabic"],
  ["chi_sim", "Chinese (Simplified)"],
] as const

export default function OcrPage() {
  const [file, setFile] = useState<File | null>(null)
  const [lang, setLang] = useState("eng")
  const [text, setText] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [status, setStatus] = useState("")
  const [busy, setBusy] = useState(false)

  async function run() {
    if (!file) return
    setBusy(true)
    setText(null)
    setProgress(0)
    try {
      const { createWorker } = await import("tesseract.js")
      const worker = await createWorker(lang, 1, {
        logger: (m) => {
          setStatus(m.status)
          if (m.status === "recognizing text") setProgress(Math.round(m.progress * 100))
        },
      })
      try {
        const result = await worker.recognize(file)
        setText(result.data.text.trim())
      } finally {
        await worker.terminate()
      }
    } catch (e) {
      toast.error(
        e instanceof Error && e.message
          ? e.message
          : "OCR failed. Check your connection — the engine downloads on first use.",
      )
    }
    setProgress(null)
    setStatus("")
    setBusy(false)
  }

  async function copy() {
    if (!text) return
    await navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard")
  }

  function saveTxt() {
    if (!text || !file) return
    downloadBlob(new Blob([text], { type: "text/plain" }), `${stripExtension(file.name)}.txt`)
  }

  return (
    <ToolPage
      title="OCR — Image to Text"
      description="Extract text from photos and scans with Tesseract, running in your browser."
    >
      <FileDropzone
        accept={acceptedImageTypes}
        multiple={false}
        onFiles={(f) => {
          setFile(f[0])
          setText(null)
        }}
        label="Drop a photo or scan here"
      />
      {file && (
        <Card>
          <CardContent className="space-y-4">
            <p className="text-sm font-medium">{file.name}</p>
            <div className="max-w-60 space-y-2">
              <Label>Language</Label>
              <Select value={lang} onValueChange={setLang}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(([code, name]) => (
                    <SelectItem key={code} value={code}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              The OCR engine and language data (a few MB) download on first use and are
              cached by the browser. Your image itself never leaves your device.
            </p>
            {progress !== null && (
              <div className="space-y-1">
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground">{status}</p>
              </div>
            )}
            <Button onClick={run} disabled={busy} className="w-full sm:w-auto">
              {busy ? "Recognizing…" : "Extract text"}
            </Button>
          </CardContent>
        </Card>
      )}
      {text !== null && (
        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium">Extracted text</h3>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" aria-label="Copy text" onClick={copy}>
                  <Copy className="size-4" aria-hidden />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Download as .txt" onClick={saveTxt}>
                  <Download className="size-4" aria-hidden />
                </Button>
              </div>
            </div>
            {text ? (
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded bg-muted px-3 py-2 text-sm">
                {text}
              </pre>
            ) : (
              <p className="text-sm text-muted-foreground">
                No text was recognized. Try a sharper image or a different language.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </ToolPage>
  )
}
