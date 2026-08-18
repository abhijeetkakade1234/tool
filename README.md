# FileForge

A **local-first, open-source browser toolbox** for working with PDFs and
images without uploading files to a server.

No accounts.\
No ads.\
No artificial file limits.\
No watermarks.\
No backend required for the core functionality.

The goal is simple: **open the tool, drop a file, do the thing, get the
file back.**

This project is primarily built for personal use, but it is open source
so anyone can inspect it, run it, modify it, or contribute to it.

------------------------------------------------------------------------

## Why this exists

A lot of basic file operations are unnecessarily annoying.

You want to:

-   merge two PDFs
-   remove a page
-   convert a JPG to PNG
-   compress an image
-   turn images into a PDF
-   extract pages from a PDF
-   convert a PDF into images

And somehow the workflow becomes:

1.  Find a website.
2.  Upload your files.
3.  Wait for the upload.
4.  Deal with ads.
5.  Get hit with a file-size limit.
6.  Maybe create an account.
7.  Download the result.
8.  Discover that the quality changed.
9.  Repeat the process for the next file.

**FileForge** is meant to remove all of that.

The browser already has enough capabilities to handle a huge amount of
this work locally.

So instead of sending a user's files to a server:

> **The user's device does the processing.**

------------------------------------------------------------------------

# Core Principles

## 1. Local-first

Files should be processed inside the browser whenever technically
possible.

The default architecture should be:

``` text
User
  ↓
Browser
  ↓
Local file
  ↓
JavaScript / Web APIs / Web Workers
  ↓
Processed file
  ↓
Download
```

Not:

``` text
User
  ↓
Upload
  ↓
Backend
  ↓
Storage
  ↓
Processing server
  ↓
Download
```

------------------------------------------------------------------------

## 2. No backend for core features

The project should not require a backend for normal PDF and image
utilities.

That means:

-   no file upload API
-   no file storage
-   no processing server
-   no database
-   no authentication
-   no user accounts

The frontend should be capable of doing the actual work.

A backend may only be considered in the future for features that
genuinely cannot be implemented reliably in-browser.

------------------------------------------------------------------------

## 3. No artificial limits

There should be no application-level restrictions such as:

-   "3 files per day"
-   "5 MB maximum"
-   "2 conversions remaining"
-   "Sign up to continue"
-   "Upgrade to process another file"

The real limitation should simply be the user's device and browser.

For example, extremely large PDFs may naturally consume a lot of RAM.
That is a technical limitation, not an artificial product restriction.

------------------------------------------------------------------------

## 4. No ads

This is a utility.

The user should be able to open it and use it without fighting
advertisements.

------------------------------------------------------------------------

## 5. No watermarks

Converted or processed files should not contain branding or watermarks.

------------------------------------------------------------------------

## 6. Privacy by architecture

Privacy should not depend on a privacy policy saying:

> "We promise not to look at your files."

The architecture should make that unnecessary.

If the file never leaves the browser, there is no server-side copy to
inspect.

------------------------------------------------------------------------

# Features

The project is divided into two major areas:

``` text
PDF Tools
Image Tools
```

Additional utilities can be added later.

------------------------------------------------------------------------

# PDF Tools

## Merge PDF

Combine multiple PDF files into a single PDF.

Example:

``` text
document-1.pdf
document-2.pdf
document-3.pdf

        ↓

combined.pdf
```

Requirements:

-   multiple file selection
-   drag-and-drop
-   file ordering
-   reorder before processing
-   remove files from the queue
-   preview basic PDF information
-   generate a new PDF locally

------------------------------------------------------------------------

## Split PDF

Split a PDF into individual pages or selected page ranges.

Example:

``` text
input.pdf
Pages: 1 2 3 4 5 6

Extract:
1-3
5
6
```

Possible output:

``` text
input-pages-1-3.pdf
input-page-5.pdf
input-page-6.pdf
```

For multiple generated files, the application can optionally package
them into a ZIP archive.

------------------------------------------------------------------------

## Extract Pages

Select specific pages from an existing PDF and create a new PDF
containing only those pages.

Example:

