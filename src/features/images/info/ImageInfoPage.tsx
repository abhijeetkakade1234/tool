import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { FileDropzone } from "@/components/FileDropzone"
import { ToolPage } from "@/components/ToolPage"
import { formatBytes } from "@/lib/file"
import { acceptedImageTypes, decodeImage } from "@/lib/image"

interface Info {
  name: string
  type: string
  size: number
  width: number
  height: number
}

function aspectRatio(w: number, h: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const g = gcd(w, h)
  const rw = w / g
  const rh = h / g
  if (rw > 50 || rh > 50) return (w / h).toFixed(3) + " : 1"
  return `${rw} : ${rh}`
}

export default function ImageInfoPage() {
  const [infos, setInfos] = useState<Info[]>([])

  async function onFiles(files: File[]) {
    const out: Info[] = []
    for (const file of files) {
      try {
        const bitmap = await decodeImage(file)
        out.push({
          name: file.name,
          type: file.type || "unknown",
          size: file.size,
          width: bitmap.width,
          height: bitmap.height,
        })
        bitmap.close()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : `Could not read ${file.name}`)
      }
    }
    setInfos(out)
  }

  return (
    <ToolPage title="Image Info" description="Dimensions, format and size — read locally, instantly.">
      <FileDropzone accept={acceptedImageTypes} onFiles={onFiles} label="Drop images here" />
      {infos.map((info) => (
        <Card key={info.name}>
          <CardContent>
            <dl className="divide-y text-sm">
              {(
                [
                  ["Filename", info.name],
                  ["Format", info.type],
                  ["Dimensions", `${info.width} × ${info.height} px`],
                  ["Aspect ratio", aspectRatio(info.width, info.height)],
                  ["Megapixels", ((info.width * info.height) / 1_000_000).toFixed(1) + " MP"],
                  ["File size", formatBytes(info.size)],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="grid grid-cols-3 gap-2 py-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="col-span-2 break-words">{v}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      ))}
    </ToolPage>
  )
}
