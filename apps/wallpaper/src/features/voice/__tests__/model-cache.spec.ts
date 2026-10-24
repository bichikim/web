/** @vitest-environment jsdom */
import 'fake-indexeddb/auto'
import {afterEach, expect, it, vi} from 'vitest'
import Dexie from 'dexie'
import {createModelCache} from '../model-cache'

afterEach(async () => {
  vi.unstubAllGlobals()
  await Dexie.delete('wallpaper-voice-models')
})
it('should prepare model bytes from the persistent cache after the original cache closes', async () => {
  const data = Uint8Array.of(1, 2, 3).buffer
  const fetch = vi.fn().mockResolvedValue({arrayBuffer: async () => data, ok: true})
  vi.stubGlobal('fetch', fetch)
  const first = createModelCache()
  await expect(first.load('https://model.invalid/revision/model.onnx')).resolves.toEqual(data)
  first.close()
  const reopened = createModelCache()
  await expect(reopened.load('https://model.invalid/revision/model.onnx')).resolves.toEqual(data)
  reopened.close()
  expect(fetch).toHaveBeenCalledOnce()
})
