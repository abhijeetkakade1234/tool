// Cloudflare Pages Function: GET /api/fetch-page?url=…
// The logic lives in src/lib/server/fetchPage.ts so `vite dev` can serve the same handler.
import { handleFetchPage } from "../../src/lib/server/fetchPage"

export const onRequestGet = ({ request }: { request: Request }) => handleFetchPage(request)
