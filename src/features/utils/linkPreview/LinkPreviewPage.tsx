import { useEffect, useMemo, useState } from "react"
import type { FormEvent } from "react"
import { toast } from "sonner"
import { CircleCheck, CircleX, Copy, ExternalLink, LoaderCircle, TriangleAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToolPage } from "@/components/ToolPage"
import {
  auditMeta,
  normalizeInputUrl,
  parseHtmlMeta,
  resolvePreview,
  suggestTags,
  type ImageSize,
  type PageMeta,
  type Severity,
} from "@/lib/linkPreview"
import type { FetchPageResult } from "@/lib/server/fetchPage"
import { Favicon, PlatformPreviews } from "./PlatformPreviews"

interface Result {
  meta: PageMeta
  /** HTTP status; absent for pasted HTML. */
  status?: number
  redirects: string[]
  truncated: boolean
}

async function fetchPage(url: string): Promise<FetchPageResult> {
  const res = await fetch(`/api/fetch-page?url=${encodeURIComponent(url)}`)
  const body: unknown = await res.json().catch(() => null)
  if (body && typeof body === "object") {
    if (res.ok && "html" in body) return body as FetchPageResult
    if ("error" in body && typeof body.error === "string") throw new Error(body.error)
  }
  // No JSON at all: the function isn't deployed here (static host or plain file server).
  throw new Error(
    "The page fetcher isn't available on this deployment. Use “Paste HTML” instead.",
  )
}

/** Natural size of a remote image: undefined while loading, null if it fails. */
function useImageSize(src?: string): ImageSize | null | undefined {
  const [state, setState] = useState<{ src: string; size: ImageSize | null }>()
  useEffect(() => {
    if (!src) return
    let cancelled = false
    const img = new Image()
    img.referrerPolicy = "no-referrer"
    img.onload = () => {
      if (!cancelled) setState({ src, size: { width: img.naturalWidth, height: img.naturalHeight } })
    }
    img.onerror = () => {
      if (!cancelled) setState({ src, size: null })
    }
    img.src = src
    return () => {
      cancelled = true
    }
  }, [src])
  return src && state?.src === src ? state.size : undefined
}

async function copy(text: string) {
  await navigator.clipboard.writeText(text)
  toast.success("Copied to clipboard")
}

const SEVERITY_ICON: Record<Severity, typeof CircleCheck> = {
  error: CircleX,
  warning: TriangleAlert,
  ok: CircleCheck,
}

const SEVERITY_CLASS: Record<Severity, string> = {
  error: "text-destructive",
  warning: "text-amber-500",
  ok: "text-emerald-500",
}