``` text
Original:
1 2 3 4 5 6 7 8

Selected:
1 3 6 8

Output:
1 3 6 8
```

------------------------------------------------------------------------

## Delete Pages

Remove selected pages from a PDF.

Example:

``` text
Original:
1 2 3 4 5

Delete:
2 4

Output:
1 3 5
```

------------------------------------------------------------------------

## Reorder Pages

Display the pages and allow the user to rearrange them before exporting.

Example:

``` text
Before:

[1] [2] [3] [4]

After:

[3] [1] [4] [2]
```

Drag-and-drop should be the preferred interaction.

------------------------------------------------------------------------

## Rotate Pages

Rotate individual pages or multiple pages.

Supported operations:

-   rotate clockwise
-   rotate counter-clockwise
-   rotate 180°
-   rotate selected pages
-   rotate all pages

------------------------------------------------------------------------

## PDF → JPG

Render PDF pages into JPG images.

Options should include:

-   page selection
-   image quality
-   output resolution
-   DPI where applicable
-   single-page download
-   batch export

For multiple images, provide ZIP export.

------------------------------------------------------------------------

## PDF → PNG

Render PDF pages into PNG images.

PNG should be useful when lossless output is preferred.

Options:

-   page selection
-   resolution
-   transparent/background handling where technically applicable

------------------------------------------------------------------------

## JPG → PDF

Convert one or multiple JPG files into a PDF.

Example:

``` text
photo1.jpg
photo2.jpg
photo3.jpg

        ↓

photos.pdf
```

The user should be able to:

-   reorder images
-   choose page orientation
-   fit/crop images
-   control page size
-   set margins

------------------------------------------------------------------------

## PNG → PDF

Same concept as JPG → PDF, while preserving PNG image data as
appropriately as possible.

------------------------------------------------------------------------

## Image → PDF

A general image-to-PDF tool supporting common image formats.

Possible supported formats:

-   JPG/JPEG
-   PNG
-   WebP
-   BMP
-   other browser-decodable formats where supported

------------------------------------------------------------------------

## PDF Metadata

View basic metadata where available.

Potential fields:

-   title
-   author
-   subject
-   creator
-   producer
-   creation date
-   modification date
-   page count
-   file size

Editing metadata can be added later if library support is reliable.

------------------------------------------------------------------------

# Image Tools

## JPG → PNG

Convert JPG/JPEG images into PNG locally.

No upload.

No server.

No quality reduction caused by an intermediate upload pipeline.

Important note:

Converting a JPEG to PNG **cannot restore JPEG information that was
already lost during JPEG compression**.

PNG simply provides a lossless container for the already-decoded image.

------------------------------------------------------------------------

## PNG → JPG

Convert PNG images to JPG.

Options:

-   JPEG quality
-   background color for transparent images
-   output dimensions
-   metadata handling

Because JPG does not support transparency, transparent PNG areas need an
explicit background.

------------------------------------------------------------------------

## JPG → WebP

Convert JPEG images to WebP.

Allow users to control:

-   quality
-   dimensions
-   lossless/lossy mode where supported

------------------------------------------------------------------------

## PNG → WebP

Convert PNG images to WebP.

Useful for reducing file size while maintaining transparency.

------------------------------------------------------------------------

## WebP → JPG

Convert WebP images to JPG.

Transparent WebP images should provide a background option.

------------------------------------------------------------------------

## WebP → PNG

Convert WebP images to PNG.

Useful when compatibility or lossless output is preferred.

------------------------------------------------------------------------

## Image Compression

Compress images without requiring an upload.

Users should be able to control:

-   output format
-   quality
-   maximum width
-   maximum height
-   target file size where technically achievable
-   metadata removal

The UI should show:

``` text
Original
2.8 MB

Compressed
740 KB

Saved
73.6%
```

Compression should never silently destroy the original file.

The original file remains untouched.

------------------------------------------------------------------------

## Image Resize

Resize images by:

-   width
-   height
-   percentage
-   maximum dimensions

Maintain aspect ratio by default.

Optional:

``` text
Lock aspect ratio
```

------------------------------------------------------------------------

## Image Crop

Provide a simple browser-based crop interface.

