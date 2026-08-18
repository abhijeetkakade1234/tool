import { Link, Outlet } from "react-router-dom"
import { FileBox } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Toaster } from "@/components/ui/sonner"

export function AppLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <FileBox className="size-5" aria-hidden />
            <span>FileForge</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Files never leave your device
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t py-4">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 text-xs text-muted-foreground">
          <span>Local-first. No uploads, no accounts, no limits.</span>
          <a
            href="https://github.com/abhijeetkakade1234/tool"
            target="_blank"
            rel="noreferrer"
            className="underline-offset-4 hover:underline"
          >
            Open source on GitHub
          </a>
        </div>
      </footer>
      <Toaster richColors />
    </div>
  )
}