function Report({ result }: { result: Result }) {
  const { meta } = result
  const imageUrl = resolvePreview(meta, "facebook").image
  const imageSize = useImageSize(imageUrl)
  const checks = useMemo(() => auditMeta(meta, imageSize), [meta, imageSize])
  const snippet = useMemo(() => suggestTags(meta, imageSize), [meta, imageSize])
  const errors = checks.filter((c) => c.severity === "error").length
  const warnings = checks.filter((c) => c.severity === "warning").length
  const google = resolvePreview(meta, "google")

  const rows: [string, string][] = [
    ["<title>", meta.title ?? ""],
    ["canonical", meta.canonical ?? ""],
    ["icon", meta.icons[0] ?? ""],
    ["lang", meta.lang ?? ""],
    ...meta.tags.map((t): [string, string] => [t.key, t.raw]),
  ].filter(([, value]) => value) as [string, string][]

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex items-start gap-3">
          <Favicon src={google.favicon} className="mt-0.5 size-6 shrink-0" />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-medium break-words">{meta.title ?? "Untitled page"}</p>
            <a
              href={meta.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <span className="truncate">{meta.url}</span>
              <ExternalLink className="size-3.5 shrink-0" aria-hidden />
            </a>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {result.status !== undefined && (
                <Badge variant={result.status < 400 ? "secondary" : "destructive"}>
                  HTTP {result.status}
                </Badge>
              )}
              {result.redirects.length > 0 && (
                <Badge variant="outline">
                  {result.redirects.length} redirect{result.redirects.length > 1 ? "s" : ""}
                </Badge>
              )}
              {result.truncated && <Badge variant="outline">Page over 2 MB — read the start only</Badge>}
              <Badge variant={errors ? "destructive" : "secondary"}>
                {errors} error{errors === 1 ? "" : "s"}
              </Badge>
              <Badge variant="outline">
                {warnings} warning{warnings === 1 ? "" : "s"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Previews</h2>
        <PlatformPreviews meta={meta} imageSize={imageSize} />
        <p className="text-xs text-muted-foreground">
          Approximations of each app's current card layout. Platforms cache previews — after
          changing your tags, use their debuggers (Facebook Sharing Debugger, LinkedIn Post
          Inspector) to refresh.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3">
            <h2 className="font-semibold">Checks</h2>
            <ul className="space-y-2">
              {checks.map((c) => {
                const Icon = SEVERITY_ICON[c.severity]
                return (
                  <li key={c.id + c.message} className="flex gap-2 text-sm">
                    <Icon className={`mt-0.5 size-4 shrink-0 ${SEVERITY_CLASS[c.severity]}`} aria-label={c.severity} />
                    <span className="break-words">{c.message}</span>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3">
            <h2 className="font-semibold">Tags found</h2>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No meta tags found.</p>
            ) : (
              <div className="max-h-[480px] overflow-auto rounded-md border">
                <table className="w-full text-left text-xs">
                  <tbody>
                    {rows.map(([key, value], i) => (
                      <tr key={i} className="border-b last:border-0 align-top">
                        <th className="whitespace-nowrap bg-muted/50 px-2 py-1.5 font-mono font-medium">
                          {key}
                        </th>
                        <td className="px-2 py-1.5 break-all">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold">Recommended tags</h2>
              <p className="text-sm text-muted-foreground">
                Filled from this page; replace any placeholders, then paste into your &lt;head&gt;.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => copy(snippet)}>
              <Copy className="size-4" aria-hidden /> Copy
            </Button>
          </div>
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
            <code>{snippet}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LinkPreviewPage() {
  const [mode, setMode] = useState("url")
  const [urlInput, setUrlInput] = useState("")
  const [html, setHtml] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  async function previewUrl(e: FormEvent) {
    e.preventDefault()
    const url = normalizeInputUrl(urlInput)
    if (!url) {
      toast.error("Enter a website address, like example.com/blog/post.")
      return
    }
    setBusy(true)
    try {
      const page = await fetchPage(url)
      setResult({
        meta: parseHtmlMeta(page.html, page.url),
        status: page.status,
        redirects: page.redirects,
        truncated: page.truncated,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't fetch that page.")
    } finally {
      setBusy(false)
    }
  }

  function previewHtml(e: FormEvent) {
    e.preventDefault()
    if (!html.trim()) {
      toast.error("Paste the page's HTML first.")
      return
    }
    const url = normalizeInputUrl(baseUrl) ?? "https://example.com/"
    setResult({ meta: parseHtmlMeta(html, url), redirects: [], truncated: false })
  }

  return (
    <ToolPage
      title="Link Preview"
      description="Check a page's title, description and Open Graph tags, and see how its link looks on Google, X, Facebook, LinkedIn, WhatsApp, Slack, Discord and iMessage."
    >
      <Tabs value={mode} onValueChange={setMode}>
        <TabsList>
          <TabsTrigger value="url">Fetch URL</TabsTrigger>
          <TabsTrigger value="html">Paste HTML</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent>
          {mode === "url" ? (
            <form onSubmit={previewUrl} className="space-y-3">
              <Label htmlFor="lp-url">Page URL</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="lp-url"
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="https://example.com/blog/post"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
                <Button type="submit" disabled={busy} className="shrink-0">
                  {busy && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
                  Preview
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Unlike FileForge's file tools, this one uses the network: the URL is sent to
                FileForge's own page fetcher, which downloads the page's HTML so its tags can be
                read. Nothing is stored. Pages behind a login or bot protection may not load — paste
                their HTML instead.
              </p>
            </form>
          ) : (
            <form onSubmit={previewHtml} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="lp-html">Page HTML</Label>
                <textarea
                  id="lp-html"
                  value={html}
                  onChange={(e) => setHtml(e.target.value)}
                  placeholder={'<head>\n  <title>…</title>\n  <meta property="og:image" content="…" />\n</head>'}
                  rows={8}
                  spellCheck={false}
                  className="w-full rounded-md border bg-transparent px-3 py-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lp-base">Page URL (optional — resolves relative links)</Label>
                <Input
                  id="lp-base"
                  type="text"
                  inputMode="url"
                  placeholder="https://example.com/blog/post"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                />
              </div>
              <Button type="submit">Preview</Button>
              <p className="text-xs text-muted-foreground">
                Parsed entirely in your browser. Images referenced by the tags are still loaded
                from their hosts to render the previews.
              </p>
            </form>
          )}
        </CardContent>
      </Card>

      {result && <Report result={result} />}
    </ToolPage>
  )
}
