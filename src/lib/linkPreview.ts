/**
 * Link-preview metadata: parse <head> tags, resolve what each platform shows,
 * and check the tags against what those platforms need.
 *
 * Pure string processing (no DOM) so it's testable in Node and behaves the same
 * for fetched and pasted HTML.
 */

export interface MetaTag {
  /** Lowercased name / property / itemprop, e.g. "og:image". */
  key: string
  /** Value with URL-valued tags resolved to absolute URLs. */
  value: string
  /** Value exactly as written in the HTML. */
  raw: string
}

export interface PageMeta {
  /** Page URL, used as the base for relative links. */
  url: string
  title?: string
  lang?: string
  canonical?: string
  /** Declared icons, resolved to absolute URLs, best first. */
  icons: string[]
  tags: MetaTag[]
}

export type PlatformId =
  | "google"
  | "x"
  | "facebook"
  | "linkedin"
  | "whatsapp"
  | "slack"
  | "discord"
  | "imessage"

export interface Preview {
  title?: string
  description?: string
  image?: string
  siteName: string
  /** URL the platform displays for the link. */
  url: string
  domain: string
  favicon: string
  themeColor?: string
  /** twitter:card value ("summary" when absent). */
  card: string
}

export interface ImageSize {
  width: number
  height: number
}

export type Severity = "error" | "warning" | "ok"

export interface Check {
  id: string
  severity: Severity
  message: string
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  laquo: "«",
  raquo: "»",
  middot: "·",
  bull: "•",
  copy: "©",
  reg: "®",
  trade: "™",
}

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (all, code: string) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : all
    }
    return NAMED_ENTITIES[code] ?? NAMED_ENTITIES[code.toLowerCase()] ?? all
  })
}

function parseAttributes(source: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const m of source.matchAll(/([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    const name = m[1].toLowerCase()
    if (!(name in attrs)) attrs[name] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "")
  }
  return attrs
}

function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

export function absoluteUrl(value: string | undefined, base: string): string | undefined {
  if (!value) return undefined
  try {
    return new URL(value.trim(), base).href
  } catch {
    return undefined
  }
}

export function parseHtmlMeta(html: string, pageUrl: string): PageMeta {
  // Drop comments and script/style bodies so strings inside them aren't mistaken for tags.
  const clean = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, "")

  const bodyAt = clean.search(/<body[\s>]/i)
  const head = bodyAt === -1 ? clean : clean.slice(0, bodyAt)
  const titleMatch = head.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)

  const meta: PageMeta = { url: pageUrl, icons: [], tags: [] }
  if (titleMatch) meta.title = collapse(decodeEntities(titleMatch[1]))

  let base = pageUrl
  const icons: { href: string; rank: number }[] = []

  for (const m of clean.matchAll(/<(meta|link|base|html)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi)) {
    const tag = m[1].toLowerCase()
    const attrs = parseAttributes(m[2])
    if (tag === "html") {
      meta.lang ??= attrs.lang || undefined
    } else if (tag === "base") {
      if (attrs.href && base === pageUrl) base = absoluteUrl(attrs.href, pageUrl) ?? pageUrl
    } else if (tag === "meta") {
      const key = (attrs.property ?? attrs.name ?? attrs.itemprop ?? "").trim().toLowerCase()
      if (key && "content" in attrs) {
        const value = collapse(attrs.content)
        meta.tags.push({ key, value, raw: value })
      }
    } else {
      const rel = (attrs.rel ?? "").toLowerCase().split(/\s+/)
      if (rel.includes("canonical") && attrs.href) meta.canonical ??= attrs.href
      if (attrs.href && rel.some((r) => r === "icon" || r === "apple-touch-icon")) {
        icons.push({ href: attrs.href, rank: rel.includes("icon") ? 0 : 1 })
      }
    }
  }

  meta.canonical = absoluteUrl(meta.canonical, base)
  meta.icons = icons
    .sort((a, b) => a.rank - b.rank)
    .map((i) => absoluteUrl(i.href, base))
    .filter((href): href is string => !!href)
  for (const t of meta.tags) {
    if (URL_KEYS.has(t.key)) t.value = absoluteUrl(t.value, base) ?? t.value
  }
  return meta
}

