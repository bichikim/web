/** @vitest-environment jsdom */
import {afterEach, expect, test, vi} from 'vitest'
import {writePsd} from 'ag-psd'
afterEach(() => vi.restoreAllMocks())
import {importPsd} from '../import-psd'

test('should reject a non PSD file without replacing the document', async () => {
  expect(await importPsd(new File(['text'], 'notes.txt'))).toEqual({
    error: {code: 'invalid-file'},
    ok: false,
  })
})

test('should reject a damaged PSD', async () => {
  expect(await importPsd(new File(['8BPS broken'], 'broken.psd'))).toEqual({
    error: {code: 'decode-failed'},
    ok: false,
  })
})

test.each([
  [100, 100],
  [4000, 7100],
])('should import a %i by %i canvas with bounded layer textures', async (width, height) => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    createImageData: (width: number, height: number) => ({
      data: new Uint8ClampedArray(width * height * 4),
      height,
      width,
    }),
    putImageData: vi.fn(),
  } as unknown as ReturnType<HTMLCanvasElement['getContext']>)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,test')
  const bytes = writePsd({
    children: [
      {
        imageData: {data: new Uint8ClampedArray(8 * 8 * 4).fill(255), height: 8, width: 8},
        left: 20,
        name: '눈',
        top: 30,
      },
    ],
    height: 100,
    width: 100,
  })
  // Change only the document bounds; importing skips the composite bitmap.
  const header = new DataView(bytes)
  header.setUint32(14, height)
  header.setUint32(18, width)
  const result = await importPsd(new File([bytes], 'model.psd'))
  expect(result.ok).toBe(true)
  if (!result.ok) {
    return
  }
  expect(result.document.viewport).toEqual({height, width})
  expect(result.document.scene?.roots[0]?.name).toBe('눈')
  expect(result.document.parts[0]?.mesh.vertices.slice(0, 2)).toEqual([20, 30])
  expect(result.document.parts[0]?.texture).toMatchObject({height: 8, width: 8})
})
