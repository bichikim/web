import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {useWidgetSilhouette} from '../use-widget-silhouette'

const OPAQUE = 255

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should encode once when two open widgets need the same silhouette', async () => {
  let stored: Blob | undefined
  const assetId = crypto.randomUUID()
  const load = async () => stored
  const save = vi.fn(async (_id: string, image: Blob) => {
    stored = image
  })
  const options = {assetId: () => assetId, load, save}
  const {result: first} = renderHook(() => useWidgetSilhouette(options))
  const {result: second} = renderHook(() => useWidgetSilhouette(options))
  const encode = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob')
  const data = new Uint8Array([OPAQUE])
  const frame = {data, height: 1, width: 1}

  await expect.poll(() => first.needsCapture() && second.needsCapture()).toBe(true)
  await Promise.all([first.capture(frame), second.capture(frame)])

  expect(encode).toHaveBeenCalledTimes(1)
  expect(save).toHaveBeenCalledExactlyOnceWith(assetId, stored)
  expect(first.silhouette()).toMatch(/^blob:/u)
  expect(second.silhouette()).toMatch(/^blob:/u)

  const inspect = vi.spyOn(data, 'some')
  expect(first.needsCapture() || second.needsCapture()).toBe(false)
  expect(first.capture(frame)).toBeUndefined()
  expect(second.capture(frame)).toBeUndefined()
  expect(inspect).not.toHaveBeenCalled()
})
