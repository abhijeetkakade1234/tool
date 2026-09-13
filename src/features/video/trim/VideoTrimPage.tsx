import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileDropzone } from "@/components/FileDropzone"
import { ResultList, type ResultEntry } from "@/components/ResultList"
import { ToolPage } from "@/components/ToolPage"
import { stripExtension } from "@/lib/file"
import {
  acceptedVideoTypes,
  copyContainer,
  formatTimecode,
  parseTimecode,
  probeVideo,
  timecodeSlug,
  trimArgs,
} from "@/lib/video"
import { JobStatus, TimecodeInput, VideoPreview } from "../VideoParts"
import { useVideoJob, useVideoSource } from "../useVideoTool"

type Mode = "fast" | "precise"

export default function VideoTrimPage() {
  const { source, pick } = useVideoSource()
  const job = useVideoJob()
  const [mode, setMode] = useState<Mode>("fast")
  const [start, setStart] = useState("0:00")
  const [end, setEnd] = useState("")
  const [results, setResults] = useState<ResultEntry[]>([])

  const duration = source?.meta?.duration ?? 0

  useEffect(() => {
    if (duration > 0) setEnd(formatTimecode(duration))
  }, [duration])

  const startSeconds = parseTimecode(start) ?? 0
  const endSeconds = parseTimecode(end) ?? duration
  const valid = endSeconds > startSeconds && startSeconds >= 0

  async function run() {
    if (!source) return
    if (!valid) {
      toast.error("The end time has to be after the start time.")
      return
    }
    setResults([])
    const base = stripExtension(source.file.name)
    const container = mode === "fast" ? copyContainer(source.file.name) : { ext: "mp4", mime: "video/mp4" }
    const output = `out.${container.ext}`

    const blob = await job.run(source.file, async (runner) => {
      const args = trimArgs(startSeconds, endSeconds, mode === "fast")
      if (mode === "precise") {
        args.push(
          "-c:v", "libx264",
          "-preset", "ultrafast",
          "-crf", "20",
          "-pix_fmt", "yuv420p",
          "-c:a", "aac",
          "-b:a", "128k",
          "-movflags", "+faststart",
        )
      }
      return await runner.run([...args, output], output, container.mime)
    })

    if (!blob) return
    // A stream copy starts at the keyframe before the requested point, so the clip can
    // come out longer than asked — report what the file actually contains.
    const actual = await probeVideo(blob)
    setResults([
      {
        blob,
        filename: `${base}-${timecodeSlug(startSeconds)}-${timecodeSlug(endSeconds)}.${container.ext}`,
        note: actual
          ? formatTimecode(actual.duration, 1)
          : `${formatTimecode(endSeconds - startSeconds, 1)} requested`,
      },
    ])
  }

  return (
    <ToolPage
      title="Trim Video"
      description="Keep just the part you want. Fast mode copies the streams untouched; precise mode re-encodes for a frame-accurate cut."
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
              {duration > 0 && (
                <div className="space-y-2">
                  <Label>Range</Label>
                  <Slider
                    min={0}
                    max={Math.round(duration * 10)}
                    step={1}
                    value={[
                      Math.round(Math.min(startSeconds, duration) * 10),
                      Math.round(Math.min(endSeconds, duration) * 10),
                    ]}
                    onValueChange={([a, b]) => {
                      setStart(formatTimecode(a / 10, 1))
                      setEnd(formatTimecode(b / 10, 1))
                    }}
                    aria-label="Trim range"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formatTimecode(startSeconds, 1)} → {formatTimecode(endSeconds, 1)} ·
                    keeping {formatTimecode(Math.max(0, endSeconds - startSeconds), 1)} of{" "}
                    {formatTimecode(duration)}
                  </p>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <TimecodeInput id="trim-start" label="Start" value={start} onChange={setStart} />
                <TimecodeInput id="trim-end" label="End" value={end} onChange={setEnd} />
              </div>
              <div className="space-y-2">
                <Label>Cut mode</Label>
                <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
                  <TabsList>
                    <TabsTrigger value="fast">Fast (no re-encode)</TabsTrigger>
                    <TabsTrigger value="precise">Precise (re-encode)</TabsTrigger>
                  </TabsList>
                </Tabs>
                <p className="text-xs text-muted-foreground">
                  {mode === "fast"
                    ? "Quickest and lossless, but the cut snaps to the nearest keyframe before your start time."
                    : "Cuts exactly where you asked and always outputs MP4. Slower — expect roughly real time."}
                </p>
              </div>
              <JobStatus job={job} />
              <Button onClick={run} disabled={job.busy || !valid} className="w-full sm:w-auto">
                {job.busy ? "Trimming…" : "Trim video"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
      <ResultList results={results} zipName="trimmed-video.zip" />
    </ToolPage>
  )
}
