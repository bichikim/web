/** @vitest-environment jsdom */
import {afterEach, expect, test, vi} from 'vitest'
import {createPsdDocument} from '../psd-document'

const pixels = () => ({height: 8, data: new Uint8ClampedArray(8 * 8 * 4).fill(255), width: 8})
afterEach(() => vi.restoreAllMocks())

test('should retain layer hierarchy, paint order, names, offsets and visibility', () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    createImageData: (width: number, height: number) => ({
      height,
      data: new Uint8ClampedArray(width * height * 4),
      width,
    }),
    putImageData: vi.fn(),
  } as unknown as ReturnType<HTMLCanvasElement['getContext']>)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,test')
  const result = createPsdDocument({
    height: 80,
    children: [
      {hidden: true, name: '그룹', children: [{left: -2, name: '뒤', imageData: pixels(), top: 3}]},
      {left: 10, name: '기준', imageData: pixels(), top: 18},
      {left: 12, name: '앞', opacity: 0.5, top: 20, clipping: true, imageData: pixels()},
    ],
    width: 100,
  })
  expect(result.ok).toBe(true)
  if (!result.ok) {
    return
  }
  expect(result.document.scene?.roots.map((node) => node.name)).toEqual(['그룹', '기준', '앞'])
  expect(result.document.scene?.roots[0]).toMatchObject({
    children: [{name: '뒤'}],
    kind: 'group',
    visible: false,
  })
  expect(result.document.parts[2]?.mesh.vertices.slice(0, 2)).toEqual([12, 20])
  expect(result.document.parts[2]?.properties).toMatchObject({
    clippingMaskIds: [result.document.parts[1]?.id],
    opacity: 0.5,
  })
  expect(result.document.parts[0]?.mesh.vertices.slice(0, 2)).toEqual([-2, 3])
  expect(result.warnings).toEqual([])
})

test('should reject oversized layer bounds before decoding', () => {
  expect(
    createPsdDocument({height: 100, children: [{bottom: 100000, right: 100000}], width: 100}),
  ).toEqual({error: {code: 'too-large'}, ok: false})
})

test('should reject a document without usable pixel layers', () => {
  expect(createPsdDocument({height: 100, children: [{name: 'empty'}], width: 100})).toEqual({
    error: {code: 'empty-document'},
    ok: false,
  })
})

test('should connect group clipping bases and preserve nested clipping inside clipped groups', () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    createImageData: (width: number, height: number) => ({
      data: new Uint8ClampedArray(width * height * 4),
      height,
      width,
    }),
    putImageData: vi.fn(),
  } as unknown as ReturnType<HTMLCanvasElement['getContext']>)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,test')
  const result = createPsdDocument({
    width: 100,
    height: 100,
    children: [
      {
        name: 'base group',
        children: [
          {name: 'left', imageData: pixels()},
          {name: 'right', imageData: pixels()},
        ],
      },
      {
        name: 'clipped group',
        clipping: true,
        children: [
          {name: 'eye', imageData: pixels()},
          {name: 'shine', clipping: true, imageData: pixels()},
        ],
      },
      {name: 'shadow', clipping: true, imageData: pixels()},
    ],
  })
  expect(result.ok).toBe(true)
  if (!result.ok) {
    return
  }
  const [left, right, eye, shine, shadow] = result.document.parts
  expect(eye?.properties?.clippingMaskIds).toEqual([left?.id, right?.id])
  expect(shine?.properties?.clippingMaskIds).toEqual([eye?.id])
  expect(shadow?.properties?.clippingMaskIds).toEqual([left?.id, right?.id])
  expect(result.warnings).toEqual([])
})

test('should hide clipped pixels when their base group has no image', () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    createImageData: (width: number, height: number) => ({
      data: new Uint8ClampedArray(width * height * 4),
      height,
      width,
    }),
    putImageData: vi.fn(),
  } as unknown as ReturnType<HTMLCanvasElement['getContext']>)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,test')
  const result = createPsdDocument({
    children: [
      {imageData: pixels(), name: 'previous base'},
      {children: [], name: 'empty base'},
      {
        children: [{imageData: pixels(), name: 'clipped child'}],
        clipping: true,
        name: 'clipped group',
      },
    ],
    height: 100,
    width: 100,
  })
  expect(result.ok).toBe(true)
  if (!result.ok) {
    return
  }
  expect(result.document.parts[1]?.properties).toMatchObject({clippingMaskIds: [], opacity: 0})
  expect(result.warnings).toEqual(['기준 이미지가 없는 클리핑 레이어는 숨겼습니다.'])
})