Possible options:

-   free crop
-   square
-   4:3
-   16:9
-   custom aspect ratio

------------------------------------------------------------------------

## Image Rotate

Support:

-   90° clockwise
-   90° counter-clockwise
-   180°
-   horizontal flip
-   vertical flip

------------------------------------------------------------------------

## Image Information

Show useful information before processing:

``` text
Filename
Format
Width
Height
Aspect Ratio
File Size
Color Type
```

Where available, also show:

-   EXIF metadata
-   camera information
-   orientation
-   capture date

------------------------------------------------------------------------

# Batch Processing

Batch operations are an important part of the project.

Users should be able to select multiple files and process them together.

Example:

``` text
IMG_001.jpg
IMG_002.jpg
IMG_003.jpg
IMG_004.jpg
IMG_005.jpg

        ↓

Convert to WebP

        ↓

ZIP
```

The application should avoid forcing users to repeat the same action
manually for every file.

------------------------------------------------------------------------

# Drag and Drop

Every suitable tool should support drag-and-drop.

Example:

``` text
┌─────────────────────────────────┐
│                                 │
│       Drop your files here      │
│                                 │
│       or click to browse        │
│                                 │
└─────────────────────────────────┘
```

The interface should also work normally without drag-and-drop.

------------------------------------------------------------------------

# Local Processing Architecture

The core idea is to keep processing entirely client-side.

A typical flow:

``` text
             ┌─────────────────┐
             │      User       │
             └────────┬────────┘
                      │
                      ▼
             ┌─────────────────┐
             │  File Picker /  │
             │   Drag & Drop   │
             └────────┬────────┘
                      │
                      ▼
             ┌─────────────────┐
             │    Browser      │
             │    Memory       │
             └────────┬────────┘
                      │
             ┌────────┴────────┐
             ▼                 ▼
      ┌─────────────┐   ┌─────────────┐
      │ PDF Engine  │   │ Image Engine│
      └──────┬──────┘   └──────┬──────┘
             │                 │
             └────────┬────────┘
                      ▼
             ┌─────────────────┐
             │   Web Worker    │
             │  when required  │
             └────────┬────────┘
                      │
                      ▼
             ┌─────────────────┐
             │ Generated Blob  │
             │      / File     │
             └────────┬────────┘
                      │
                      ▼
                 Download
```

------------------------------------------------------------------------

# Recommended Technology

The implementation can remain entirely frontend-based.

## Frontend

Recommended stack:

-   React
-   TypeScript
-   Vite
-   Tailwind CSS

React handles the application UI while TypeScript keeps the
file-processing code safer and easier to maintain.

------------------------------------------------------------------------

# PDF Libraries

## pdf-lib

