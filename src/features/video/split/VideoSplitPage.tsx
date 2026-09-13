import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileDropzone } from "@/components/FileDropzone"
import { ResultList, type ResultEntry } from "@/components/ResultList"
import { ToolPage } from "@/components/ToolPage"
import { stripExtension } from "@/lib/file"
import {
  acceptedVideoTypes,
  copyContainer,
  equalSegments,
  fixedSegments,
  formatTimecode,
  probeVideo,
  segmentArgs,
  segmentsFromCutPoints,
  type Segment,
} from "@/lib/video"
import { JobStatus, VideoPreview } from "../VideoParts"
import { useVideoJob, useVideoSource } from "../useVideoTool"

type Mode = "parts" | "length" | "points"

export default function VideoSplitPage() {
  const { source, pick } = useVideoSource()
  const job = useVideoJob()
  const [mode, setMode] = useState<Mode>("parts")
  const [parts, setParts] = useState("2")
  const [length, setLength] = useState("60")
  const [points, setPoints] = useState("")
  const [results, setResults] = useState<ResultEntry[]>([])

  const duration = source?.meta?.duration ?? 0

  function buildSegments(): Segment[] {
    if (duration <= 0) {
      throw new Error(
        "The length of this video could not be read in the browser, so it cannot be split here. Convert it to MP4 first.",
      )
    }
    if (mode === "parts") {
      const count = Number(parts)
      if (!Number.isInteger(count) || count < 2) throw new Error("Enter 2 or more parts.")
      return equalSegments(duration, count)
    }
    if (mode === "length") {
      const size = Number(length)
      if (!(size > 0)) throw new Error("Enter a segment length in seconds.")
      return fixedSegments(duration, size)
    }
    return segmentsFromCutPoints(points, duration)
  }

  async function run() {
    if (!source) return
    let segments: Segment[]
    try {
      segments = buildSegments()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Those split settings are not valid.")
      return
    }
    if (segments.length === 0) {
      toast.error("Those settings produce no segments.")
      return
    }
    if (segments.length > 50) {
      toast.error(`That would produce ${segments.length} files. Use longer segments.`)
      return
    }

    setResults([])
    const base = stripExtension(source.file.name)
    const container = copyContainer(source.file.name)

    const blobs = await job.run(source.file, async (runner) =>
      await runner.runMany(
        segmentArgs(segments, `part-%03d.${container.ext}`),
        "part-",
        container.mime,
      ),
    )
    if (!blobs) return

    const entries: ResultEntry[] = []
    for (const [index, blob] of blobs.entries()) {
      const meta = await probeVideo(blob)
      entries.push({
        blob,
        filename: `${base}-part-${String(index + 1).padStart(2, "0")}.${container.ext}`,
        note: meta ? formatTimecode(meta.duration, 1) : undefined,
      })
    }
    setResults(entries)

    if (blobs.length < segments.length) {
      toast.warning(
        `This video only had keyframes for ${blobs.length} part${blobs.length > 1 ? "s" : ""}. ` +
          "Parts can only start on a keyframe — convert the video first to add more, or use Trim in precise mode.",
      )
    }
  }

  return (
    <ToolPage
      title="Split Video"
      description="Cut one video into several files — equal parts, fixed-length chunks, or at your own timestamps. Streams are copied, so it is fast and lossless."
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
              <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
                <TabsList>
                  <TabsTrigger value="parts">Equal parts</TabsTrigger>
                  <TabsTrigger value="length">Fixed length</TabsTrigger>
                  <TabsTrigger value="points">Cut points</TabsTrigger>
                </TabsList>
              </Tabs>

              {mode === "parts" && (
                <div className="max-w-40 space-y-2">
                  <Label htmlFor="split-parts">Number of parts</Label>
                  <Input
                    id="split-parts"
                    type="number"
                    min={2}
                    max={50}
                    value={parts}
                    onChange={(e) => setParts(e.target.value)}
                  />
                </div>
              )}
              {mode === "length" && (
                <div className="max-w-40 space-y-2">
                  <Label htmlFor="split-length">Seconds per part</Label>
                  <Input
                    id="split-length"
                    type="number"
                    min={1}
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                  />
                </div>
              )}
              {mode === "points" && (
                <div className="space-y-2">
                  <Label htmlFor="split-points">Cut at</Label>
                  <Input
                    id="split-points"
                    value={points}
                    placeholder="0:30, 1:15, 2:40"
                    onChange={(e) => setPoints(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma separated times. Each one starts a new file.
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Parts are cut without re-encoding, so each one starts on a keyframe and the
                boundary can land a moment away from the time you asked for. Nothing is
                duplicated or lost. Use Trim in precise mode when the exact frame matters.
              </p>
              <JobStatus job={job} />
              <Button onClick={run} disabled={job.busy} className="w-full sm:w-auto">
                {job.busy ? "Splitting…" : "Split video"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
      <ResultList results={results} zipName="video-parts.zip" />
    </ToolPage>
  )
}
