import { describe, expect, it } from "vitest"
import {
  audioCodecArgs,
  copyContainer,
  equalSegments,
  ffmpegError,
  fixedSegments,
  formatTimecode,
  gifFilter,
  parseTimecode,
  scaleFilter,
  segmentsFromCutPoints,
  timecodeSlug,
  transcodeArgs,
  trimArgs,
} from "../video"

describe("parseTimecode", () => {
  it("reads plain seconds", () => {
    expect(parseTimecode("90")).toBe(90)
    expect(parseTimecode(" 12.5 ")).toBe(12.5)
  })

  it("reads m:ss and h:mm:ss", () => {
    expect(parseTimecode("1:30")).toBe(90)
    expect(parseTimecode("01:02:03")).toBe(3723)
    expect(parseTimecode("0:00.5")).toBe(0.5)
  })

  it("rejects junk", () => {
    for (const bad of ["", "abc", "1:2:3:4", "1:-2", "--", "1:"]) {
      expect(parseTimecode(bad), bad).toBeNull()
    }
  })
})

describe("formatTimecode", () => {
  it("formats below and above an hour", () => {
    expect(formatTimecode(0)).toBe("0:00")
    expect(formatTimecode(9)).toBe("0:09")
    expect(formatTimecode(90)).toBe("1:30")
    expect(formatTimecode(3723)).toBe("1:02:03")
  })

  it("keeps decimals padded", () => {
    expect(formatTimecode(5.25, 1)).toBe("0:05.3")
    expect(formatTimecode(65.04, 2)).toBe("1:05.04")
  })

  it("clamps negatives", () => {
    expect(formatTimecode(-5)).toBe("0:00")
  })

  it("round-trips through parseTimecode", () => {
    for (const seconds of [0, 7, 59.5, 60, 601, 3723]) {
      expect(parseTimecode(formatTimecode(seconds, 1))).toBeCloseTo(seconds, 1)
    }
  })
})

describe("timecodeSlug", () => {
  it("is filename safe", () => {
    expect(timecodeSlug(0)).toBe("00m00s")
    expect(timecodeSlug(75)).toBe("01m15s")
    expect(timecodeSlug(3723)).toBe("01h02m03s")
    expect(/^[0-9a-z]+$/.test(timecodeSlug(3723))).toBe(true)
  })
})

describe("segments", () => {
  it("splits into equal parts covering the whole video", () => {
    const segments = equalSegments(100, 4)
    expect(segments).toHaveLength(4)
    expect(segments[0]).toEqual({ start: 0, end: 25 })
    expect(segments[3].end).toBe(100)
  })

  it("ends the last equal part exactly on the duration", () => {
    const segments = equalSegments(10, 3)
    expect(segments[2].end).toBe(10)
  })

  it("rejects nonsense inputs", () => {
    expect(equalSegments(0, 3)).toEqual([])
    expect(equalSegments(10, 0)).toEqual([])
    expect(fixedSegments(10, 0)).toEqual([])
  })

  it("cuts fixed-length chunks and trims the tail", () => {
    const segments = fixedSegments(25, 10)
    expect(segments).toHaveLength(3)
    expect(segments[2]).toEqual({ start: 20, end: 25 })
  })

  it("caps the number of segments", () => {
    expect(fixedSegments(100_000, 1).length).toBeLessThanOrEqual(200)
    expect(equalSegments(100, 5_000).length).toBeLessThanOrEqual(200)
  })
})

describe("segmentsFromCutPoints", () => {
  it("builds segments between the cut points", () => {
    expect(segmentsFromCutPoints("0:30, 1:00", 90)).toEqual([
      { start: 0, end: 30 },
      { start: 30, end: 60 },
      { start: 60, end: 90 },
    ])
  })

  it("sorts, de-duplicates and ignores zero", () => {
    expect(segmentsFromCutPoints("60, 0, 30, 30", 90)).toEqual([
      { start: 0, end: 30 },
      { start: 30, end: 60 },
      { start: 60, end: 90 },
    ])
  })

  it("accepts newline separated input", () => {
    expect(segmentsFromCutPoints("30\n60", 90)).toHaveLength(3)
  })

  it("explains bad input", () => {
    expect(() => segmentsFromCutPoints("", 90)).toThrow(/at least one/i)
    expect(() => segmentsFromCutPoints("abc", 90)).toThrow(/not a valid time/i)
    expect(() => segmentsFromCutPoints("120", 90)).toThrow(/past the end/i)
    expect(() => segmentsFromCutPoints("0", 90)).toThrow(/greater than 0/i)
  })
})

