import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
  formatTimecode,
  gifFilter,
  parseTimecode,
  timecodeSlug,
} from "@/lib/video"
import { JobStatus, TimecodeInput, VideoPreview } from "../VideoParts"
import { useVideoJob, useVideoSource } from "../useVideoTool"

const WIDTHS = ["240", "320", "480", "640"]
const FPS = ["8", "10", "12", "15", "20"]

/** GIFs balloon fast, so the default clip is deliberately short. */
const DEFAULT_LENGTH = 5

export default function VideoToGifPage() {
  const { source, pick } = useVideoSource()
  const job = useVideoJob()
  const [start, setStart] = useState("0:00")
  const [length, setLength] = useState(String(DEFAULT_LENGTH))
  const [width, setWidth] = useState("480")
  const [fps, setFps] = useState("12")
  const [dither, setDither] = useState(true)
  const [results, setResults] = useState<ResultEntry[]>([])

  const startSeconds = parseTimecode(start) ?? 0
  const lengthSeconds = Number(length)
  const valid = lengthSeconds > 0 && lengthSeconds <= 60

  async function run() {
    if (!source) return
    if (!valid) {
      toast.error("Clip length has to be between 1 and 60 seconds.")
      return
    }
    setResults([])
    const output = "clip.gif"

    const blob = await job.run(source.file, async (runner) => {
      const args: string[] = []
      if (startSeconds > 0) args.push("-ss", startSeconds.toFixed(3))
      args.push("-i", "INPUT", "-t", lengthSeconds.toFixed(3))
      args.push(
        "-filter_complex",
        gifFilter({ fps: Number(fps), width: Number(width), dither }),
        "-loop",
        "0",
        output,
      )
      return await runner.run(args, output, "image/gif")
    })

    if (!blob) return
    setResults([
      {
        blob,
        filename: `${stripExtension(source.file.name)}-${timecodeSlug(startSeconds)}.gif`,
        note: `${width}px · ${fps} fps · ${formatTimecode(lengthSeconds)}`,
      },
    ])
  }

  return (
    <ToolPage
      title="Video → GIF"
      description="Turn a few seconds of video into an animated GIF, with a palette generated from the clip itself."
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
                <TimecodeInput
                  id="gif-start"
                  label="Start at"
                  value={start}
                  onChange={setStart}
                  hint="Where the clip begins"
                />
                <div className="space-y-2">
                  <Label htmlFor="gif-length">Length (seconds)</Label>
                  <Input
                    id="gif-length"
                    type="number"
                    min={1}
                    max={60}
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Up to 60 seconds.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Width</Label>
                  <Select value={width} onValueChange={setWidth}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WIDTHS.map((w) => (
                        <SelectItem key={w} value={w}>
                          {w} px
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
                      {FPS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f} fps
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch id="gif-dither" checked={dither} onCheckedChange={setDither} />
                <Label htmlFor="gif-dither">Dither gradients (smoother, larger file)</Label>
              </div>

              <JobStatus job={job} />
              <Button onClick={run} disabled={job.busy || !valid} className="w-full sm:w-auto">
                {job.busy ? "Rendering…" : "Make GIF"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
      <ResultList results={results} zipName="gif.zip" />
    </ToolPage>
  )
}
