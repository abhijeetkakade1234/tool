import { useState } from "react"
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
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { FileDropzone } from "@/components/FileDropzone"
import { ResultList, type ResultEntry } from "@/components/ResultList"
import { ToolPage } from "@/components/ToolPage"
import { formatBytes, stripExtension } from "@/lib/file"
import {
  acceptedVideoTypes,
  transcodeArgs,
  videoMimeTypes,
  type VideoFormat,
} from "@/lib/video"
import { JobStatus, VideoPreview } from "../VideoParts"
import { useVideoJob, useVideoSource } from "../useVideoTool"

const HEIGHTS: [string, string][] = [
  ["0", "Keep original"],
  ["1080", "1080p"],
  ["720", "720p"],
  ["480", "480p"],
  ["360", "360p"],
]

const FRAME_RATES: [string, string][] = [
  ["0", "Keep original"],
  ["60", "60 fps"],
  ["30", "30 fps"],
  ["24", "24 fps"],
  ["15", "15 fps"],
]

export default function VideoConvertPage() {
  const { source, pick } = useVideoSource()
  const job = useVideoJob()
  const [format, setFormat] = useState<VideoFormat>("mp4")
  const [quality, setQuality] = useState(45)
  const [height, setHeight] = useState("0")
  const [fps, setFps] = useState("0")
  const [muted, setMuted] = useState(false)
  const [results, setResults] = useState<ResultEntry[]>([])

  async function run() {
    if (!source) return
    setResults([])
    const output = `converted.${format}`

    const blob = await job.run(source.file, async (runner) => {
      const args = [
        "-i",
        "INPUT",
        ...transcodeArgs({
          format,
          quality,
          maxHeight: Number(height) || null,
          fps: Number(fps) || null,
          muted,
        }),
        output,
      ]
      return await runner.run(args, output, videoMimeTypes[format])
    })

    if (!blob) return
    const change =
      source.file.size > 0 ? Math.round((1 - blob.size / source.file.size) * 100) : 0
    setResults([
      {
        blob,
        filename: `${stripExtension(source.file.name)}.${format}`,
        note:
          change > 0
            ? `${change}% smaller than ${formatBytes(source.file.size)}`
            : `was ${formatBytes(source.file.size)}`,
      },
    ])
  }

  return (
    <ToolPage
      title="Convert / Compress Video"
      description="Re-encode to MP4 or WebM, drop the resolution and dial in quality to shrink the file."
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
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select value={format} onValueChange={(v) => setFormat(v as VideoFormat)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mp4">MP4 (H.264 + AAC)</SelectItem>
                      <SelectItem value="webm">WebM (VP9 + Opus)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Resolution</Label>
                  <Select value={height} onValueChange={setHeight}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HEIGHTS.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Frame rate</Label>
                  <Select value={fps} onValueChange={setFps}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FRAME_RATES.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="convert-quality">Compression — {quality}</Label>
                <Slider
                  id="convert-quality"
                  min={0}
                  max={100}
                  step={5}
                  value={[quality]}
                  onValueChange={([v]) => setQuality(v)}
                />
                <p className="text-xs text-muted-foreground">
                  Left keeps more detail and a bigger file; right compresses harder.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Switch id="convert-mute" checked={muted} onCheckedChange={setMuted} />
                <Label htmlFor="convert-mute">Drop the audio track</Label>
              </div>

              <p className="text-xs text-muted-foreground">
                Re-encoding in the browser is roughly real time, and WebM/VP9 is slower than
                MP4. For long videos, start with a short trim to check the settings.
              </p>
              <JobStatus job={job} />
              <Button onClick={run} disabled={job.busy} className="w-full sm:w-auto">
                {job.busy ? "Converting…" : `Convert to ${format.toUpperCase()}`}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
      <ResultList results={results} zipName="converted-video.zip" />
    </ToolPage>
  )
}
