import { useState } from "react"
import exifr from "exifr"
import { toast } from "sonner"
import { MapPin, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FileDropzone } from "@/components/FileDropzone"
import { FileQueue } from "@/components/FileQueue"
import { ResultList, type ResultEntry } from "@/components/ResultList"
import { ToolPage } from "@/components/ToolPage"
import {
  decodeImage,
  encodeCanvas,
  formatExtension,
  renderToCanvas,
  type OutputFormat,
} from "@/lib/image"

interface ExifSummary {
  filename: string
  hasGps: boolean
  rows: [string, string][]
}

const FIELD_LABELS: [string, string][] = [
  ["Make", "Camera make"],
  ["Model", "Camera model"],
  ["LensModel", "Lens"],
  ["DateTimeOriginal", "Taken"],
  ["ExposureTime", "Exposure"],
  ["FNumber", "Aperture"],
  ["ISO", "ISO"],
  ["FocalLength", "Focal length"],
  ["Orientation", "Orientation"],
  ["Software", "Software"],
]

function formatValue(key: string, value: unknown): string {
  if (value instanceof Date) return value.toLocaleString()
  if (key === "ExposureTime" && typeof value === "number" && value < 1)
    return `1/${Math.round(1 / value)} s`
  if (key === "FNumber" && typeof value === "number") return `f/${value}`
  if (key === "FocalLength" && typeof value === "number") return `${value} mm`
  return String(value)
}

function outputTypeFor(file: File): OutputFormat {
  if (file.type === "image/jpeg" || file.type === "image/webp") return file.type
  return "image/png"
}

export default function ExifPage() {
  const [files, setFiles] = useState<File[]>([])
  const [summaries, setSummaries] = useState<ExifSummary[]>([])
  const [results, setResults] = useState<ResultEntry[]>([])
  const [busy, setBusy] = useState(false)

  async function onFiles(added: File[]) {
    const next = [...files, ...added]
    setFiles(next)
    setResults([])
    const out: ExifSummary[] = []
    for (const file of added) {
      try {
        const data: Record<string, unknown> | undefined = await exifr.parse(file, {
          gps: true,
        })
        const rows: [string, string][] = []
        if (data) {
          for (const [key, label] of FIELD_LABELS) {
            if (data[key] !== undefined && data[key] !== null)
              rows.push([label, formatValue(key, data[key])])
          }
          if (typeof data.latitude === "number" && typeof data.longitude === "number") {
            rows.push([
              "GPS location",
              `${data.latitude.toFixed(5)}, ${data.longitude.toFixed(5)}`,
            ])
          }
        }
        out.push({
          filename: file.name,
          hasGps: typeof data?.latitude === "number",
          rows,
        })
      } catch {
        out.push({ filename: file.name, hasGps: false, rows: [] })
      }
    }
    setSummaries((prev) => [...prev, ...out])
  }

  function reset(nextFiles: File[]) {
    setFiles(nextFiles)
    setSummaries((prev) => prev.filter((s) => nextFiles.some((f) => f.name === s.filename)))
    setResults([])
  }

  async function clean() {
    setBusy(true)
    setResults([])
    const out: ResultEntry[] = []
    for (const file of files) {
      try {
        const bitmap = await decodeImage(file)
        try {
          const type = outputTypeFor(file)
          const canvas = renderToCanvas(bitmap)
          const blob = await encodeCanvas(canvas, type, type === "image/png" ? undefined : 0.95)
          const base = file.name.replace(/\.[^.]+$/, "")
          out.push({ blob, filename: `${base}-clean.${formatExtension[type]}` })
        } finally {
          bitmap.close()
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : `Failed to clean ${file.name}`)
      }
    }
    setResults(out)
    setBusy(false)
  }

  return (
    <ToolPage
      title="EXIF Viewer / Remover"
      description="See what metadata your photos carry — camera, date, GPS — and export clean copies."
    >
      <FileDropzone
        accept="image/jpeg,image/png,image/webp,image/tiff"
        onFiles={onFiles}
        label="Drop photos here"
      />
      <FileQueue files={files} onChange={reset} />
      {summaries.map((s) => (
        <Card key={s.filename}>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="min-w-0 truncate font-medium">{s.filename}</h3>
              {s.hasGps ? (
                <Badge variant="destructive" className="shrink-0">
                  <MapPin className="size-3" aria-hidden /> GPS embedded
                </Badge>
              ) : (
                <Badge variant="outline" className="shrink-0">
                  <ShieldCheck className="size-3" aria-hidden /> No GPS
                </Badge>
              )}
            </div>
            {s.rows.length > 0 ? (
              <dl className="divide-y text-sm">
                {s.rows.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-3 gap-2 py-1.5">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="col-span-2 break-words">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                No EXIF metadata found in this file.
              </p>
            )}
          </CardContent>
        </Card>
      ))}
      {files.length > 0 && (
        <div className="space-y-2">
          <Button onClick={clean} disabled={busy} className="w-full sm:w-auto">
            {busy
              ? "Cleaning…"
              : `Download clean cop${files.length > 1 ? "ies" : "y"} (metadata removed)`}
          </Button>
          <p className="text-xs text-muted-foreground">
            Cleaning re-encodes the image, which removes all metadata. JPEG output uses
            quality 95; originals are untouched.
          </p>
        </div>
      )}
      <ResultList results={results} zipName="clean-images.zip" />
    </ToolPage>
  )
}
