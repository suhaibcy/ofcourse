// Turns PDF pages into photos in the browser, so a PDF goes through the same
// reading step as a picture. The PDF library is big, so it only loads when needed.
const MAX_SIDE = 1600

export async function pdfToImages(file: File, maxPages: number): Promise<{ images: string[]; totalPages: number }> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href
  const task = pdfjs.getDocument({ data: await file.arrayBuffer() })
  const pdf = await task.promise
  const images: string[] = []
  for (let number = 1; number <= Math.min(pdf.numPages, maxPages); number++) {
    const page = await pdf.getPage(number)
    const size = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: MAX_SIDE / Math.max(size.width, size.height) })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    await page.render({ canvas, viewport }).promise
    images.push(canvas.toDataURL('image/jpeg', 0.8))
  }
  const totalPages = pdf.numPages
  await task.destroy()
  return { images, totalPages }
}