const URL_KEYS = new Set([
  "og:image",
  "og:image:url",
  "og:image:secure_url",
  "og:url",
  "twitter:image",
  "twitter:image:src",
])

/** First non-empty value for any of the keys, in priority order. */
export function getTag(meta: PageMeta, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const hit = meta.tags.find((t) => t.key === key && t.value)
    if (hit) return hit.value
  }
  return undefined
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

export function resolvePreview(meta: PageMeta, platform: PlatformId): Preview {
  const ogUrl = getTag(meta, "og:url")
  const shared = {
    favicon: meta.icons[0] ?? absoluteUrl("/favicon.ico", meta.url) ?? "",
    themeColor: getTag(meta, "theme-color"),
    card: getTag(meta, "twitter:card") ?? "summary",
  }

  if (platform === "google") {
    const url = meta.canonical ?? meta.url
    return {
      ...shared,
      title: meta.title ?? getTag(meta, "og:title"),
      description: getTag(meta, "description") ?? getTag(meta, "og:description"),
      siteName: getTag(meta, "og:site_name", "application-name") ?? hostname(url),
      url,
      domain: hostname(url),
    }
  }

  const url = ogUrl ?? meta.canonical ?? meta.url
  const siteName = getTag(meta, "og:site_name") ?? hostname(url)

  if (platform === "x") {
    return {
      ...shared,
      title: getTag(meta, "twitter:title", "og:title") ?? meta.title,
      description: getTag(meta, "twitter:description", "og:description", "description"),
      image: getTag(meta, "twitter:image", "twitter:image:src", "og:image", "og:image:url"),
      siteName,
      url,
      domain: hostname(url),
    }
  }

  return {
    ...shared,
    title: getTag(meta, "og:title", "twitter:title") ?? meta.title,
    description: getTag(meta, "og:description", "twitter:description", "description"),
    image: getTag(meta, "og:image", "og:image:url", "og:image:secure_url", "twitter:image"),
    siteName,
    url,
    domain: hostname(url),
  }
}

const TWITTER_CARDS = ["summary", "summary_large_image", "app", "player"]

/**
 * Check the tags against what search engines and share previews need.
 * `image` is the measured og:image size: undefined while still loading,
 * null when it failed to load.
 */
