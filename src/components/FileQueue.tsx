import { ArrowDown, ArrowUp, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatBytes } from "@/lib/file"

interface FileQueueProps {
  files: File[]
  onChange: (files: File[]) => void
  /** Show move up/down buttons (for order-sensitive tools like merge). */
  reorder?: boolean
}

export function FileQueue({ files, onChange, reorder = false }: FileQueueProps) {
  if (files.length === 0) return null

  function move(i: number, dir: -1 | 1) {
    const next = [...files]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <ul className="divide-y rounded-lg border">
      {files.map((f, i) => (
        <li key={`${f.name}-${i}`} className="flex items-center gap-1 px-3 py-2 text-sm">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{f.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(f.size)}</p>
          </div>
          {reorder && (
            <>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Move ${f.name} up`}
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                <ArrowUp className="size-4" aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Move ${f.name} down`}
                disabled={i === files.length - 1}
                onClick={() => move(i, 1)}
              >
                <ArrowDown className="size-4" aria-hidden />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Remove ${f.name}`}
            onClick={() => onChange(files.filter((_, j) => j !== i))}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </li>
      ))}
    </ul>
  )
}
