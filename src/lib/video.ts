import type { FFmpeg } from "@ffmpeg/ffmpeg"

/**
 * Video processing runs on ffmpeg.wasm. The engine (~32 MB) is fetched from a CDN
 * on first use and cached by the browser; the video itself never leaves the device.
 */
const CORE_VERSION = "0.12.10"

/**
 * The ESM core build, not the UMD one the ffmpeg.wasm README suggests.
 * ffmpeg's worker tries `importScripts(coreURL)` first and falls back to
 * `import(coreURL)`. Vite serves module workers in dev, where importScripts does
 * not exist, so a UMD core cannot be loaded at all; the ESM build imports cleanly
 * in both worker types, and the wasm URL is handed to it explicitly either way.
 */
const CORE_BASES = [
  `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/esm`,
  `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm`,
]

export const acceptedVideoTypes = "video/*,.mkv,.avi,.mov,.webm,.mp4,.m4v,.mpg,.mpeg,.ts"

export interface VideoMeta {
  duration: number
  width: number
  height: number
}

/**
 * Reads duration and dimensions with a <video> element. Returns null for containers
 * the browser cannot decode (mkv, avi, …) — ffmpeg still handles those, the UI just
 * has to ask for timecodes instead of offering a scrubber. Also used to report the
 * real length of a result, which a keyframe-snapped copy can stretch.
 */
export async function probeVideo(file: Blob): Promise<VideoMeta | null> {
  const url = URL.createObjectURL(file)
  try {
    return await new Promise<VideoMeta | null>((resolve) => {
      const video = document.createElement("video")
      video.preload = "metadata"
      video.muted = true
      const done = (meta: VideoMeta | null) => {
        video.removeAttribute("src")
        video.load()
        resolve(meta)
      }
      const timer = setTimeout(() => done(null), 15_000)
      video.onloadedmetadata = () => {
        clearTimeout(timer)
        const duration = Number.isFinite(video.duration) ? video.duration : 0
        done(
          duration > 0
            ? { duration, width: video.videoWidth, height: video.videoHeight }
            : null,
        )
      }
      video.onerror = () => {
        clearTimeout(timer)
        done(null)
      }
      video.src = url
    })
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1_000)
  }
}

/* ------------------------------------------------------------------ */
/* Timecodes                                                           */
/* ------------------------------------------------------------------ */

/** Parses "90", "1:30", "00:01:30.5" into seconds. Returns null when unparsable. */
export function parseTimecode(value: string): number | null {
  const text = value.trim()
  if (!text) return null
  const parts = text.split(":")
  if (parts.length > 3) return null
  let seconds = 0
  for (const part of parts) {
    if (!/^\d*\.?\d+$/.test(part.trim())) return null
    seconds = seconds * 60 + Number(part)
  }
  return Number.isFinite(seconds) ? seconds : null
}

