import { describe, expect, it, vi } from "vitest"
import {
  MAX_HTML_BYTES,
  fetchPage,
  handleFetchPage,
  isPrivateHost,
  validateTargetUrl,
} from "../server/fetchPage"

const html = (body: BodyInit | null, init: ResponseInit = {}) =>
  new Response(body, {
    ...init,
    headers: { "content-type": "text/html; charset=utf-8", ...init.headers },
  })

describe("isPrivateHost", () => {
  it.each([
    "localhost",
    "app.localhost",
    "printer.local",
    "intranet",
    "127.0.0.1",
    "10.1.2.3",
    "172.20.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.100.0.1",
    "0.0.0.0",
    "[::1]",
    "[fd12::1]",
    "[fe80::1]",
    new URL("http://[::ffff:127.0.0.1]/").hostname,
    new URL("http://2130706433/").hostname,
  ])("blocks %s", (host) => {
    expect(isPrivateHost(host)).toBe(true)
  })

  it.each(["example.com", "8.8.8.8", "172.32.0.1", "[2606:4700::1111]"])("allows %s", (host) => {
    expect(isPrivateHost(host)).toBe(false)
  })
})

describe("validateTargetUrl", () => {
  it("rejects bad protocols, credentials and private hosts", () => {
    expect(() => validateTargetUrl("javascript:alert(1)")).toThrow(/http/)
    expect(() => validateTargetUrl("https://user:pw@example.com")).toThrow(/credentials/)
    expect(() => validateTargetUrl("http://localhost:3000")).toThrow(/private/)
    expect(() => validateTargetUrl("nope")).toThrow(/valid URL/)
    expect(validateTargetUrl("http://localhost:3000", true).port).toBe("3000")
  })
})

describe("fetchPage", () => {
  it("follows redirects and reports the final URL", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 301, headers: { location: "/final" } }))
      .mockResolvedValueOnce(html("<title>Done</title>"))
    const page = await fetchPage("https://example.com/start", { fetchImpl })
    expect(page.url).toBe("https://example.com/final")
    expect(page.redirects).toEqual(["https://example.com/start"])
    expect(page.html).toBe("<title>Done</title>")
    expect(page.status).toBe(200)
  })

  it("re-validates every redirect hop", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(null, { status: 302, headers: { location: "http://169.254.169.254/" } }),
      )
    await expect(fetchPage("https://example.com/", { fetchImpl })).rejects.toThrow(/private/)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it("gives up on redirect loops", async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      async () => new Response(null, { status: 302, headers: { location: "/loop" } }),
    )
    await expect(fetchPage("https://example.com/", { fetchImpl })).rejects.toThrow(/redirects/)
  })

  it("refuses non-HTML responses", async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      async () => new Response("{}", { headers: { "content-type": "application/json" } }),
    )
    await expect(fetchPage("https://example.com/", { fetchImpl })).rejects.toThrow(
      /application\/json/,
    )
  })

  it("keeps error pages so their tags can still be inspected", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => html("<title>Not found</title>", { status: 404 }))
    const page = await fetchPage("https://example.com/", { fetchImpl })
    expect(page.status).toBe(404)
  })

  it("decodes the declared charset", async () => {
    const bytes = new Uint8Array([0x63, 0x61, 0x66, 0xe9])
    const fetchImpl = vi.fn<typeof fetch>(
      async () => new Response(bytes, { headers: { "content-type": "text/html; charset=windows-1252" } }),
    )
    expect((await fetchPage("https://example.com/", { fetchImpl })).html).toBe("café")
  })

  it("caps the body size", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => html(new Uint8Array(MAX_HTML_BYTES + 100).fill(0x61)))
    const page = await fetchPage("https://example.com/", { fetchImpl })
    expect(page.html.length).toBe(MAX_HTML_BYTES)
    expect(page.truncated).toBe(true)
  })

  it("maps network failures to a readable error", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw new TypeError("fetch failed")
    })
    await expect(fetchPage("https://example.com/", { fetchImpl })).rejects.toThrow(/connect/)
  })
})

describe("handleFetchPage", () => {
  it("returns JSON errors with matching status codes", async () => {
    const missing = await handleFetchPage(new Request("https://ff.dev/api/fetch-page"))
    expect(missing.status).toBe(400)
    expect(await missing.json()).toEqual({ error: "Missing ?url= parameter." })

    const blocked = await handleFetchPage(
      new Request("https://ff.dev/api/fetch-page?url=http%3A%2F%2F127.0.0.1%2F"),
    )
    expect(blocked.status).toBe(403)
    expect(blocked.headers.get("content-type")).toMatch(/application\/json/)
    expect(blocked.headers.get("access-control-allow-origin")).toBeNull()

    const post = await handleFetchPage(new Request("https://ff.dev/api/fetch-page", { method: "POST" }))
    expect(post.status).toBe(405)
  })
})
