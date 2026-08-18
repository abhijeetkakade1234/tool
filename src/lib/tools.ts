import type { LucideIcon } from "lucide-react"
import {
  Crop,
  FileImage,
  FileOutput,
  Images,
  Info,
  Layers,
  Minimize2,
  RotateCw,
  Scaling,
  Scissors,
  Trash2,
  ArrowRightLeft,
  ListOrdered,
} from "lucide-react"

export type ToolCategory = "image" | "pdf"

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
    available: false,
  },
  {
    id: "image-info",
    path: "/image/info",
    name: "Image Info",
    description: "Dimensions, format, size and metadata at a glance.",
    category: "image",
    icon: Info,
    available: false,
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
    available: false,
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
]

export const imageTools = tools.filter((t) => t.category === "image")
export const pdfTools = tools.filter((t) => t.category === "pdf")
