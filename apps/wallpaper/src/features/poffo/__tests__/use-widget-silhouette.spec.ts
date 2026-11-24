/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {useWidgetSilhouette} from '../use-widget-silhouette'

afterEach(cleanup)

it('should skip alpha inspection while reading or reusing a saved silhouette', async () => {
  const stored = Promise.withResolvers<Blob>()
  const load = vi.fn(() => stored.promise)
  const save = vi.fn()
  const data = new Uint8Array([255])
  const inspect = vi.spyOn(data, 'some')
  const frame = {data, height: 1, width: 1}
  const {result} = renderHook(() => useWidgetSilhouette({assetId: () => 'character', load, save}))

  expect(load).toHaveBeenCalledExactlyOnceWith('character')
  expect(result.needsCapture()).toBe(false)
  expect(result.capture(frame)).toBeUndefined()

  stored.resolve(new Blob([], {type: 'image/png'}))
  await stored.promise
  expect(result.needsCapture()).toBe(false)
  expect(result.capture(frame)).toBeUndefined()
  expect(inspect).not.toHaveBeenCalled()
  expect(save).not.toHaveBeenCalled()
})
