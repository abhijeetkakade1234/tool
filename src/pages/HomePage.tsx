import { useState } from "react"
import { Link } from "react-router-dom"
import { Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { imageTools, pdfTools, utilityTools, type ToolDef } from "@/lib/tools"

function ToolCard({ tool }: { tool: ToolDef }) {
  const Icon = tool.icon
  const body = (
    <Card
      className={
        tool.available
          ? "h-full transition-colors hover:border-primary/40 hover:bg-accent/40"
          : "h-full opacity-55"
      }
    >
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          <CardTitle className="text-base">{tool.name}</CardTitle>
          {!tool.available && (
            <Badge variant="outline" className="ml-auto shrink-0 text-xs">
              Soon
            </Badge>
          )}
        </div>
        <CardDescription>{tool.description}</CardDescription>
      </CardHeader>
    </Card>
  )
  if (!tool.available) return body
  return (
    <Link to={tool.path} className="rounded-xl focus-visible:outline-2 focus-visible:outline-ring">
      {body}
    </Link>
  )
}

function ToolGrid({ title, items }: { title: string; items: ToolDef[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((t) => (
          <ToolCard key={t.id} tool={t} />
        ))}
      </div>
    </section>
  )
}

export function HomePage() {
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()
  const match = (t: ToolDef) =>
    !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
  const images = imageTools.filter(match)
  const pdfs = pdfTools.filter(match)
  const utils = utilityTools.filter(match)

  return (
    <div className="space-y-8">
      <section className="space-y-4 pt-2 text-center sm:pt-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Your files, processed in your browser
        </h1>
        <p className="mx-auto max-w-xl text-sm text-muted-foreground sm:text-base">
          Merge, split, convert and compress PDFs and images. Everything runs locally —
          nothing is ever uploaded.
        </p>
        <div className="relative mx-auto max-w-sm">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Search tools…"
            aria-label="Search tools"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </section>
      {images.length > 0 && <ToolGrid title="Image Tools" items={images} />}
      {pdfs.length > 0 && <ToolGrid title="PDF Tools" items={pdfs} />}
      {utils.length > 0 && <ToolGrid title="Utilities" items={utils} />}
      {images.length === 0 && pdfs.length === 0 && utils.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No tools match "{query}".
        </p>
      )}
    </div>
  )
}
