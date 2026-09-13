import { describe, expect, it } from "vitest"
import {
  auditMeta,
  decodeEntities,
  getTag,
  normalizeInputUrl,
  parseHtmlMeta,
  resolvePreview,
  suggestTags,
} from "../linkPreview"

const FULL = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>
    Tom &amp; Jerry&#39;s Guide
  </title>
  <meta name="description" content="Everything you need to know about cats, mice and cartoons in one page.">
  <meta content='Tom &amp; Jerry' property='og:title'>
  <meta property="og:description" content="OG description">
  <meta property="og:image" content="/img/card.png">
  <meta property="og:url" content="https://example.com/guide">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Example">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="X title">
  <meta name="theme-color" content="#ff0000">
  <link rel="apple-touch-icon" href="/apple.png">
  <link rel="icon" href="/favicon-32.png">
  <link rel="canonical" href="/guide">
  <!-- <meta property="og:title" content="commented out"> -->
  <script>document.write('<meta property="og:image" content="/from-script.png">')</script>
</head>
<body><svg><title>icon title</title></svg></body>
</html>`

describe("parseHtmlMeta", () => {
  const meta = parseHtmlMeta(FULL, "https://example.com/guide?ref=1")

  it("reads the title with entities decoded and whitespace collapsed", () => {
    expect(meta.title).toBe("Tom & Jerry's Guide")
    expect(meta.lang).toBe("en")
  })

  it("reads meta tags regardless of quote style and attribute order", () => {
    expect(getTag(meta, "og:title")).toBe("Tom & Jerry")
    expect(getTag(meta, "description")).toMatch(/^Everything/)
  })

  it("ignores tags inside comments and scripts", () => {
    expect(meta.tags.filter((t) => t.key === "og:title")).toHaveLength(1)
    expect(meta.tags.filter((t) => t.key === "og:image")).toHaveLength(1)
  })

  it("resolves URL-valued tags, keeping the raw value", () => {
    const image = meta.tags.find((t) => t.key === "og:image")
    expect(image?.value).toBe("https://example.com/img/card.png")
    expect(image?.raw).toBe("/img/card.png")
    expect(meta.canonical).toBe("https://example.com/guide")
  })

  it("orders icons with rel=icon before apple-touch-icon", () => {
    expect(meta.icons).toEqual(["https://example.com/favicon-32.png", "https://example.com/apple.png"])
  })

  it("honours <base href>", () => {
    const m = parseHtmlMeta(
      `<base href="https://cdn.example.net/assets/"><meta property="og:image" content="card.png">`,
      "https://example.com/",
    )
    expect(getTag(m, "og:image")).toBe("https://cdn.example.net/assets/card.png")
  })

  it("handles unquoted attributes and > inside quoted values", () => {
    const m = parseHtmlMeta(
      `<meta name=description content="a > b"><meta property=og:type content=website>`,
      "https://example.com/",
    )
    expect(getTag(m, "description")).toBe("a > b")
    expect(getTag(m, "og:type")).toBe("website")
  })
})

describe("resolvePreview", () => {
  const meta = parseHtmlMeta(FULL, "https://example.com/guide")

  it("uses <title> and meta description for Google", () => {
    const p = resolvePreview(meta, "google")
    expect(p.title).toBe("Tom & Jerry's Guide")
    expect(p.description).toMatch(/^Everything/)
    expect(p.favicon).toBe("https://example.com/favicon-32.png")
  })

  it("prefers twitter:* on X and og:* elsewhere", () => {
    expect(resolvePreview(meta, "x").title).toBe("X title")
    expect(resolvePreview(meta, "x").image).toBe("https://example.com/img/card.png")
    expect(resolvePreview(meta, "facebook").title).toBe("Tom & Jerry")
    expect(resolvePreview(meta, "discord").themeColor).toBe("#ff0000")
    expect(resolvePreview(meta, "slack").siteName).toBe("Example")
  })

  it("falls back to <title>, the domain and /favicon.ico", () => {
    const bare = parseHtmlMeta("<title>Just a title</title>", "https://www.bare.dev/x")
    const p = resolvePreview(bare, "whatsapp")
    expect(p.title).toBe("Just a title")
    expect(p.image).toBeUndefined()
    expect(p.siteName).toBe("bare.dev")
    expect(p.favicon).toBe("https://www.bare.dev/favicon.ico")
    expect(p.card).toBe("summary")
  })
})

describe("auditMeta", () => {
  const severity = (checks: ReturnType<typeof auditMeta>, id: string) =>
    checks.find((c) => c.id === id)?.severity

  it("flags a page with no tags", () => {
    const checks = auditMeta(parseHtmlMeta("<p>hi</p>", "https://example.com/"))
    expect(severity(checks, "title")).toBe("error")
    expect(severity(checks, "og:title")).toBe("error")
    expect(severity(checks, "og:image")).toBe("error")
    expect(severity(checks, "twitter:card")).toBe("warning")
    expect(checks[0].severity).toBe("error")
  })

  it("flags a relative og:image even though it resolves", () => {
    const checks = auditMeta(parseHtmlMeta(FULL, "https://example.com/guide"))
    expect(severity(checks, "og:image:absolute")).toBe("error")
  })

  it("checks the measured image size and load failures", () => {
    const meta = parseHtmlMeta(
      `<meta property="og:image" content="https://example.com/a.png">`,
      "https://example.com/",
    )
    expect(severity(auditMeta(meta, { width: 150, height: 150 }), "og:image:size")).toBe("error")
    expect(severity(auditMeta(meta, { width: 800, height: 420 }), "og:image:size")).toBe("warning")
    expect(severity(auditMeta(meta, { width: 1200, height: 630 }), "og:image:size")).toBe("ok")
    expect(severity(auditMeta(meta, { width: 1200, height: 1200 }), "og:image:ratio")).toBe("warning")
    expect(severity(auditMeta(meta, null), "og:image:load")).toBe("error")
    expect(severity(auditMeta(meta), "og:image:size")).toBeUndefined()
  })

  it("warns on long titles and invalid card types", () => {
    const meta = parseHtmlMeta(
      `<title>${"a".repeat(70)}</title><meta name="twitter:card" content="large">`,
      "https://example.com/",
    )
    const checks = auditMeta(meta)
    expect(severity(checks, "title")).toBe("warning")
    expect(severity(checks, "twitter:card")).toBe("error")
  })
})

describe("suggestTags", () => {
  it("fills existing values and escapes attributes", () => {
    const meta = parseHtmlMeta(
      `<title>Say "hi"</title><meta property="og:image" content="https://example.com/a.png">`,
      "https://example.com/page",
    )
    const tags = suggestTags(meta, { width: 1000, height: 500 })
    expect(tags).toContain(`<meta property="og:title" content="Say &quot;hi&quot;" />`)
    expect(tags).toContain(`<meta property="og:image:width" content="1000" />`)
    expect(tags).toContain(`<meta property="og:url" content="https://example.com/page" />`)
    expect(tags).toContain(`<meta name="twitter:card" content="summary_large_image" />`)
  })
})

describe("helpers", () => {
  it("decodes numeric and named entities, leaving unknown ones", () => {
    expect(decodeEntities("&#x41;&#66;&hellip;&unknown;&AMP;")).toBe("AB…&unknown;&")
  })

  it("normalizes user-typed URLs", () => {
    expect(normalizeInputUrl("example.com/a")).toBe("https://example.com/a")
    expect(normalizeInputUrl("  http://example.com ")).toBe("http://example.com/")
    expect(normalizeInputUrl("ftp://example.com")).toBeUndefined()
    expect(normalizeInputUrl("not a url")).toBeUndefined()
    expect(normalizeInputUrl("")).toBeUndefined()
  })
})
