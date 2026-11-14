/** @vitest-environment jsdom */
import {afterEach, expect, test, vi} from 'vitest'
import {
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
} from '../../../player/document'
import {packTextureAtlas, unpackTextureAtlas} from '../texture-atlas-canvas'

const source = 'data:image/png;base64,AQID'
const createDocument = (): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parts: [
    {
      id: 'part',
      mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: [0, 0, 2, 0, 0, 2]},
      texture: {height: 2, src: source, width: 2},
    },
  ],
  scene: {roots: [{id: 'part', kind: 'part', locked: false, name: 'part', visible: true}]},
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 2, width: 2},
})
const setup = () => {
  vi.stubGlobal(
    'Image',
    class {
      src = ''
      decode() {
        return this.src.startsWith('data:')
          ? Promise.reject(new Error('URL too long'))
          : Promise.resolve()
      }
    },
  )
  const revoke = vi.fn()
  vi.stubGlobal('URL', {createObjectURL: vi.fn(() => 'blob:decoded'), revokeObjectURL: revoke})
  const drawImage = vi.fn()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage,
  } as unknown as ReturnType<HTMLCanvasElement['getContext']>)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,BAUG')
  return {drawImage, revoke}
}
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
test('should pack embedded images even when native data URL decoding fails', async () => {
  const {drawImage, revoke} = setup()
  const packed = await packTextureAtlas(createDocument())
  expect(packed.parts[0]?.texture.src).toBe('data:image/png;base64,BAUG')
  expect(packed.parts[0]?.texture.region).toMatchObject({height: 2, width: 2})
  expect(drawImage).toHaveBeenCalled()
  expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:decoded')
})
test('should unpack embedded atlas pages even when native data URL decoding fails', async () => {
  const {drawImage, revoke} = setup()
  const document = createDocument()
  const packed = {
    ...document,
    parts: document.parts.map((part) => ({
      ...part,
      texture: {...part.texture, region: {height: 2, width: 2, x: 0, y: 0}},
    })),
  }
  const unpacked = await unpackTextureAtlas(packed)
  expect(unpacked.parts[0]?.texture.region).toBeUndefined()
  expect(unpacked.parts[0]?.texture.src).toBe('data:image/png;base64,BAUG')
  expect(drawImage).toHaveBeenCalledWith(
    expect.objectContaining({src: 'blob:decoded'}),
    0,
    0,
    2,
    2,
    0,
    0,
    2,
    2,
  )
  expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:decoded')
})
