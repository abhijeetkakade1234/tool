import { useId, useRef, useState } from "react"
import type { DragEvent } from "react"
import { Upload } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileDropzoneProps {
  accept?: string
  multiple?: boolean
  onFiles: (files: File[]) => void
  label?: string
  hint?: string
  className?: string
}

export function FileDropzone({
  accept,
  multiple = true,
  onFiles,
  label = "Drop files here",
  hint = "or tap to browse",
  className,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const inputId = useId()

  function emit(list: FileList | null) {
    if (!list || list.length === 0) return
    const files = Array.from(list)
    onFiles(multiple ? files : files.slice(0, 1))
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    emit(e.dataTransfer.files)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
        dragging
          ? "border-primary bg-accent"
          : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-accent/50",
        className,
      )}
    >
      <Upload className="size-6 text-muted-foreground" aria-hidden />
      <p className="font-medium">{label}</p>
      <p className="text-sm text-muted-foreground">{hint}</p>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          emit(e.target.files)
          e.target.value = ""
        }}
      />
    </div>
  )
}
