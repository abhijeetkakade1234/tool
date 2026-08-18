import type { LucideIcon } from "lucide-react"
import {
  Crop,
  FileDown,
  FileImage,
  FileOutput,
  Images,
  Info,
  Layers,
  MapPinOff,
  Minimize2,
  RotateCw,
  Scaling,
  Scissors,
  Smartphone,
  Trash2,
  ArrowRightLeft,
  FileCode2,
  Hash,
  ListOrdered,
  QrCode,
} from "lucide-react"

export type ToolCategory = "image" | "pdf" | "utility"

export interface ToolDef {
  id: string
  path: string
  name: string
  description: string
  category: ToolCategory
  icon: LucideIcon
  available: boolean
}

export const tools: ToolDef[] = [
  // Image tools
  {
    id: "image-convert",
    path: "/image/convert",
    name: "Convert Image",
    description: "JPG, PNG and WebP in any direction. Batch supported.",
    category: "image",
    icon: ArrowRightLeft,
    available: true,
  },
  {
    id: "image-compress",
    path: "/image/compress",
    name: "Compress Image",
    description: "Shrink file size with quality and dimension controls.",
    category: "image",
    icon: Minimize2,
    available: true,
  },
  {
    id: "image-resize",
    path: "/image/resize",
    name: "Resize Image",
    description: "Resize by width, height or percentage.",
    category: "image",
    icon: Scaling,
    available: true,
  },
  {
    id: "image-rotate",
    path: "/image/rotate",
    name: "Rotate / Flip Image",
    description: "Rotate 90°/180° or flip horizontally and vertically.",
    category: "image",
    icon: RotateCw,
    available: true,
  },
  {
    id: "image-crop",
    path: "/image/crop",
    name: "Crop Image",
    description: "Crop freely or to a fixed aspect ratio.",
    category: "image",
    icon: Crop,
    available: true,
  },
  {
    id: "image-info",
    path: "/image/info",
    name: "Image Info",
    description: "Dimensions, format, size and metadata at a glance.",
    category: "image",
    icon: Info,
    available: true,
  },
  {
    id: "image-heic",
    path: "/image/heic",
    name: "HEIC → JPG / PNG",
    description: "Convert iPhone HEIC photos to formats that work everywhere.",
    category: "image",
    icon: Smartphone,
    available: true,
  },
  {
    id: "image-exif",
    path: "/image/exif",
    name: "EXIF Viewer / Remover",
    description: "See camera, date and GPS metadata — export clean copies.",
    category: "image",
    icon: MapPinOff,
    available: true,
  },
  // PDF tools
  {
    id: "pdf-merge",
    path: "/pdf/merge",
    name: "Merge PDF",
    description: "Combine multiple PDFs into one, in the order you choose.",
    category: "pdf",
    icon: Layers,
    available: true,
  },
  {
    id: "pdf-compress",
    path: "/pdf/compress",
    name: "Compress PDF",
    description: "Shrink file size by re-rendering pages. Best for scans.",
    category: "pdf",
    icon: FileDown,
    available: true,
  },
  {
    id: "pdf-split",
    path: "/pdf/split",
    name: "Split / Extract Pages",
    description: "Pull out pages or ranges into new PDFs.",
    category: "pdf",
    icon: Scissors,
    available: true,
  },
  {
    id: "pdf-delete",
    path: "/pdf/delete",
    name: "Delete Pages",
    description: "Remove pages you don't need.",
    category: "pdf",
    icon: Trash2,
    available: true,
  },
  {
    id: "pdf-reorder",
    path: "/pdf/reorder",
    name: "Reorder Pages",
    description: "Rearrange pages before exporting.",
    category: "pdf",
    icon: ListOrdered,
    available: true,
  },
  {
    id: "pdf-rotate",
    path: "/pdf/rotate",
    name: "Rotate Pages",
    description: "Rotate selected pages or the whole document.",
    category: "pdf",
    icon: RotateCw,
    available: true,
  },
  {
    id: "pdf-to-images",
    path: "/pdf/to-images",
    name: "PDF → Images",
    description: "Render pages to JPG or PNG, single or ZIP.",
    category: "pdf",
    icon: FileImage,
    available: true,
  },
  {
    id: "images-to-pdf",
    path: "/pdf/from-images",
    name: "Images → PDF",
    description: "Turn JPG, PNG or WebP images into a PDF.",
    category: "pdf",
    icon: Images,
    available: true,
  },
  {
    id: "pdf-metadata",
    path: "/pdf/metadata",
    name: "PDF Info",
    description: "Title, author, page count and more.",
    category: "pdf",
    icon: FileOutput,
    available: true,
  },
  // Utilities
  {
    id: "svg-to-png",
    path: "/util/svg-to-png",
    name: "SVG → PNG",
    description: "Rasterize SVG files to PNG at any width.",
    category: "utility",
    icon: FileCode2,
    available: true,
  },
  {
    id: "qr-code",
    path: "/util/qr",
    name: "QR Code",
    description: "Generate QR codes or decode them from images.",
    category: "utility",
    icon: QrCode,
    available: true,
  },
  {
    id: "file-hash",
    path: "/util/hash",
    name: "File Hash",
    description: "SHA-256, SHA-1 and SHA-512 checksums for any file.",
    category: "utility",
    icon: Hash,
    available: true,
  },
]

export const imageTools = tools.filter((t) => t.category === "image")
export const pdfTools = tools.filter((t) => t.category === "pdf")
export const utilityTools = tools.filter((t) => t.category === "utility")
