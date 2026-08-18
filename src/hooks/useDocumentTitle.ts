import { useEffect } from "react"

const BASE_TITLE = "FileForge — Local PDF & Image Tools"

/** Set the document title for the current route; restores the base title on unmount. */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} — FileForge` : BASE_TITLE
    return () => {
      document.title = BASE_TITLE
    }
  }, [title])
}
