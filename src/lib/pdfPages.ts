// Reads a PDF in the browser. Text is used when the PDF has it: it's faster and covers
// every page. A scan has no text, so its pages become photos for the reading step.
// The PDF library is big, so it only loads when needed.
const MAX_SIDE = 1600
const MIN_CHARS_PER_PAGE = 100 // less than this and it's probably a scan

export type PdfContents = { text: string; images: string[]; totalPages: number }

export async function readPdf(file: File, maxImagePages: number): Promise<PdfContents> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href
  const task = pdfjs.getDocument({ data: await file.arrayBuffer() })
  const pdf = await task.promise
  const totalPages = pdf.numPages

  let text = ''
  for (let number = 1; number <= totalPages; number++) {
    const content = await (await pdf.getPage(number)).getTextContent()
    text += content.items.map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '')).join('') + '\n\n'
  }
  if (text.replace(/\s/g, '').length >= totalPages * MIN_CHARS_PER_PAGE) {
    await task.destroy()
    return { text: text.trim(), images: [], totalPages }
  }

  const images: string[] = []
  for (let number = 1; number <= Math.min(totalPages, maxImagePages); number++) {
    const page = await pdf.getPage(number)
    const size = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: MAX_SIDE / Math.max(size.width, size.height) })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    await page.render({ canvas, viewport }).promise
    images.push(canvas.toDataURL('image/jpeg', 0.8))
  }
  await task.destroy()
  return { text: '', images, totalPages }
}
