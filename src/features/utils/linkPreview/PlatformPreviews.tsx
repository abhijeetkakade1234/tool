import { useState } from "react"
import type { ReactNode } from "react"
import { FileText, Globe, ImageOff } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  resolvePreview,
  type ImageSize,
  type PageMeta,
  type PlatformId,
  type Preview,
} from "@/lib/linkPreview"

// Mockups approximate each platform's current link card. They use the platforms'
// own colours rather than the app theme, so they look the same in light and dark mode.

function RemoteImage({ src, className }: { src: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div className={cn("flex items-center justify-center bg-black/10 text-black/40", className)}>
        <ImageOff className="size-6" aria-hidden />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn("block object-cover", className)}
    />
  )
}

/** Remote image with a placeholder when it fails; resets when src changes. */
function SiteImage({ src, className }: { src: string; className?: string }) {
  return <RemoteImage key={src} src={src} className={className} />
}

function FaviconImage({ src, className }: { src: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return <Globe className={cn("text-[#5f6368]", className)} aria-hidden />
  return (
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn("object-contain", className)}
    />
  )
}

export function Favicon({ src, className }: { src: string; className?: string }) {
  return <FaviconImage key={src} src={src} className={className} />
}

function breadcrumb(url: string): string {
  try {
    const u = new URL(url)
    const parts = u.pathname.split("/").filter(Boolean).map((p) => {
      try {
        return decodeURIComponent(p)
      } catch {
        return p
      }
    })
    return [u.origin, ...parts].join(" › ")
  } catch {
    return url
  }
}

function GooglePreview({ p }: { p: Preview }) {
  return (
    <div className="bg-white p-4 text-[#202124]" style={{ fontFamily: "Arial, sans-serif" }}>
      <div className="flex items-center gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[#dadce0] bg-[#f1f3f4]">
          <Favicon src={p.favicon} className="size-[18px]" />
        </span>
        <div className="min-w-0 leading-snug">
          <div className="truncate text-sm">{p.siteName}</div>
          <div className="truncate text-xs text-[#4d5156]">{breadcrumb(p.url)}</div>
        </div>
      </div>
      <div className="mt-1.5 max-w-[600px] truncate text-xl leading-snug text-[#1a0dab]">
        {p.title ?? p.url}
      </div>
      {p.description ? (
        <p className="mt-0.5 line-clamp-2 max-w-[600px] text-sm leading-relaxed text-[#4d5156]">
          {p.description}
        </p>
      ) : (
        <p className="mt-0.5 text-sm italic text-[#70757a]">
          No description — Google will pick text from the page.
        </p>
      )}
    </div>
  )
}

