/**
 * Converts an image File to a boolean[][] dot matrix.
 * @param file   Image file (PNG, JPG, etc.)
 * @param cols   Target dot columns (widget.width)
 * @param rows   Target dot rows (widget.height)
 * @param threshold  Grayscale threshold 0–255; pixels darker than this become lit (true)
 */
export async function imageToPattern(
  file: File,
  cols: number,
  rows: number,
  threshold: number
): Promise<boolean[][]> {
  const bitmap = await createImageBitmap(file)
  const canvas = new OffscreenCanvas(cols, rows)
  const ctx = canvas.getContext('2d')!

  ctx.drawImage(bitmap, 0, 0, cols, rows)
  bitmap.close()

  const imageData = ctx.getImageData(0, 0, cols, rows)
  const dots: boolean[][] = []

  for (let row = 0; row < rows; row++) {
    const rowArr: boolean[] = []
    for (let col = 0; col < cols; col++) {
      const i = (row * cols + col) * 4
      const r = imageData.data[i]
      const g = imageData.data[i + 1]
      const b = imageData.data[i + 2]
      const gray = 0.299 * r + 0.587 * g + 0.114 * b
      rowArr.push(gray < threshold)
    }
    dots.push(rowArr)
  }

  return dots
}
