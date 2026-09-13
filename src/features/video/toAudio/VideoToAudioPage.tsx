import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { FileDropzone } from "@/components/FileDropzone"
import { ResultList, type ResultEntry } from "@/components/ResultList"
import { ToolPage } from "@/components/ToolPage"
import { stripExtension } from "@/lib/file"
import {
  acceptedVideoTypes,
  audioCodecArgs,
  audioMimeTypes,
  formatTimecode,
  parseTimecode,
  type AudioFormat,
} from "@/lib/video"
import { JobStatus, TimecodeInput, VideoPreview } from "../VideoParts"
import { useVideoJob, useVideoSource } from "../useVideoTool"

const FORMATS: [AudioFormat, string][] = [
  ["mp3", "MP3 — plays everywhere"],
  ["m4a", "M4A (AAC) — smaller at the same quality"],
  ["opus", "Opus — best quality per byte"],
  ["wav", "WAV — uncompressed"],
]

const BITRATES = ["96", "128", "192", "256", "320"]

export default function VideoToAudioPage() {
  const { source, pick } = useVideoSource()
  const job = useVideoJob()
  const [format, setFormat] = useState<AudioFormat>("mp3")
  const [bitrate, setBitrate] = useState("192")
  const [trim, setTrim] = useState(false)
  const [start, setStart] = useState("0:00")
  const [end, setEnd] = useState("")
  const [results, setResults] = useState<ResultEntry[]>([])

  const duration = source?.meta?.duration ?? 0
  const startSeconds = parseTimecode(start) ?? 0
  const endSeconds = parseTimecode(end) ?? duration

  async function run() {
    if (!source) return
    if (trim && !(endSeconds > startSeconds)) {
      toast.error("The end time has to be after the start time.")
      return
    }
    setResults([])
    const output = `audio.${format}`

    const blob = await job.run(source.file, async (runner) => {
      const args: string[] = []
      if (trim && startSeconds > 0) args.push("-ss", startSeconds.toFixed(3))
      args.push("-i", "INPUT")
      if (trim && endSeconds > startSeconds) {
        args.push("-t", (endSeconds - startSeconds).toFixed(3))
      }
      args.push("-vn", ...audioCodecArgs(format, Number(bitrate)), output)
      return await runner.run(args, output, audioMimeTypes[format])
    })

    if (!blob) return
    setResults([
      {
        blob,
        filename: `${stripExtension(source.file.name)}.${format}`,
        note: format === "wav" ? "16-bit PCM" : `${bitrate} kbps`,
      },
    ])
  }

  return (
    <ToolPage
      title="Video → MP3 / Audio"
      description="Pull the soundtrack out of any video as MP3, M4A, Opus or WAV."
    >
      <FileDropzone
        accept={acceptedVideoTypes}
        multiple={false}
        onFiles={(files) => {
          setResults([])
          void pick(files)
        }}
        label="Drop a video here"
      />
      {source && (
        <>
          <VideoPreview source={source} />
          <Card>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select value={format} onValueChange={(v) => setFormat(v as AudioFormat)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMATS.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Bitrate</Label>
                  <Select
                    value={bitrate}
                    onValueChange={setBitrate}
                    disabled={format === "wav"}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BITRATES.map((rate) => (
                        <SelectItem key={rate} value={rate}>
                          {rate} kbps
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {format === "wav" && (
                    <p className="text-xs text-muted-foreground">
                      WAV is uncompressed, so bitrate does not apply.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="audio-trim"
                  checked={trim}
                  onCheckedChange={(checked) => {
                    setTrim(checked)
                    if (checked && !end && duration > 0) setEnd(formatTimecode(duration))
                  }}
                />
                <Label htmlFor="audio-trim">Only a section of the video</Label>
              </div>
              {trim && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <TimecodeInput id="audio-start" label="Start" value={start} onChange={setStart} />
                  <TimecodeInput id="audio-end" label="End" value={end} onChange={setEnd} />
                </div>
              )}

              <JobStatus job={job} />
              <Button onClick={run} disabled={job.busy} className="w-full sm:w-auto">
                {job.busy ? "Extracting…" : `Extract ${format.toUpperCase()}`}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
      <ResultList results={results} zipName="audio.zip" />
    </ToolPage>
  )
}
