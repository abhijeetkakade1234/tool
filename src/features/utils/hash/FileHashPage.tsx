import { useState } from "react"
import { toast } from "sonner"
import { Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FileDropzone } from "@/components/FileDropzone"
import { ToolPage } from "@/components/ToolPage"
import { formatBytes } from "@/lib/file"
import { hashAlgorithms, hashBytes, type HashAlgorithm } from "@/lib/hash"

interface HashResult {
  filename: string
  size: number
  hashes: [HashAlgorithm, string][]
}

export default function FileHashPage() {
  const [results, setResults] = useState<HashResult[]>([])
  const [busy, setBusy] = useState(false)

  async function onFiles(files: File[]) {
    setBusy(true)
    const out: HashResult[] = []
    for (const file of files) {
      try {
        const data = await file.arrayBuffer()
        const hashes: [HashAlgorithm, string][] = []
        for (const algo of hashAlgorithms) {
          hashes.push([algo, await hashBytes(data, algo)])
        }
        out.push({ filename: file.name, size: file.size, hashes })
      } catch {
        toast.error(`Could not hash ${file.name}`)
      }
    }
    setResults(out)
    setBusy(false)
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard")
  }

  return (
    <ToolPage
      title="File Hash"
      description="SHA-256, SHA-1 and SHA-512 checksums — verify downloads without any upload."
    >
      <FileDropzone onFiles={onFiles} label="Drop files here" />
      {busy && <p className="text-sm text-muted-foreground">Hashing…</p>}
      {results.map((r) => (
        <Card key={r.filename}>
          <CardContent className="space-y-3">
            <p className="text-sm">
              <span className="font-medium">{r.filename}</span>{" "}
              <span className="text-muted-foreground">· {formatBytes(r.size)}</span>
            </p>
            {r.hashes.map(([algo, hex]) => (
              <div key={algo} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">{algo}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Copy ${algo} hash`}
                    onClick={() => copy(hex)}
                  >
                    <Copy className="size-4" aria-hidden />
                  </Button>
                </div>
                <code className="block break-all rounded bg-muted px-2 py-1 text-xs">{hex}</code>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </ToolPage>
  )
}
