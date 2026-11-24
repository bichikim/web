/** @vitest-environment jsdom */
import {afterEach, expect, test, vi} from 'vitest'
import {createEmptyDocument} from '../../../create-empty-document'
import {getPartRenderFrame} from '../../../internal/render-plan'
import {createWgpuPicker} from '../create-picker'

afterEach(() => vi.restoreAllMocks())
test.each([
  {opacity: 0, visible: true},
  {opacity: 1, visible: false},
])(
  'should retain mask coverage independently of source display state (%j)',
  ({opacity, visible}) => {
    const mesh = {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: [0, 0, 1, 0, 0, 1]}
    const parts = [
      {id: 'mask', mesh, properties: {opacity}, texture: {height: 1, src: 'mask.png', width: 1}},
      {
        id: 'part',
        mesh,
        properties: {clippingMaskIds: ['mask']},
        texture: {height: 1, src: 'part.png', width: 1},
      },
    ]
    const source = {
      ...createEmptyDocument(),
      parts,
      scene: {
        roots: parts.map(({id}) => ({
          id,
          kind: 'part' as const,
          locked: false,
          name: id,
          visible: id === 'mask' ? visible : true,
        })),
      },
    }
    const frame = getPartRenderFrame(source)
    const context = {
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      getImageData: () => ({data: new Uint8ClampedArray([0, 0, 0, 255])}),
    } as unknown as CanvasRenderingContext2D
    const getContext = (kind: string) => (kind === '2d' ? context : null)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      getContext as HTMLCanvasElement['getContext'],
    )
    const picker = createWgpuPicker({
      canvas: document.createElement('canvas'),
      document: () => source,
      frame: () => frame,
      images: new Map(parts.map((part) => [part.texture.src, document.createElement('img')])),
      vertices: () => new Float32Array(mesh.vertices),
    })
    expect(picker({x: 0.25, y: 0.25})).toBe('part')
  },
)
