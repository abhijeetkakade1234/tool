import { Suspense, lazy } from "react"
import { Route, Routes } from "react-router-dom"
import { AppLayout } from "@/components/layout/AppLayout"
import { HomePage } from "@/pages/HomePage"
import { NotFoundPage } from "@/pages/NotFoundPage"

const ImageConvertPage = lazy(() => import("@/features/images/convert/ImageConvertPage"))
const ImageCompressPage = lazy(() => import("@/features/images/compress/ImageCompressPage"))
const ImageResizePage = lazy(() => import("@/features/images/resize/ImageResizePage"))
const ImageRotatePage = lazy(() => import("@/features/images/rotate/ImageRotatePage"))

function Loading() {
  return <p className="py-20 text-center text-sm text-muted-foreground">Loading…</p>
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route
          path="/image/convert"
          element={
            <Suspense fallback={<Loading />}>
              <ImageConvertPage />
            </Suspense>
          }
        />
        <Route
          path="/image/compress"
          element={
            <Suspense fallback={<Loading />}>
              <ImageCompressPage />
            </Suspense>
          }
        />
        <Route
          path="/image/resize"
          element={
            <Suspense fallback={<Loading />}>
              <ImageResizePage />
            </Suspense>
          }
        />
        <Route
          path="/image/rotate"
          element={
            <Suspense fallback={<Loading />}>
              <ImageRotatePage />
            </Suspense>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