/** Formats seconds as m:ss, or h:mm:ss past an hour. `decimals` adds fractions. */
export function formatTimecode(seconds: number, decimals = 0): string {
  const total = Math.max(0, seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  const pad = (n: number) => String(Math.floor(n)).padStart(2, "0")
  const secText = decimals > 0 ? secs.toFixed(decimals).padStart(decimals + 3, "0") : pad(secs)
  return hours > 0 ? `${hours}:${pad(minutes)}:${secText}` : `${minutes}:${secText}`
}

/** Timecode shaped for a filename: 1:02:03 -> 01h02m03s */
export function timecodeSlug(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${pad(h)}h${pad(m)}m${pad(s)}s` : `${pad(m)}m${pad(s)}s`
}

export interface Segment {
  start: number
  end: number
}

/** Splits [0, duration) into `count` segments of equal length. */
export function equalSegments(duration: number, count: number): Segment[] {
  if (!(duration > 0) || !Number.isFinite(count) || count < 1) return []
  const parts = Math.min(Math.floor(count), 200)
  const size = duration / parts
  return Array.from({ length: parts }, (_, i) => ({
    start: i * size,
    end: i === parts - 1 ? duration : (i + 1) * size,
  }))
}

/** Splits [0, duration) into segments of at most `size` seconds. */
export function fixedSegments(duration: number, size: number): Segment[] {
  if (!(duration > 0) || !(size > 0)) return []
  const count = Math.min(Math.ceil(duration / size), 200)
  return Array.from({ length: count }, (_, i) => ({
    start: i * size,
    end: Math.min((i + 1) * size, duration),
  }))
}

/**
 * Turns comma/newline separated cut points into segments covering the whole video.
 * Throws with a readable message on bad input so pages can surface it in a toast.
 */
export function segmentsFromCutPoints(text: string, duration: number): Segment[] {
  const tokens = text
    .split(/[\n,]/)
    .map((t) => t.trim())
    .filter(Boolean)
  if (tokens.length === 0) throw new Error("Enter at least one cut point, e.g. 0:30, 1:15")

  const points: number[] = []
  for (const token of tokens) {
    const seconds = parseTimecode(token)
    if (seconds === null) throw new Error(`"${token}" is not a valid time. Use 0:30 or 90.`)
    if (duration > 0 && seconds >= duration) {
      throw new Error(`"${token}" is past the end of the video.`)
    }
    if (seconds > 0) points.push(seconds)
  }

  const sorted = [...new Set(points)].sort((a, b) => a - b)
  if (sorted.length === 0) throw new Error("Cut points must be greater than 0.")

  const bounds = [0, ...sorted, duration]
  const segments: Segment[] = []
  for (let i = 0; i < bounds.length - 1; i++) {
    if (bounds[i + 1] - bounds[i] > 0.05) segments.push({ start: bounds[i], end: bounds[i + 1] })
  }
  return segments
}

/**
 * Cut points for ffmpeg's segment muxer: the inner boundaries only, since the
 * start of the first part and the end of the last one are the file's own ends.
 */
export function segmentTimes(segments: Segment[]): string {
  return segments
    .slice(1)
    .map((s) => s.start.toFixed(3))
    .join(",")
}

/**
 * Splits a file into parts without re-encoding. The segment muxer starts each new
 * part on a keyframe, so parts never overlap and no frame is lost — but a file with
 * sparse keyframes yields fewer parts than asked for.
 */
export function segmentArgs(segments: Segment[], pattern: string): string[] {
  return [
    "-i",
    "INPUT",
    "-c",
    "copy",
    "-map",
    "0",
    "-f",
    "segment",
    "-segment_times",
    segmentTimes(segments),
    "-reset_timestamps",
    "1",
    pattern,
  ]
}

/* ------------------------------------------------------------------ */
/* Encoder argument builders                                           */
/* ------------------------------------------------------------------ */

export type VideoFormat = "mp4" | "webm"
export type AudioFormat = "mp3" | "m4a" | "wav" | "opus"

export const videoMimeTypes: Record<VideoFormat, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
}

export const audioMimeTypes: Record<AudioFormat, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  opus: "audio/ogg",
}

/** Audio-only encoder flags. WAV is uncompressed, so bitrate does not apply. */
export function audioCodecArgs(format: AudioFormat, bitrateKbps: number): string[] {
  const rate = `${Math.round(bitrateKbps)}k`
  switch (format) {
    case "mp3":
      return ["-c:a", "libmp3lame", "-b:a", rate]
    case "m4a":
      return ["-c:a", "aac", "-b:a", rate]
    case "opus":
      return ["-c:a", "libopus", "-b:a", rate]
    case "wav":
      return ["-c:a", "pcm_s16le"]
  }
}

/**
 * Scale filter that keeps the aspect ratio and never upscales.
 * -2 keeps the other side even, which h264 and vp9 both require.
 */
export function scaleFilter(maxHeight: number | null): string | null {
  if (!maxHeight || maxHeight <= 0) return null
  return `scale=-2:'min(${Math.round(maxHeight)},ih)'`
}

/**
 * Container to use when copying streams instead of re-encoding. The source
 * container is kept when it can hold arbitrary codecs; anything else falls back to
 * Matroska, which can mux practically any stream ffmpeg hands it.
 */
export function copyContainer(filename: string): { ext: string; mime: string } {
  const i = filename.lastIndexOf(".")
  const ext = i > 0 ? filename.slice(i + 1).toLowerCase() : ""
  const known: Record<string, string> = {
    mp4: "video/mp4",
    m4v: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    mkv: "video/x-matroska",
    ts: "video/mp2t",
  }
  return ext in known ? { ext, mime: known[ext] } : { ext: "mkv", mime: "video/x-matroska" }
}

export interface TranscodeOptions {
  format: VideoFormat
  /** 0 = best quality, 100 = smallest file. Mapped onto the codec's CRF range. */
  quality: number
  maxHeight: number | null
  fps: number | null
  muted: boolean
  audioBitrateKbps?: number
}

export function transcodeArgs(opts: TranscodeOptions): string[] {
  const args: string[] = []
  const filters: string[] = []
  const scale = scaleFilter(opts.maxHeight)
  if (scale) filters.push(scale)
  if (opts.fps && opts.fps > 0) filters.push(`fps=${opts.fps}`)
  if (filters.length > 0) args.push("-vf", filters.join(","))

  const quality = Math.min(100, Math.max(0, opts.quality))
  if (opts.format === "mp4") {
    // x264: CRF 18 (visually lossless) … 34 (small)
    const crf = Math.round(18 + (quality / 100) * 16)
    args.push("-c:v", "libx264", "-preset", "ultrafast", "-crf", String(crf))
    args.push("-pix_fmt", "yuv420p", "-movflags", "+faststart")
  } else {
    // vp9: CRF 24 … 44. The realtime deadline keeps wasm encoding usable.
    const crf = Math.round(24 + (quality / 100) * 20)
    args.push("-c:v", "libvpx-vp9", "-crf", String(crf), "-b:v", "0")
    args.push("-deadline", "realtime", "-cpu-used", "8", "-row-mt", "1")
  }

  if (opts.muted) {
    args.push("-an")
  } else {
    const rate = `${Math.round(opts.audioBitrateKbps ?? 128)}k`
    args.push(...(opts.format === "mp4" ? ["-c:a", "aac"] : ["-c:a", "libopus"]), "-b:a", rate)
  }
  return args
}

export interface GifOptions {
  fps: number
  width: number
  /** Dithering trades file size for smoother gradients. */
  dither: boolean
}

export function gifFilter(opts: GifOptions): string {
  const base = `fps=${opts.fps},scale=${Math.round(opts.width)}:-1:flags=lanczos`
  const use = opts.dither ? "paletteuse=dither=bayer:bayer_scale=3" : "paletteuse=dither=none"
  return `${base},split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]${use}`
}

/**
 * Seek flags shared by every trim-style operation. Seeking before -i is fast but
 * lands on a keyframe; `copy` false re-encodes for a frame-accurate cut.
 */
export function trimArgs(start: number, end: number, copy: boolean): string[] {
  const duration = Math.max(0, end - start)
  const args: string[] = []
  if (start > 0) args.push("-ss", start.toFixed(3))
  args.push("-i", "INPUT")
  if (duration > 0) args.push("-t", duration.toFixed(3))
  if (copy) args.push("-c", "copy", "-avoid_negative_ts", "make_zero")
  return args
}

/* ------------------------------------------------------------------ */
/* ffmpeg.wasm runtime                                                 */
/* ------------------------------------------------------------------ */

export interface LoadHooks {
  /** 0..1 download progress for the engine itself. */
  onDownload?: (ratio: number) => void
}

let instance: FFmpeg | null = null
let loadPromise: Promise<FFmpeg> | null = null

/** Roughly the decompressed size of ffmpeg-core.wasm, used when the server does
 * not report one (CDNs gzip the response, so Content-Length is the packed size). */
const CORE_WASM_BYTES = 32 * 1024 * 1024

const CORE_CACHE = "ffmpeg-core"

/**
 * How many bytes to expect for a download. A gzipped response reports the packed
 * length, which would drive the progress bar past 100%, so fall back to the
 * estimate whenever the body is encoded or no length is given.
 */
export function expectedBytes(headers: Headers, estimate: number): number {
  if (headers.get("Content-Encoding")) return estimate
  const length = Number(headers.get("Content-Length"))
  return Number.isFinite(length) && length > 0 ? length : estimate
}

async function cachedResponse(url: string): Promise<Response | null> {
  try {
    const cache = await caches.open(CORE_CACHE)
    return (await cache.match(url)) ?? null
  } catch {
    // Cache Storage is unavailable in some private-browsing modes.
    return null
  }
}

async function cacheResponse(url: string, blob: Blob): Promise<void> {
  try {
    const cache = await caches.open(CORE_CACHE)
    await cache.put(url, new Response(blob))
  } catch {
    // Storage full or unavailable — the engine still works, it just re-downloads.
  }
}

/**
 * Downloads one engine asset and hands back a blob URL.
 *
 * @ffmpeg/util does this too, but its progress path re-reads an already consumed
 * response body when the stream fails, which turns any hiccup into a confusing
 * "body stream already read" error. Reading it here keeps one response, one read.
 */
async function assetBlobURL(
  url: string,
  mimeType: string,
  estimate: number,
  onProgress?: (ratio: number) => void,
): Promise<string> {
  const cached = await cachedResponse(url)
  if (cached) {
    onProgress?.(1)
    return URL.createObjectURL(new Blob([await cached.arrayBuffer()], { type: mimeType }))
  }

  const blob = await downloadBlob(url, mimeType, estimate, onProgress)
  void cacheResponse(url, blob)
  return URL.createObjectURL(blob)
}

/** Fetches a URL into a Blob, reporting 0..1 progress. Exported for tests. */
export async function downloadBlob(
  url: string,
  mimeType: string,
  estimate: number,
  onProgress?: (ratio: number) => void,
): Promise<Blob> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} returned ${response.status} ${response.statusText}`)

  const reader = response.body?.getReader()
  if (!reader) return new Blob([await response.arrayBuffer()], { type: mimeType })

  const total = expectedBytes(response.headers, estimate)
  const chunks: Uint8Array[] = []
  let received = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      received += value.length
      onProgress?.(Math.min(0.99, received / total))
    }
  } catch {
    // The body is spent, so a retry needs a brand new request.
    const retry = await fetch(url)
    if (!retry.ok) throw new Error(`${url} returned ${retry.status} ${retry.statusText}`)
    const blob = new Blob([await retry.arrayBuffer()], { type: mimeType })
    onProgress?.(1)
    return blob
  }

  onProgress?.(1)
  return new Blob(chunks as BlobPart[], { type: mimeType })
}

