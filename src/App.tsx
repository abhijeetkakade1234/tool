import { Suspense, lazy } from "react"
import type { ComponentType, LazyExoticComponent } from "react"
import { Route, Routes } from "react-router-dom"
import { AppLayout } from "@/components/layout/AppLayout"
import { HomePage } from "@/pages/HomePage"
import { NotFoundPage } from "@/pages/NotFoundPage"

const toolRoutes: [string, LazyExoticComponent<ComponentType>][] = [
  ["/image/convert", lazy(() => import("@/features/images/convert/ImageConvertPage"))],
  ["/image/compress", lazy(() => import("@/features/images/compress/ImageCompressPage"))],
  ["/image/resize", lazy(() => import("@/features/images/resize/ImageResizePage"))],
  ["/image/rotate", lazy(() => import("@/features/images/rotate/ImageRotatePage"))],
  ["/image/crop", lazy(() => import("@/features/images/crop/ImageCropPage"))],
  ["/image/info", lazy(() => import("@/features/images/info/ImageInfoPage"))],
  ["/image/exif", lazy(() => import("@/features/images/exif/ExifPage"))],
  ["/pdf/merge", lazy(() => import("@/features/pdf/merge/PdfMergePage"))],
  ["/pdf/compress", lazy(() => import("@/features/pdf/compress/PdfCompressPage"))],
  ["/pdf/split", lazy(() => import("@/features/pdf/split/PdfSplitPage"))],
  ["/pdf/delete", lazy(() => import("@/features/pdf/delete/PdfDeletePage"))],
  ["/pdf/reorder", lazy(() => import("@/features/pdf/reorder/PdfReorderPage"))],
  ["/pdf/rotate", lazy(() => import("@/features/pdf/rotate/PdfRotatePage"))],
  ["/pdf/from-images", lazy(() => import("@/features/pdf/fromImages/ImagesToPdfPage"))],
  ["/pdf/to-images", lazy(() => import("@/features/pdf/toImages/PdfToImagesPage"))],
  ["/pdf/metadata", lazy(() => import("@/features/pdf/metadata/PdfMetadataPage"))],
]

function Loading() {
  return <p className="py-20 text-center text-sm text-muted-foreground">Loading…</p>
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        {toolRoutes.map(([path, Page]) => (
          <Route
            key={path}
            path={path}
            element={
              <Suspense fallback={<Loading />}>
                <Page />
              </Suspense>
            }
          />
        ))}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
