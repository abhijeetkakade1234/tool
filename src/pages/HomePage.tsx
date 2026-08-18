import { Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { imageTools, pdfTools, type ToolDef } from "@/lib/tools"

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
  return (
    <div className="space-y-8">
      <section className="space-y-2 pt-2 text-center sm:pt-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Your files, processed in your browser
        </h1>
        <p className="mx-auto max-w-xl text-sm text-muted-foreground sm:text-base">
          Merge, split, convert and compress PDFs and images. Everything runs locally —
          nothing is ever uploaded.
        </p>
      </section>
      <ToolGrid title="Image Tools" items={imageTools} />
      <ToolGrid title="PDF Tools" items={pdfTools} />
    </div>
  )
}
