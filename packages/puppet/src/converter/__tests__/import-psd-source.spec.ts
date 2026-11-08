/** @vitest-environment node */
import {afterEach, expect, test, vi} from 'vitest'
import {readPsd} from 'ag-psd'
import {importPsdSource} from '../import-psd-source'
import {createPsdDocument} from '../psd/create-psd-document'

vi.mock('ag-psd', () => ({readPsd: vi.fn()}))
vi.mock('../psd/create-psd-document', () => ({createPsdDocument: vi.fn()}))

afterEach(() => vi.resetAllMocks())

const source = () => ({
  name: 'model.psd',
  read: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
  size: 8,
})

test.each([
  ['notes.txt', 8, 'invalid-file'],
  ['large.psd', 268_435_457, 'too-large'],
])('should reject %s before reading its bytes', async (name, size, code) => {
  const input = {...source(), name, size}
  expect(await importPsdSource({encodeTexture: vi.fn(), source: input})).toEqual({
    error: {code},
    ok: false,
  })
  expect(input.read).not.toHaveBeenCalled()
})

test('should report source read failures without attempting to decode', async () => {
  const input = source()
  input.read.mockRejectedValue(new Error('file unavailable'))
  expect(await importPsdSource({encodeTexture: vi.fn(), source: input})).toEqual({
    error: {code: 'read-failed'},
    ok: false,
  })
  expect(readPsd).not.toHaveBeenCalled()
})

test('should report invalid PSD bytes as a decode failure', async () => {
  vi.mocked(readPsd).mockImplementation(() => {
    throw new Error('invalid PSD')
  })
  expect(await importPsdSource({encodeTexture: vi.fn(), source: source()})).toEqual({
    error: {code: 'decode-failed'},
    ok: false,
  })
})

test('should reject an unsupported color mode before creating layer textures', async () => {
  vi.mocked(readPsd).mockReturnValue({bitsPerChannel: 16, colorMode: 3, height: 8, width: 8})
  expect(await importPsdSource({encodeTexture: vi.fn(), source: source()})).toEqual({
    error: {code: 'unsupported-mode'},
    ok: false,
  })
  expect(createPsdDocument).not.toHaveBeenCalled()
})

test('should preserve a document conversion failure', async () => {
  vi.mocked(readPsd).mockReturnValue({bitsPerChannel: 8, colorMode: 3, height: 8, width: 8})
  vi.mocked(createPsdDocument).mockResolvedValue({error: {code: 'empty-document'}, ok: false})
  expect(await importPsdSource({encodeTexture: vi.fn(), source: source()})).toEqual({
    error: {code: 'empty-document'},
    ok: false,
  })
})

test('should preserve cancellation raised during a file read', async () => {
  const controller = new AbortController()
  const reason = new Error('cancelled')
  const input = source()
  input.read.mockImplementation(async () => {
    controller.abort(reason)
    throw reason
  })
  await expect(
    importPsdSource({encodeTexture: vi.fn(), signal: controller.signal, source: input}),
  ).rejects.toBe(reason)
  expect(readPsd).not.toHaveBeenCalled()
})

test('should not read a source when already cancelled', async () => {
  const input = source()
  const reason = new Error('cancelled')
  await expect(
    importPsdSource({encodeTexture: vi.fn(), signal: AbortSignal.abort(reason), source: input}),
  ).rejects.toBe(reason)
  expect(input.read).not.toHaveBeenCalled()
})

test('should retain the source identity and use the caller texture encoder', async () => {
  vi.mocked(readPsd).mockReturnValue({bitsPerChannel: 8, colorMode: 3, height: 8, width: 8})
  const encodeTexture = vi.fn().mockResolvedValue('data:image/png;base64,layer')
  vi.mocked(createPsdDocument).mockImplementation(async (_psd, encode) => ({
    document: {
      format: 'winter-love-poffo',
      motions: [],
      parts: [
        {
          id: 'eye',
          mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: [0, 0, 1, 0, 0, 1]},
          psdSource: {height: 1, path: ['eye'], width: 1, x: 0, y: 0},
          texture: {
            height: 1,
            src: await encode({data: new Uint8ClampedArray([0, 0, 0, 255]), height: 1, width: 1}),
            width: 1,
          },
        },
      ],
      version: 1,
      viewport: {height: 8, width: 8},
    },
    ok: true,
    warnings: ['layer warning'],
  }))
  const result = await importPsdSource({encodeTexture, source: {...source(), name: 'eyes.PSD'}})
  expect(result).toMatchObject({
    document: {
      parts: [
        {
          psdSource: {documentId: 'eyes.PSD', fileName: 'eyes.PSD'},
          texture: {src: 'data:image/png;base64,layer'},
        },
      ],
    },
    ok: true,
    warnings: ['layer warning'],
  })
  expect(encodeTexture).toHaveBeenCalledOnce()
})

test('should report texture conversion failures without returning a partial document', async () => {
  vi.mocked(readPsd).mockReturnValue({bitsPerChannel: 8, colorMode: 3, height: 8, width: 8})
  vi.mocked(createPsdDocument).mockRejectedValue(new Error('encoder failed'))
  expect(await importPsdSource({encodeTexture: vi.fn(), source: source()})).toEqual({
    error: {code: 'decode-failed'},
    ok: false,
  })
})

test('should preserve cancellation during texture conversion instead of returning success', async () => {
  const controller = new AbortController()
  const reason = new Error('cancelled')
  vi.mocked(readPsd).mockReturnValue({bitsPerChannel: 8, colorMode: 3, height: 8, width: 8})
  vi.mocked(createPsdDocument).mockImplementation(async () => {
    controller.abort(reason)
    return {error: {code: 'empty-document'}, ok: false}
  })
  await expect(
    importPsdSource({encodeTexture: vi.fn(), signal: controller.signal, source: source()}),
  ).rejects.toBe(reason)
})
