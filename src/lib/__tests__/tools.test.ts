import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { imageTools, pdfTools, tools, utilityTools } from "../tools"

const appSource = readFileSync(
  fileURLToPath(new URL("../../App.tsx", import.meta.url)),
  "utf-8",
)

describe("tool registry", () => {
  it("has unique ids", () => {
    const ids = tools.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("has unique paths", () => {
    const paths = tools.map((t) => t.path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it("path prefix matches category", () => {
    const prefix = { image: "/image/", pdf: "/pdf/", utility: "/util/" } as const
    for (const t of tools) {
      expect(t.path.startsWith(prefix[t.category])).toBe(true)
    }
  })

  it("categories partition the registry", () => {
    expect(imageTools.length + pdfTools.length + utilityTools.length).toBe(tools.length)
  })

  it("every tool has a name and a description", () => {
    for (const t of tools) {
      expect(t.name.length).toBeGreaterThan(0)
      expect(t.description.length).toBeGreaterThan(10)
    }
  })

  it("every available tool has a route wired in App.tsx", () => {
    for (const t of tools.filter((t) => t.available)) {
      expect(appSource, `route missing for ${t.id} (${t.path})`).toContain(`"${t.path}"`)
    }
  })

  it("every route in App.tsx has a registry entry", () => {
    const routePaths = [...appSource.matchAll(/\["(\/(?:image|pdf|util)\/[^"]+)"/g)].map(
      (m) => m[1],
    )
    expect(routePaths.length).toBeGreaterThan(0)
    for (const path of routePaths) {
      expect(
        tools.some((t) => t.path === path),
        `registry entry missing for route ${path}`,
      ).toBe(true)
    }
  })
})
