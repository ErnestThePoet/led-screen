import { describe, it, expect, vi, beforeEach } from 'vitest'
import { imageToPattern } from './imageToPattern'

describe('imageToPattern', () => {
  beforeEach(() => {
    // Mock OffscreenCanvas and createImageBitmap
    const mockCanvasContext = {
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue({
        data: new Uint8ClampedArray(4 * 4 * 2).fill(0), // 4 cols * 2 rows * 4 bytes per pixel
      }),
    }

    ;(globalThis as any).OffscreenCanvas = vi.fn().mockImplementation(() => ({
      getContext: vi.fn().mockReturnValue(mockCanvasContext),
    }))

    ;(globalThis as any).createImageBitmap = vi.fn().mockResolvedValue({
      width: 10,
      height: 10,
      close: vi.fn(),
    })
  })

  it('returns a 2D boolean array with correct dimensions', async () => {
    const mockFile = new File([''], 'test.png', { type: 'image/png' })

    const result = await imageToPattern(mockFile, 4, 2, 128)
    expect(result.length).toBe(2)       // rows
    expect(result[0].length).toBe(4)    // cols
    expect(typeof result[0][0]).toBe('boolean')
  })
})