async function loadFFmpeg(hooks: LoadHooks): Promise<FFmpeg> {
  const { FFmpeg } = await import("@ffmpeg/ffmpeg")
  const ffmpeg = new FFmpeg()

  let lastError: unknown = null
  for (const base of CORE_BASES) {
    try {
      const coreURL = await assetBlobURL(
        `${base}/ffmpeg-core.js`,
        "text/javascript",
        200 * 1024,
      )
      const wasmURL = await assetBlobURL(
        `${base}/ffmpeg-core.wasm`,
        "application/wasm",
        CORE_WASM_BYTES,
        hooks.onDownload,
      )
      await ffmpeg.load({ coreURL, wasmURL })
      hooks.onDownload?.(1)
      return ffmpeg
    } catch (e) {
      // The worker clones rejections, so what arrives here is not always an Error.
      console.error(`ffmpeg core failed to load from ${base}`, e)
      lastError = e
    }
  }
  const detail = describeError(lastError)
  throw new Error(
    detail
      ? `Could not load the video engine: ${detail}`
      : "Could not load the video engine. Check your connection and try again.",
  )
}

/** Pulls a message out of whatever a worker rejection turns into. */
function describeError(e: unknown): string {
  if (typeof e === "string") return e
  if (e instanceof Error) return e.message
  if (e && typeof e === "object" && "message" in e) {
    const { message } = e as { message: unknown }
    if (typeof message === "string") return message
  }
  return ""
}

