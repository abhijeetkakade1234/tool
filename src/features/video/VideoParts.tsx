import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { formatBytes } from "@/lib/file"
import { formatTimecode, parseTimecode } from "@/lib/video"
import type { JobState, VideoSource } from "./useVideoTool"

export function VideoPreview({ source }: { source: VideoSource }) {
  const { file, url, meta, probing } = source
  return (
    <Card>
      <CardContent className="space-y-3">
        <video
          src={url}
          controls
          preload="metadata"
          playsInline
          className="max-h-80 w-full rounded-md bg-black"
        />
        <div className="space-y-0.5">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatBytes(file.size)}
            {meta ? ` · ${formatTimecode(meta.duration)} · ${meta.width}×${meta.height}` : ""}
            {!meta && !probing
              ? " · this browser cannot preview the format, but ffmpeg can still process it"
              : ""}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export function JobStatus({ job }: { job: JobState }) {
  if (!job.busy) {
    return job.engineReady ? null : (
      <p className="text-xs text-muted-foreground">
        The video engine (~32 MB) downloads on first use and is then cached by your browser.
        Your video itself never leaves your device.
      </p>
    )
  }

  const downloading = job.download !== null
  const percent = Math.round((downloading ? job.download! : (job.progress ?? 0)) * 100)
  return (
    <div className="space-y-1">
      <Progress value={percent} />
      <p className="text-xs text-muted-foreground">
        {downloading ? `Downloading video engine… ${percent}%` : `${job.stage}… ${percent}%`}
      </p>
    </div>
  )
}

interface TimecodeInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  hint?: string
}

export function TimecodeInput({
  id,
  label,
  value,
  onChange,
  disabled,
  hint,
}: TimecodeInputProps) {
  const invalid = value.trim().length > 0 && parseTimecode(value) === null
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        inputMode="text"
        placeholder="0:00"
        aria-invalid={invalid}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className={`text-xs ${invalid ? "text-destructive" : "text-muted-foreground"}`}>
        {invalid ? "Use m:ss, h:mm:ss or seconds" : (hint ?? "m:ss, h:mm:ss or seconds")}
      </p>
    </div>
  )
}
