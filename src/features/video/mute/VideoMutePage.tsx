import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FileDropzone } from "@/components/FileDropzone"
import { ResultList, type ResultEntry } from "@/components/ResultList"
import { ToolPage } from "@/components/ToolPage"
import { formatBytes, stripExtension } from "@/lib/file"
import { acceptedVideoTypes, copyContainer } from "@/lib/video"
import { JobStatus, VideoPreview } from "../VideoParts"
import { useVideoJob, useVideoSource } from "../useVideoTool"

export default function VideoMutePage() {
  const { source, pick } = useVideoSource()
  const job = useVideoJob()
  const [results, setResults] = useState<ResultEntry[]>([])

  async function run() {
    if (!source) return
    setResults([])
    const container = copyContainer(source.file.name)
    const output = `muted.${container.ext}`

    const blob = await job.run(source.file, async (runner) =>
      // The video stream is copied untouched — only the audio track is dropped.
      await runner.run(["-i", "INPUT", "-c", "copy", "-an", output], output, container.mime),
    )

    if (!blob) return
    setResults([
      {
        blob,
        filename: `${stripExtension(source.file.name)}-muted.${container.ext}`,
        note: `was ${formatBytes(source.file.size)}`,
      },
    ])
  }

  return (
    <ToolPage
      title="Mute Video"
      description="Strip the audio track and keep the picture exactly as it was — no re-encoding, no quality loss."
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
              <JobStatus job={job} />
              <Button onClick={run} disabled={job.busy} className="w-full sm:w-auto">
                {job.busy ? "Removing audio…" : "Remove audio"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
      <ResultList results={results} zipName="muted-video.zip" />
    </ToolPage>
  )
}