export function auditMeta(meta: PageMeta, image?: ImageSize | null): Check[] {
  const checks: Check[] = []
  const add = (id: string, severity: Severity, message: string) =>
    checks.push({ id, severity, message })

  const title = meta.title
  if (!title) add("title", "error", "No <title>. Search results and many previews fall back to the bare URL.")
  else if (title.length > 60) add("title", "warning", `<title> is ${title.length} characters — Google usually cuts it off around 60.`)
  else if (title.length < 10) add("title", "warning", `<title> is only ${title.length} characters — too short to describe the page.`)
  else add("title", "ok", `<title> is ${title.length} characters.`)

  const description = getTag(meta, "description")
  if (!description) add("description", "warning", "No meta description. Google will pick a snippet from the page text.")
  else if (description.length > 160) add("description", "warning", `Meta description is ${description.length} characters — Google usually shows about 155–160.`)
  else if (description.length < 50) add("description", "warning", `Meta description is only ${description.length} characters — aim for 50–160.`)
  else add("description", "ok", `Meta description is ${description.length} characters.`)

  for (const key of ["og:title", "og:description", "og:url", "og:type"]) {
    if (getTag(meta, key)) add(key, "ok", `${key} is set.`)
    else add(key, key === "og:title" ? "error" : "warning", `${key} is missing.`)
  }

  const ogImage = getTag(meta, "og:image", "og:image:url", "og:image:secure_url")
  if (!ogImage) {
    add("og:image", "error", "og:image is missing — shared links will show no picture on most platforms.")
  } else {
    const raw =
      meta.tags.find((t) => t.value === ogImage && t.key.startsWith("og:image"))?.raw ?? ogImage
    if (!/^https?:\/\//i.test(raw)) add("og:image:absolute", "error", `og:image is a relative URL ("${raw}"). Facebook, LinkedIn and others require an absolute https:// URL.`)
    else if (raw.startsWith("http://")) add("og:image:https", "warning", "og:image uses http:// — some apps won't load insecure images.")
    else add("og:image", "ok", "og:image is an absolute https:// URL.")

    if (image === null) {
      add("og:image:load", "error", "og:image couldn't be loaded — it may be missing, private or blocking hotlinks.")
    } else if (image) {
      const { width, height } = image
      const ratio = width / height
      if (width < 200 || height < 200) add("og:image:size", "error", `og:image is ${width}×${height}. Facebook ignores images under 200×200.`)
      else if (width < 1200 || height < 630) add("og:image:size", "warning", `og:image is ${width}×${height}. 1200×630 or larger looks sharp everywhere.`)
      else add("og:image:size", "ok", `og:image is ${width}×${height}.`)
      if (width >= 200 && height >= 200 && (ratio < 1.6 || ratio > 2.2)) {
        add("og:image:ratio", "warning", `og:image aspect ratio is ${ratio.toFixed(2)}:1 — large cards crop to about 1.91:1.`)
      }
    }
  }

  const card = getTag(meta, "twitter:card")
  if (!card) add("twitter:card", "warning", "twitter:card is missing — X shows a small summary card instead of a large image.")
  else if (!TWITTER_CARDS.includes(card)) add("twitter:card", "error", `twitter:card "${card}" isn't a valid card type.`)
  else add("twitter:card", "ok", `twitter:card is "${card}".`)

  if (!getTag(meta, "og:site_name")) add("og:site_name", "warning", "og:site_name is missing — Facebook, Slack and Discord show the domain instead.")

  if (meta.canonical) add("canonical", "ok", "Canonical URL is set.")
  else add("canonical", "warning", "No <link rel=\"canonical\">.")

  if (meta.icons.length === 0) add("icon", "warning", "No <link rel=\"icon\"> — apps will try /favicon.ico.")

  const robots = getTag(meta, "robots")
  if (robots && /noindex/i.test(robots)) add("robots", "warning", `robots is "${robots}" — search engines won't index this page.`)

  const order: Record<Severity, number> = { error: 0, warning: 1, ok: 2 }
  return checks.sort((a, b) => order[a.severity] - order[b.severity])
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")
}

/** A complete tag set, filled from the page's current values with placeholders for gaps. */
export function suggestTags(meta: PageMeta, image?: ImageSize | null): string {
  const p = resolvePreview(meta, "facebook")
  const title = p.title ?? "Page title"
  const description = p.description ?? "A one or two sentence summary of the page."
  const url = meta.canonical ?? getTag(meta, "og:url") ?? meta.url
  const imageUrl = p.image ?? "https://example.com/og-image.png"
  const width = getTag(meta, "og:image:width") ?? (image ? String(image.width) : "1200")
  const height = getTag(meta, "og:image:height") ?? (image ? String(image.height) : "630")
  const m = (attr: string, key: string, value: string) =>
    `<meta ${attr}="${key}" content="${escapeAttr(value)}" />`

  return [
    `<title>${escapeAttr(meta.title ?? title)}</title>`,
    m("name", "description", getTag(meta, "description") ?? description),
    `<link rel="canonical" href="${escapeAttr(url)}" />`,
    "",
    "<!-- Open Graph (Facebook, LinkedIn, WhatsApp, Slack, Discord, iMessage) -->",
    m("property", "og:type", getTag(meta, "og:type") ?? "website"),
    m("property", "og:url", url),
    m("property", "og:title", title),
    m("property", "og:description", description),
    m("property", "og:image", imageUrl),
    m("property", "og:image:width", width),
    m("property", "og:image:height", height),
    m("property", "og:site_name", p.siteName),
    "",
    "<!-- X / Twitter -->",
    m("name", "twitter:card", getTag(meta, "twitter:card") ?? "summary_large_image"),
    m("name", "twitter:title", getTag(meta, "twitter:title") ?? title),
    m("name", "twitter:description", getTag(meta, "twitter:description") ?? description),
    m("name", "twitter:image", getTag(meta, "twitter:image") ?? imageUrl),
  ].join("\n")
}

/** Accept "example.com/page" as well as full URLs. Returns undefined when unusable. */
export function normalizeInputUrl(input: string): string | undefined {
  const trimmed = input.trim()
  if (!trimmed) return undefined
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withScheme)
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined
    if (!url.hostname.includes(".") && url.hostname !== "localhost") return undefined
    return url.href
  } catch {
    return undefined
  }
}