export async function getFFmpeg(hooks: LoadHooks = {}): Promise<FFmpeg> {
  if (instance) return instance
  if (!loadPromise) {
    loadPromise = loadFFmpeg(hooks)
      .then((ff) => {
        instance = ff
        return ff
      })
      .catch((e) => {
        // Let a later attempt retry the download instead of caching the failure.
        loadPromise = null
        throw e
      })
  }
  return await loadPromise
}

/** True once the engine is in memory — lets pages drop the "first run downloads" note. */
export function isFFmpegReady(): boolean {
  return instance !== null
}

export interface JobHooks extends LoadHooks {
  /** 0..1 progress of the current ffmpeg run. */
  onProgress?: (ratio: number) => void
  onStage?: (stage: string) => void
}

export interface VideoJob {
  /**
   * Runs one ffmpeg invocation against the already-written input.
   * Use the literal "INPUT" and "OUTPUT" tokens inside `args`.
   */
  run(args: string[], outputName: string, mimeType: string): Promise<Blob>
  /**
   * Runs one invocation that writes several files (the segment muxer) and collects
   * every output whose name starts with `prefix`, in order.
   */
  runMany(args: string[], prefix: string, mimeType: string): Promise<Blob[]>
}

function extensionOf(name: string): string {
  const i = name.lastIndexOf(".")
  const ext = i > 0 ? name.slice(i + 1).toLowerCase() : ""
  return /^[a-z0-9]{1,5}$/.test(ext) ? ext : "bin"
}

