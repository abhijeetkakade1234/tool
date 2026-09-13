/**
 * Server-side page fetcher behind the Link Preview tool.
 *
 * Browsers can't read another site's HTML (CORS), so this runs as a Cloudflare
 * Pages Function in production (functions/api/fetch-page.ts) and as Vite
 * middleware in development. Only a URL ever reaches it — never a user's file.
 *
 * It deliberately returns JSON rather than the raw page, so it can't be used to
 * serve arbitrary HTML from FileForge's origin, and it sends no CORS headers,
 * so other websites can't call it from a browser.
 */

export interface FetchPageResult {
  /** Final URL after redirects. */
  url: string
  status: number
  contentType: string
  html: string
  /** URLs that redirected, in order. */
  redirects: string[]
  /** True when the body was cut off at MAX_HTML_BYTES. */
  truncated: boolean
}

export interface FetchPageOptions {
  /** Allow localhost / LAN targets. Only the local dev server turns this on. */
  allowPrivate?: boolean
  fetchImpl?: typeof fetch
}

export const MAX_HTML_BYTES = 2 * 1024 * 1024
const MAX_REDIRECTS = 5
const TIMEOUT_MS = 10_000
// Many sites only serve full Open Graph markup to known link-preview crawlers.
const USER_AGENT =
  "Mozilla/5.0 (compatible; FileForge-LinkPreview/1.0) facebookexternalhit/1.1"

export class PageFetchError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** Loopback, link-local, private-range and local-only hostnames. */
export function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "")
  if (h.includes(":")) {
    return (
      h === "::" ||
      h === "::1" ||
      h.startsWith("::ffff:") || // IPv4-mapped: could point anywhere, including 127.0.0.1
      /^f[cd]/.test(h) || // fc00::/7 unique local
      /^fe[89ab]/.test(h) // fe80::/10 link-local
    )
  }
  const v4 = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (v4) {
    const a = Number(v4[1])
    const b = Number(v4[2])
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    )
  }
  return (
    !h.includes(".") ||
    h.endsWith(".localhost") ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    h.endsWith(".lan") ||
    h.endsWith(".home.arpa")
  )
}

export function validateTargetUrl(input: string, allowPrivate = false): URL {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw new PageFetchError(400, "That doesn't look like a valid URL.")
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new PageFetchError(400, "Only http:// and https:// URLs can be previewed.")
  }
  if (url.username || url.password) {
    throw new PageFetchError(400, "URLs with embedded credentials aren't supported.")
  }
  if (!allowPrivate && isPrivateHost(url.hostname)) {
    throw new PageFetchError(403, "Local and private network addresses can't be fetched.")
  }
  return url
}

async function readCapped(
  res: Response,
  limit: number,
): Promise<{ bytes: Uint8Array; truncated: boolean }> {
  if (!res.body) return { bytes: new Uint8Array(), truncated: false }
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  let done = false
  while (size < limit) {
    const next = await reader.read()
    if (next.done) {
      done = true
      break
    }
    chunks.push(next.value)
    size += next.value.byteLength
  }
  if (!done) await reader.cancel()
  const bytes = new Uint8Array(Math.min(size, limit))
  let offset = 0
  for (const chunk of chunks) {
    const part = chunk.subarray(0, bytes.length - offset)
    bytes.set(part, offset)
    offset += part.byteLength
    if (offset >= bytes.length) break
  }
  return { bytes, truncated: size > limit || (!done && size >= limit) }
}

function detectCharset(bytes: Uint8Array, contentType: string): string {
  const fromHeader = contentType.match(/charset=["']?([\w-]+)/i)
  if (fromHeader) return fromHeader[1]
  // <meta charset> must appear within the first 1024 bytes; ASCII-decode a bit more.
  let head = ""
  for (let i = 0; i < Math.min(bytes.length, 2048); i++) head += String.fromCharCode(bytes[i])
  const fromMeta = head.match(/<meta[^>]+charset\s*=\s*["']?([\w-]+)/i)
  return fromMeta ? fromMeta[1] : "utf-8"
}

function decodeBody(bytes: Uint8Array, contentType: string): string {
  try {
    return new TextDecoder(detectCharset(bytes, contentType)).decode(bytes)
  } catch {
    return new TextDecoder().decode(bytes)
  }
}

export async function fetchPage(
  target: string,
  { allowPrivate = false, fetchImpl = fetch }: FetchPageOptions = {},
): Promise<FetchPageResult> {
  let url = validateTargetUrl(target, allowPrivate)
  const redirects: string[] = []
  const signal = AbortSignal.timeout(TIMEOUT_MS)

  for (;;) {
    let res: Response
    try {
      // Follow redirects by hand so every hop is re-checked against private hosts.
      res = await fetchImpl(url.href, {
        redirect: "manual",
        signal,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
          "Accept-Language": "en-US,en;q=0.9",
        },
      })
    } catch {
      if (signal.aborted) throw new PageFetchError(504, "The site took too long to respond.")
      throw new PageFetchError(502, "Couldn't connect to that site. Check the address and try again.")
    }

    const location = res.headers.get("location")
    if (res.status >= 300 && res.status < 400 && location) {
      await res.body?.cancel()
      if (redirects.length >= MAX_REDIRECTS) {
        throw new PageFetchError(502, `Gave up after ${MAX_REDIRECTS} redirects.`)
      }
      redirects.push(url.href)
      url = validateTargetUrl(new URL(location, url).href, allowPrivate)
      continue
    }

    const contentType = res.headers.get("content-type") ?? ""
    if (contentType && !/html|xml/i.test(contentType)) {
      await res.body?.cancel()
      const type = contentType.split(";")[0].trim()
      throw new PageFetchError(415, `That URL returned ${type}, not an HTML page.`)
    }

    const { bytes, truncated } = await readCapped(res, MAX_HTML_BYTES)
    return {
      url: url.href,
      status: res.status,
      contentType,
      html: decodeBody(bytes, contentType),
      redirects,
      truncated,
    }
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}

/** GET /api/fetch-page?url=… → FetchPageResult JSON, or { error } with an HTTP error status. */
export async function handleFetchPage(
  request: Request,
  options: FetchPageOptions = {},
): Promise<Response> {
  if (request.method !== "GET") return json({ error: "Method not allowed." }, 405)
  const target = new URL(request.url).searchParams.get("url")
  if (!target) return json({ error: "Missing ?url= parameter." }, 400)
  try {
    return json(await fetchPage(target, options), 200)
  } catch (e) {
    if (e instanceof PageFetchError) return json({ error: e.message }, e.status)
    return json({ error: "Something went wrong while fetching that page." }, 500)
  }
}
