/**
 * Caches a pre-rendered OffscreenCanvas of all dim (unlit) LED dots for a given
 * board geometry.  On each frame, renderFrame can draw this in a single drawImage
 * call instead of constructing a 45 000-arc path from scratch.
 *
 * The cache is keyed by (width, height, dotSize, dotGap) and must be cleared
 * whenever those values change (handled via clearDimGridCache from LedCanvas).
 */

const dimGridCache = new Map<string, OffscreenCanvas>()

function dimGridKey(width: number, height: number, dotSize: number, dotGap: number): string {
  return `${width}:${height}:${dotSize}:${dotGap}`
}

function buildDimGrid(width: number, height: number, dotSize: number, dotGap: number): OffscreenCanvas {
  const step = dotSize + dotGap
  const radius = dotSize / 2
  const canvasW = width * step
  const canvasH = height * step

  const grid = new OffscreenCanvas(canvasW, canvasH)
  const ctx = grid.getContext('2d')!

  // Draw all unlit dots in a single batched path — identical to the old inline
  // loop in renderFrame, but executed only once per geometry change.
  ctx.beginPath()
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const cx = col * step + radius
      const cy = row * step + radius
      ctx.moveTo(cx + radius, cy)
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    }
  }
  ctx.fillStyle = '#1a1a1a'
  ctx.fill()

  return grid
}

export function getDimGrid(width: number, height: number, dotSize: number, dotGap: number): OffscreenCanvas {
  const key = dimGridKey(width, height, dotSize, dotGap)
  let grid = dimGridCache.get(key)
  if (!grid) {
    grid = buildDimGrid(width, height, dotSize, dotGap)
    dimGridCache.set(key, grid)
  }
  return grid
}

export function clearDimGridCache(): void {
  dimGridCache.clear()
}