// ffmpeg.wasm has one filesystem and one call stack, so runs are serialized.
let queue: Promise<unknown> = Promise.resolve()

/**
 * Writes `file` into the ffmpeg filesystem once, hands a runner to `fn`, and cleans
 * up afterwards. Concurrent calls queue behind each other.
 */
export async function processVideo<T>(
  file: File,
  hooks: JobHooks,
  fn: (job: VideoJob) => Promise<T>,
): Promise<T> {
  const task = queue.then(async () => {
    hooks.onStage?.("Loading engine")
    const ffmpeg = await getFFmpeg(hooks)

    const inputName = `input-${Date.now()}.${extensionOf(file.name)}`
    const written: string[] = []
    const logs: string[] = []
    const onLog = ({ message }: { message: string }) => {
      logs.push(message)
      if (logs.length > 40) logs.shift()
    }
    const onProgress = ({ progress }: { progress: number }) => {
      if (Number.isFinite(progress)) hooks.onProgress?.(Math.min(1, Math.max(0, progress)))
    }
    ffmpeg.on("log", onLog)
    ffmpeg.on("progress", onProgress)

    try {
      hooks.onStage?.("Reading file")
      await ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()))
      written.push(inputName)

      const exec = async (args: string[], outputName?: string) => {
        const resolved = args.map((a) =>
          a === "INPUT" ? inputName : a === "OUTPUT" && outputName ? outputName : a,
        )
        if (outputName && !resolved.includes(outputName)) resolved.push(outputName)
        logs.length = 0
        hooks.onProgress?.(0)
        const code = await ffmpeg.exec(resolved)
        if (code !== 0) throw new Error(ffmpegError(logs))
      }

      const collect = async (name: string, mimeType: string) => {
        const data = await ffmpeg.readFile(name)
        if (typeof data === "string") throw new Error("ffmpeg returned unexpected text output.")
        // Copy out of the wasm heap so the Blob survives the next run.
        const bytes = new Uint8Array(data.length)
        bytes.set(data)
        if (bytes.length === 0) throw new Error(ffmpegError(logs))
        return new Blob([bytes], { type: mimeType })
      }

      const job: VideoJob = {
        async run(args, outputName, mimeType) {
          await exec(args, outputName)
          written.push(outputName)
          const blob = await collect(outputName, mimeType)
          hooks.onProgress?.(1)
          return blob
        },
        async runMany(args, prefix, mimeType) {
          await exec(args)
          const nodes = await ffmpeg.listDir("/")
          const names = nodes
            .filter((n) => !n.isDir && n.name.startsWith(prefix))
            .map((n) => n.name)
            .sort()
          if (names.length === 0) throw new Error(ffmpegError(logs))
          const blobs: Blob[] = []
          for (const name of names) {
            written.push(name)
            blobs.push(await collect(name, mimeType))
          }
          hooks.onProgress?.(1)
          return blobs
        },
      }

      return await fn(job)
    } finally {
      ffmpeg.off("log", onLog)
      ffmpeg.off("progress", onProgress)
      for (const name of written) {
        try {
          await ffmpeg.deleteFile(name)
        } catch {
          // The file may never have been created; nothing to clean up.
        }
      }
    }
  })

  // Keep the chain alive when a task fails, so later jobs still run.
  queue = task.catch(() => undefined)
  return await task
}

/** Picks the most useful line out of the ffmpeg log tail. */
export function ffmpegError(logs: string[]): string {
  const detail = [...logs]
    .reverse()
    .find((line) =>
      /error|invalid|unable|not found|no such|failed|unknown encoder|does not contain/i.test(line),
    )
    ?.trim()
  return detail
    ? `ffmpeg failed: ${detail}`
    : "ffmpeg could not process this file. It may be corrupted or use an unsupported codec."
}