function XPreview({ p }: { p: Preview }) {
  const largeImage = p.card === "summary_large_image" ? p.image : undefined
  return (
    <div className="bg-white p-3 text-[#0f1419]">
      {largeImage ? (
        <>
          <div className="relative overflow-hidden rounded-2xl border border-[#cfd9de]">
            <SiteImage src={largeImage} className="aspect-[1.91/1] w-full" />
            <span className="absolute bottom-3 left-3 max-w-[85%] truncate rounded bg-black/75 px-1.5 py-0.5 text-[13px] text-white">
              {p.title ?? p.domain}
            </span>
          </div>
          <div className="mt-1 text-[13px] text-[#536471]">From {p.domain}</div>
        </>
      ) : (
        <div className="flex overflow-hidden rounded-2xl border border-[#cfd9de]">
          {p.image ? (
            <SiteImage src={p.image} className="size-[110px] shrink-0 border-r border-[#cfd9de]" />
          ) : (
            <div className="flex size-[110px] shrink-0 items-center justify-center border-r border-[#cfd9de] bg-[#f7f9f9] text-[#536471]">
              <FileText className="size-7" aria-hidden />
            </div>
          )}
          <div className="flex min-w-0 flex-col justify-center gap-0.5 px-3 text-[15px] leading-5">
            <span className="truncate text-[#536471]">{p.domain}</span>
            <span className="truncate">{p.title ?? p.url}</span>
            {p.description && <span className="line-clamp-2 text-[#536471]">{p.description}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

function FacebookPreview({ p, size }: { p: Preview; size?: ImageSize | null }) {
  // Facebook drops to a small square thumbnail for images under 600×315.
  const small = !!p.image && !!size && (size.width < 600 || size.height < 315)
  const text = (
    <div className="min-w-0 flex-1 space-y-0.5 bg-[#f0f2f5] px-3 py-2.5 leading-tight">
      <div className="truncate text-xs uppercase text-[#65676b]">{p.domain}</div>
      <div className="line-clamp-2 text-[17px] font-semibold text-[#050505]">{p.title ?? p.url}</div>
      {p.description && <div className="line-clamp-1 text-[15px] text-[#65676b]">{p.description}</div>}
    </div>
  )
  return (
    <div className="bg-white">
      {p.image && small ? (
        <div className="flex">
          <SiteImage src={p.image} className="size-[120px] shrink-0" />
          {text}
        </div>
      ) : (
        <>
          {p.image && <SiteImage src={p.image} className="aspect-[1.91/1] w-full" />}
          {text}
        </>
      )}
    </div>
  )
}

function LinkedInPreview({ p }: { p: Preview }) {
  return (
    <div className="bg-[#f4f2ee] p-3">
      <div className="flex items-center gap-3 rounded-lg border border-[#e0dfdc] bg-white p-2">
        {p.image && <SiteImage src={p.image} className="h-[72px] w-[128px] shrink-0 rounded" />}
        <div className="min-w-0 px-1">
          <div className="line-clamp-2 text-sm font-semibold text-black/90">{p.title ?? p.url}</div>
          <div className="mt-1 truncate text-xs text-black/60">{p.domain}</div>
        </div>
      </div>
    </div>
  )
}

function WhatsAppPreview({ p, size }: { p: Preview; size?: ImageSize | null }) {
  // Wide images get a banner; small or squarish ones a thumbnail beside the text.
  const large = !!p.image && (!size || (size.width >= 300 && size.width / size.height > 1.2))
  return (
    <div className="bg-[#efeae2] p-3">
      <div className="ml-auto max-w-[340px] rounded-lg bg-[#d9fdd3] p-1 text-[#111b21] shadow-sm">
        <div className={cn("overflow-hidden rounded-md bg-[#d1f4cc]", !large && "flex")}>
          {p.image && (
            <SiteImage
              src={p.image}
              className={large ? "aspect-[1.91/1] w-full" : "size-[84px] shrink-0"}
            />
          )}
          <div className="min-w-0 space-y-0.5 px-2.5 py-2">
            <div className="line-clamp-2 text-sm font-semibold leading-snug">{p.title ?? p.url}</div>
            {p.description && (
              <div className="line-clamp-2 text-xs text-[#667781]">{p.description}</div>
            )}
            <div className="truncate text-xs text-[#667781]">{p.domain}</div>
          </div>
        </div>
        <div className="px-1.5 pb-0.5 pt-1 text-sm">
          <span className="break-all text-[#027eb5] underline">{p.url}</span>
          <span className="float-right ml-2 mt-1.5 text-[11px] text-[#667781]">12:34</span>
        </div>
      </div>
    </div>
  )
}

function SlackPreview({ p }: { p: Preview }) {
  return (
    <div className="flex gap-2 bg-white p-3 text-[15px] text-[#1d1c1d]">
      <div className="size-9 shrink-0 rounded-md bg-[#4a154b]" aria-hidden />
      <div className="min-w-0 flex-1">
        <div>
          <span className="font-bold">You</span>{" "}
          <span className="text-xs text-[#616061]">12:34 PM</span>
        </div>
        <div className="truncate text-[#1264a3]">{p.url}</div>
        <div className="mt-1 border-l-4 border-[#dddddd] pl-3">
          <div className="flex items-center gap-1.5 text-[13px] font-bold">
            <Favicon src={p.favicon} className="size-4 shrink-0" />
            <span className="truncate">{p.siteName}</span>
          </div>
          <div className="font-bold text-[#1264a3]">{p.title ?? p.url}</div>
          {p.description && <div className="line-clamp-3">{p.description}</div>}
          {p.image && (
            <SiteImage src={p.image} className="mt-2 max-h-[200px] w-full max-w-[360px] rounded-lg" />
          )}
        </div>
      </div>
    </div>
  )
}

function DiscordPreview({ p }: { p: Preview }) {
  const large = p.card === "summary_large_image"
  return (
    <div className="bg-[#313338] p-3 text-[#dbdee1]">
      <div className="truncate text-[15px] text-[#00a8fc]">{p.url}</div>
      <div
        className="mt-1 max-w-[432px] rounded border-l-4 bg-[#2b2d31] p-3"
        style={{ borderLeftColor: p.themeColor ?? "#1e1f22" }}
      >
        <div className="flex gap-4">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="truncate text-xs text-[#dbdee1]/80">{p.siteName}</div>
            <div className="font-semibold text-[#00a8fc]">{p.title ?? p.url}</div>
            {p.description && <div className="line-clamp-4 text-sm">{p.description}</div>}
          </div>
          {p.image && !large && <SiteImage src={p.image} className="size-20 shrink-0 rounded" />}
        </div>
        {p.image && large && (
          <SiteImage src={p.image} className="mt-3 aspect-[1.91/1] w-full rounded" />
        )}
      </div>
    </div>
  )
}

function IMessagePreview({ p }: { p: Preview }) {
  return (
    <div className="bg-white p-3">
      <div className="ml-auto max-w-[300px] overflow-hidden rounded-[18px] bg-[#e9e9eb] text-black">
        {p.image && <SiteImage src={p.image} className="aspect-[1.91/1] w-full" />}
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="min-w-0 flex-1 leading-tight">
            <div className="line-clamp-2 text-[13px] font-semibold">{p.title ?? p.domain}</div>
            <div className="truncate text-[13px] text-[#8e8e93]">{p.domain}</div>
          </div>
          {!p.image && <Favicon src={p.favicon} className="size-8 shrink-0 rounded" />}
        </div>
      </div>
    </div>
  )
}

const PLATFORMS: { id: PlatformId; name: string; note: string }[] = [
  { id: "google", name: "Google Search", note: "<title> + meta description" },
  { id: "x", name: "X (Twitter)", note: "twitter:* → og:*" },
  { id: "facebook", name: "Facebook", note: "og:*" },
  { id: "linkedin", name: "LinkedIn", note: "og:*" },
  { id: "whatsapp", name: "WhatsApp", note: "og:*" },
  { id: "slack", name: "Slack", note: "og:* + favicon" },
  { id: "discord", name: "Discord", note: "og:* + theme-color" },
  { id: "imessage", name: "iMessage", note: "og:*" },
]

function Frame({ name, note, children }: { name: string; note: string; children: ReactNode }) {
  return (
    <figure className="min-w-0 space-y-2">
      <figcaption className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{name}</span>
        <code className="truncate text-xs text-muted-foreground">{note}</code>
      </figcaption>
      <div className="overflow-hidden rounded-xl border">{children}</div>
    </figure>
  )
}

export function PlatformPreviews({ meta, imageSize }: { meta: PageMeta; imageSize?: ImageSize | null }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {PLATFORMS.map(({ id, name, note }) => {
        const p = resolvePreview(meta, id)
        return (
          <Frame key={id} name={name} note={note}>
            {id === "google" && <GooglePreview p={p} />}
            {id === "x" && <XPreview p={p} />}
            {id === "facebook" && <FacebookPreview p={p} size={imageSize} />}
            {id === "linkedin" && <LinkedInPreview p={p} />}
            {id === "whatsapp" && <WhatsAppPreview p={p} size={imageSize} />}
            {id === "slack" && <SlackPreview p={p} />}
            {id === "discord" && <DiscordPreview p={p} />}
            {id === "imessage" && <IMessagePreview p={p} />}
          </Frame>
        )
      })}
    </div>
  )
}
