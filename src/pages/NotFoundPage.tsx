import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-sm text-muted-foreground">
        This tool doesn't exist (yet).
      </p>
      <Button asChild>
        <Link to="/">Back to all tools</Link>
      </Button>
    </div>
  )
}
