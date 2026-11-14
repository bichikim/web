/** @vitest-environment jsdom */
import {afterEach, expect, test, vi} from 'vitest'
import {loadTextureImage} from '../load-texture-image'
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
test('should retry an embedded image through a Blob URL and revoke the URL after decoding', async () => {
  const create = vi.fn((_blob: Blob) => 'blob:atlas')
  const revoke = vi.fn()
  vi.stubGlobal('URL', {createObjectURL: create, revokeObjectURL: revoke})
  const decode = vi.fn(function decode(this: {src: string}) {
    return this.src.startsWith('data:')
      ? Promise.reject(new Error('Cannot decode URL'))
      : Promise.resolve()
  })
  vi.stubGlobal(
    'Image',
    class {
      src = ''
      decode = decode
    },
  )
  const image = await loadTextureImage('data:image/png;base64,AQID')
  expect(image.src).toBe('blob:atlas')
  expect(decode).toHaveBeenCalledTimes(2)
  expect(create.mock.calls[0]?.[0]).toBeInstanceOf(Blob)
  expect(create.mock.calls[0]?.[0]).toMatchObject({size: 3, type: 'image/png'})
  expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:atlas')
})
test('should revoke the Blob URL even when its image also fails to decode', async () => {
  const revoke = vi.fn()
  vi.stubGlobal('URL', {createObjectURL: vi.fn(() => 'blob:atlas'), revokeObjectURL: revoke})
  const failure = new Error('Corrupt image')
  vi.stubGlobal(
    'Image',
    class {
      src = ''
      decode = vi.fn().mockRejectedValue(failure)
    },
  )
  await expect(loadTextureImage('data:image/png;base64,AQID')).rejects.toBe(failure)
  expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:atlas')
})
test('should preserve failures for external sources without retrying or allocating a Blob', async () => {
  const failure = new Error('Missing image')
  vi.stubGlobal(
    'Image',
    class {
      src = ''
      decode = vi.fn().mockRejectedValue(failure)
    },
  )
  await expect(loadTextureImage('missing.png')).rejects.toBe(failure)
})

test('should recover a valid embedded image whose base64 omits padding', async () => {
  const create = vi.fn((_blob: Blob) => 'blob:atlas')
  vi.stubGlobal('URL', {createObjectURL: create, revokeObjectURL: vi.fn()})
  vi.stubGlobal(
    'Image',
    class {
      src = ''
      decode() {
        return this.src.startsWith('data:')
          ? Promise.reject(new Error('URL decode failed'))
          : Promise.resolve()
      }
    },
  )
  const image = await loadTextureImage('data:image/png;base64,AQI')
  expect(image.src).toBe('blob:atlas')
  expect(create.mock.calls[0]?.[0]).toMatchObject({size: 2, type: 'image/png'})
})

test('should request images with CORS so they remain readable by canvas and WebGL', async () => {
  const assignments: Array<string | null> = []
  vi.stubGlobal(
    'Image',
    class {
      crossOrigin: string | null = null
      get src() {
        return ''
      }
      set src(_source: string) {
        assignments.push(this.crossOrigin)
      }
      decode = async () => {}
    },
  )
  await loadTextureImage('https://assets.example/image.png')
  expect(assignments).toEqual(['anonymous'])
})