[`pdf-lib`](https://github.com/Hopding/pdf-lib) is a strong candidate
for:

-   creating PDFs
-   modifying PDFs
-   merging PDFs
-   copying pages
-   removing pages
-   reordering pages
-   rotating pages
-   embedding images
-   manipulating metadata

It is particularly useful because it can run in the browser.

------------------------------------------------------------------------

## PDF.js

[`PDF.js`](https://github.com/mozilla/pdf.js) can be used for PDF
rendering and previews.

Useful for:

-   rendering PDF pages
-   generating thumbnails
-   displaying pages in the browser
-   PDF → image workflows

------------------------------------------------------------------------

# Image Processing

For many image operations, browser-native APIs are enough.

Possible technologies:

-   `Canvas`
-   `OffscreenCanvas`
-   `createImageBitmap`
-   `Blob`
-   `File`
-   `URL.createObjectURL()`

For heavier operations, image-processing libraries can be evaluated
later.

The goal should be:

> **Use browser-native functionality whenever it is good enough.**

There is no reason to add a huge dependency just to resize an image.

------------------------------------------------------------------------

# Web Workers

Large files can block the browser UI if processing happens on the main
thread.

For expensive operations, use Web Workers.

Example:

``` text
Main Thread
     │
     │ send file
     ▼
Web Worker
     │
     │ process
     ▼
Result
     │
     ▼
Main Thread
     │
     ▼
Download
```

This keeps the UI responsive while processing.

The application should show progress when an operation takes long enough
to justify it.

------------------------------------------------------------------------

# File Handling

The application should use browser APIs such as:

-   File API
-   Blob API
-   FileReader where required
-   ArrayBuffer
-   URL.createObjectURL
-   File System Access API where supported

Files should stay in memory or local browser storage only when
necessary.

Temporary object URLs should be revoked after use to prevent memory
leaks.

------------------------------------------------------------------------

# Privacy

## Files are not uploaded

The fundamental privacy promise is architectural:

> **Your files stay on your device.**

The application should not send file contents to an API.

That means the server, if deployed as a static site, only serves:

``` text
HTML
CSS
JavaScript
Assets
```

The actual file processing happens after the application loads.

------------------------------------------------------------------------

# Offline Support

A future version should support PWA functionality.

The goal:

``` text
Internet
   ↓
Open website once
   ↓
Assets cached
   ↓
Disconnect
   ↓
Keep using tools
```

This makes the application feel more like a local desktop utility rather
than a traditional online file-processing website.

------------------------------------------------------------------------

# Hosting

Because the core application is static, it can be deployed to
practically any static hosting platform.

Examples:

-   Cloudflare Pages
-   GitHub Pages
-   Netlify
-   Vercel
-   any static web server

No application server is required.

------------------------------------------------------------------------

# Why There Is No Backend

A backend introduces unnecessary complexity for the core use case.

Without a backend:

``` text
No server costs
No database
No file storage
No upload bandwidth
No processing infrastructure
No authentication
No account management
No cleanup jobs
No server-side file retention
```

This also makes the project easier to self-host.

------------------------------------------------------------------------

# When a Backend Might Be Needed

A backend should only be introduced if a future feature genuinely
requires server-side processing.

Examples could include:

-   DOCX → PDF using server-only software
-   advanced Office document conversion
-   extremely large files that exceed browser capabilities
-   cloud storage integrations
-   collaborative workflows
-   server-side OCR at a scale beyond browser capabilities

Even then, these should ideally be optional features rather than
changing the architecture of the entire project.

------------------------------------------------------------------------

# Security

Even though files remain local, the application should still follow
normal web security practices.

Important considerations:

-   never use `eval()` for file processing
-   avoid unsafe HTML rendering
-   validate file types
-   do not trust file extensions alone
-   handle malformed PDFs safely
-   handle corrupted images gracefully
-   prevent excessive memory usage where possible
-   revoke object URLs
-   avoid unnecessary third-party scripts
-   keep dependencies updated

Client-side processing does not automatically mean "secure."

------------------------------------------------------------------------

# Performance

Performance matters because file processing can become CPU- and
memory-intensive.

The application should:

-   avoid unnecessary copies of large ArrayBuffers
-   use Web Workers for expensive operations
-   generate thumbnails at reasonable resolutions
-   release references to processed files
-   revoke object URLs
-   process batches sequentially or with controlled concurrency
-   provide progress for long operations
-   avoid loading entire files multiple times when possible

For very large files, the UI should clearly explain that processing
depends on the user's available RAM and browser.

------------------------------------------------------------------------

# Quality

The project should prioritize **predictable output quality**.

For image conversion:

``` text
Input
  ↓
Decode
  ↓
User-selected processing
  ↓
Encode with explicit settings
  ↓
Output
```

The application should expose relevant quality controls instead of
silently choosing aggressive compression.

For example:

``` text
JPEG Quality
[ 80 ]

WebP Quality
[ 80 ]

PNG
Lossless
```

The original file should never be overwritten.

------------------------------------------------------------------------

# User Experience

The UI should be extremely simple.

A tool should generally follow:

``` text
Choose tool
     ↓
Drop/select files
     ↓
Configure options
     ↓
Preview
     ↓
Process
     ↓
Download
```

No account creation.

No onboarding.

No unnecessary dialogs.

No marketing pages getting in the way of the actual tool.

------------------------------------------------------------------------

# Suggested Application Structure

``` text
src/
├── components/
│   ├── FileDropzone/
│   ├── FileList/
│   ├── FilePreview/
│   ├── ProgressBar/
│   ├── DownloadButton/
│   └── ToolLayout/
│
├── features/
│   ├── pdf/
│   │   ├── merge/
│   │   ├── split/
│   │   ├── extract/
│   │   ├── delete/
│   │   ├── reorder/
│   │   ├── rotate/
│   │   ├── pdfToJpg/
│   │   ├── pdfToPng/
│   │   └── metadata/
│   │
│   └── images/
│       ├── convert/
│       ├── compress/
│       ├── resize/
│       ├── crop/
│       ├── rotate/
│       └── metadata/
│
├── workers/
│   ├── pdf.worker.ts
│   └── image.worker.ts
│
├── lib/
│   ├── pdf/
│   ├── image/
│   ├── file/
│   └── download/
│
├── routes/
├── hooks/
├── types/
└── utils/
```

The exact structure can change as the project grows.

The important part is keeping **UI code separate from processing
logic**.

------------------------------------------------------------------------

# Design Philosophy

The interface should feel like a utility rather than a SaaS product.

Avoid:

-   unnecessary gradients
-   fake dashboards
-   huge marketing sections
-   login prompts
-   pricing pages
-   "upgrade now" buttons
-   excessive animations
-   clutter

Prefer:

-   fast
-   clean
-   obvious
-   keyboard-friendly
-   responsive
-   accessible

The user came here to convert a file.

Let them convert the file.

------------------------------------------------------------------------

# Accessibility

The application should support:

-   keyboard navigation
-   visible focus states
-   accessible labels
-   screen-reader friendly controls
-   sufficient contrast
-   reduced-motion preferences
-   clear error messages

Drag-and-drop should always have a normal file-picker alternative.

------------------------------------------------------------------------

# Browser Compatibility

The application should target modern browsers.

Primary targets:

-   Chrome
-   Edge
-   Firefox
-   Safari

Some APIs, especially the File System Access API and advanced worker
capabilities, may not be available everywhere.

The application should progressively enhance rather than completely
break when an optional browser API is unavailable.

------------------------------------------------------------------------

# Error Handling

Errors should be understandable.

Bad:

``` text
Error: Failed to execute operation
```

Better:

``` text
This PDF could not be processed.

It may be corrupted, encrypted, or using a PDF feature
that this browser tool does not currently support.
```

The application should never silently produce a broken file.

------------------------------------------------------------------------

# Encryption / Password-Protected PDFs

Password-protected PDFs should be detected where possible.

If the selected library cannot safely process an encrypted PDF, clearly
tell the user instead of pretending the operation succeeded.

Future support may include:

-   password input
-   unlocking with the correct password
-   creating password-protected PDFs

These features should be added only when the underlying browser
libraries support them reliably.

------------------------------------------------------------------------

# Downloads

Downloads should use meaningful filenames.

Examples:

``` text
merged.pdf
compressed-image.jpg
converted-image.webp
extracted-pages.pdf
document-page-01.png
```

For batch operations:

``` text
converted-files.zip
```

The application should never force the user to manually rename every
output.

------------------------------------------------------------------------

# Testing

Each processing operation should have tests covering:

### Normal files

-   valid PDF
-   valid JPG
-   valid PNG
-   valid WebP

### Edge cases

-   empty file
-   corrupted file
-   very large file
-   single-page PDF
-   hundreds of PDF pages
-   transparent PNG
-   unusual image dimensions
-   duplicate filenames
-   files with spaces
-   files with Unicode filenames

### Output validation

Do not only test that a Blob was produced.

Where possible, verify that the resulting file can actually be opened
and contains the expected content.

------------------------------------------------------------------------

# Project Status

This project is intended to start small and grow organically.

Initial priority:

1.  JPG ↔ PNG
2.  JPG/PNG/WebP conversion
3.  Image compression
4.  Image resize
5.  Images → PDF
6.  PDF merge
7.  PDF split
8.  PDF page extraction
9.  PDF page deletion
10. PDF page reordering
11. PDF rotation
12. PDF → JPG/PNG

More advanced functionality can be added later.

------------------------------------------------------------------------

# Roadmap

## Phase 1 --- Image Utilities

-   [x] JPG → PNG
-   [x] PNG → JPG
-   [x] JPG → WebP
-   [x] PNG → WebP
-   [x] WebP → JPG
-   [x] WebP → PNG
-   [x] Image compression
-   [x] Image resize
-   [x] Image crop
-   [x] Image rotation
-   [x] Batch conversion
-   [x] ZIP downloads

## Phase 2 --- Basic PDF Utilities

-   [x] PDF merge
-   [x] PDF split
-   [x] PDF page extraction
-   [x] Delete PDF pages
-   [x] Reorder PDF pages
-   [x] Rotate PDF pages
-   [x] PDF → JPG
-   [x] PDF → PNG
-   [x] JPG → PDF
-   [x] PNG → PDF
-   [x] Image → PDF

## Phase 3 --- Better UX

-   [x] PDF page thumbnails
-   [x] Image previews
-   [x] Processing progress
-   [x] Better error messages
-   [ ] Keyboard shortcuts
-   [ ] Batch queues
-   [x] Drag-and-drop everywhere
-   [x] Dark/light themes

## Phase 4 --- Offline

-   [x] PWA
-   [x] Service worker
-   [x] Offline asset caching
-   [x] Installable desktop experience

## Phase 5 --- Advanced Utilities

Potential future tools:

-   [x] PDF metadata editor
-   [ ] PDF password protection
-   [ ] PDF page size tools
-   [ ] PDF image extraction
-   [ ] HEIC conversion
-   [ ] EXIF viewer/remover
-   [ ] SVG conversion utilities
-   [ ] OCR where browser performance is acceptable

------------------------------------------------------------------------

# Non-Goals

This project is **not** intended to become:

-   another SaaS subscription
-   an online file-storage service
-   a document management platform
-   a cloud drive
-   an advertising platform
-   an account-based product
-   a replacement for professional desktop publishing software

The project exists to solve annoying everyday file operations.

------------------------------------------------------------------------

# Open Source

This project is open source.

The source code is available so users can:

-   inspect how files are processed
-   verify that files are not being uploaded
-   self-host the application
-   modify tools
-   add new utilities
-   submit improvements
-   fork the project for personal use

------------------------------------------------------------------------

# Contributing

Contributions are welcome.

Before adding a feature, consider:

1.  Can it run completely in the browser?
2.  Does it actually solve a useful file-processing problem?
3.  Can it avoid adding a backend?
4.  Does it preserve the original file?
5.  Does it avoid unnecessary quality loss?
6.  Does it keep the UI simple?
7.  Does it introduce a reasonable dependency?

If the answer is yes, it probably belongs here.

------------------------------------------------------------------------

# Development

Install dependencies:

``` bash
npm install
```

Start the development server:

``` bash
npm run dev
```

Build the project:

``` bash
npm run build
```

Preview the production build:

``` bash
npm run preview
```

Run tests:

``` bash
npm test
```

The exact commands may change depending on the final project setup.

------------------------------------------------------------------------

# Philosophy

This project follows one simple idea:

> **File utilities shouldn't be this annoying.**

If a task can safely happen inside your browser, it should.

No uploading just to resize an image.

No account just to merge two PDFs.

No subscription just to convert a PNG.

No watermark because you used a free tool.

No ads covering the button you actually need.

Just:

``` text
Open
Drop
Process
Download
Done.
```

------------------------------------------------------------------------

# License

Choose a permissive open-source license appropriate for the project.

MIT is a good default if the intention is to allow people to freely use,
modify, distribute, and self-host the project.

If MIT is selected, add the standard MIT `LICENSE` file to the
repository.

------------------------------------------------------------------------

# Disclaimer

Browser-based processing has practical limitations.

Very large files or complex PDFs may require significant memory and CPU
resources. Browser support for specific formats and APIs can also vary.

The project should always communicate these limitations clearly rather
than introducing arbitrary limits.

------------------------------------------------------------------------

## The Goal

Build the little file toolbox **you wish existed every time you have to
deal with a stupid PDF or image conversion.**

Local.

Fast.

Free.

Open source.

No bullshit.
