import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { isFFmpegReady, probeVideo, processVideo, type VideoJob, type VideoMeta } from "@/lib/video"

export interface VideoSource {
  file: File
  /** Object URL for the preview player; revoked when the selection changes. */
  url: string
  /** Null while probing, and for containers the browser cannot decode. */
  meta: VideoMeta | null
  probing: boolean
}

export function useVideoSource() {
  const [source, setSource] = useState<VideoSource | null>(null)
  const urlRef = useRef<string | null>(null)

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    },
    [],
  )

  const pick = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    const url = URL.createObjectURL(file)
    urlRef.current = url
    setSource({ file, url, meta: null, probing: true })
    const meta = await probeVideo(file)
    setSource((current) =>
      current && current.file === file ? { ...current, meta, probing: false } : current,
    )
  }, [])

  return { source, pick }
}

export interface JobState {
  busy: boolean
  stage: string
  /** 0..1 progress of the running ffmpeg command, or null when not running. */
  progress: number | null
  /** 0..1 download progress of the engine, or null once it is in memory. */
  download: number | null
  engineReady: boolean
}

export function useVideoJob() {
  const [state, setState] = useState<JobState>({
    busy: false,
    stage: "",
    progress: null,
    download: null,
    engineReady: isFFmpegReady(),
  })

  const run = useCallback(
    async <T>(file: File, fn: (job: VideoJob) => Promise<T>): Promise<T | null> => {
      setState({
        busy: true,
        stage: "Starting",
        progress: 0,
        download: isFFmpegReady() ? null : 0,
        engineReady: isFFmpegReady(),
      })
      try {
        return await processVideo(
          file,
          {
            onStage: (stage) => setState((s) => ({ ...s, stage })),
            onProgress: (progress) => setState((s) => ({ ...s, progress })),
            onDownload: (download) =>
              setState((s) => ({ ...s, download: download >= 1 ? null : download })),
          },
          async (job) => {
            setState((s) => ({ ...s, stage: "Processing", download: null }))
            return await fn(job)
          },
        )
      } catch (e) {
        toast.error(e instanceof Error && e.message ? e.message : "Video processing failed.")
        return null
      } finally {
        setState({
          busy: false,
          stage: "",
          progress: null,
          download: null,
          engineReady: isFFmpegReady(),
        })
      }
    },
    [],
  )

  return { ...state, run }
}