describe("copyContainer", () => {
  it("keeps containers that can hold any codec", () => {
    expect(copyContainer("clip.mp4")).toEqual({ ext: "mp4", mime: "video/mp4" })
    expect(copyContainer("CLIP.MOV").ext).toBe("mov")
    expect(copyContainer("a.webm").ext).toBe("webm")
  })

  it("falls back to Matroska for everything else", () => {
    expect(copyContainer("clip.avi")).toEqual({ ext: "mkv", mime: "video/x-matroska" })
    expect(copyContainer("noextension").ext).toBe("mkv")
  })
})

describe("argument builders", () => {
  it("seeks before the input and limits by duration", () => {
    const args = trimArgs(10, 25, true)
    expect(args.indexOf("-ss")).toBeLessThan(args.indexOf("-i"))
    expect(args).toContain("15.000")
    expect(args).toContain("copy")
  })

  it("omits -ss when starting at zero and skips copy when re-encoding", () => {
    const args = trimArgs(0, 5, false)
    expect(args).not.toContain("-ss")
    expect(args).not.toContain("copy")
    expect(args.slice(0, 2)).toEqual(["-i", "INPUT"])
  })

  it("maps audio formats onto encoders", () => {
    expect(audioCodecArgs("mp3", 192)).toEqual(["-c:a", "libmp3lame", "-b:a", "192k"])
    expect(audioCodecArgs("m4a", 128)).toEqual(["-c:a", "aac", "-b:a", "128k"])
    expect(audioCodecArgs("opus", 96)).toEqual(["-c:a", "libopus", "-b:a", "96k"])
    expect(audioCodecArgs("wav", 192)).toEqual(["-c:a", "pcm_s16le"])
  })

  it("never upscales", () => {
    expect(scaleFilter(720)).toBe("scale=-2:'min(720,ih)'")
    expect(scaleFilter(null)).toBeNull()
    expect(scaleFilter(0)).toBeNull()
  })

  it("picks codecs per container and honours mute", () => {
    const mp4 = transcodeArgs({
      format: "mp4",
      quality: 50,
      maxHeight: 720,
      fps: 30,
      muted: false,
    })
    expect(mp4).toContain("libx264")
    expect(mp4).toContain("aac")
    expect(mp4.join(" ")).toContain("scale=-2:'min(720,ih)',fps=30")

    const webm = transcodeArgs({
      format: "webm",
      quality: 50,
      maxHeight: null,
      fps: null,
      muted: true,
    })
    expect(webm).toContain("libvpx-vp9")
    expect(webm).toContain("-an")
    expect(webm).not.toContain("-vf")
  })

  it("maps quality onto a sane CRF range", () => {
    const crf = (quality: number) => {
      const args = transcodeArgs({ format: "mp4", quality, maxHeight: null, fps: null, muted: true })
      return Number(args[args.indexOf("-crf") + 1])
    }
    expect(crf(0)).toBe(18)
    expect(crf(100)).toBe(34)
    expect(crf(200)).toBe(34)
    expect(crf(-50)).toBe(18)
  })

  it("builds a two-pass palette filter for GIFs", () => {
    const filter = gifFilter({ fps: 12, width: 480, dither: true })
    expect(filter).toContain("fps=12")
    expect(filter).toContain("scale=480:-1:flags=lanczos")
    expect(filter).toContain("palettegen")
    expect(filter).toContain("paletteuse=dither=bayer")
    expect(gifFilter({ fps: 12, width: 480, dither: false })).toContain("dither=none")
  })
})

describe("ffmpegError", () => {
  it("surfaces the most relevant log line", () => {
    expect(ffmpegError(["frame= 10", "Unknown encoder 'libfoo'"])).toContain("libfoo")
  })

  it("falls back to a readable message", () => {
    expect(ffmpegError([])).toMatch(/could not process/i)
    expect(ffmpegError(["frame= 1", "frame= 2"])).toMatch(/could not process/i)
  })
})
