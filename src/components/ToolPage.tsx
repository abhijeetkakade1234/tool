import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"

interface ToolPageProps {
  title: string
  description: string
  children: ReactNode
}

export function ToolPage({ title, description, children }: ToolPageProps) {
  useDocumentTitle(title)
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          to="/"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All tools
        </Link>
        <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}
