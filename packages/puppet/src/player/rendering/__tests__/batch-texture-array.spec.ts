import {BatchTextureArray, TextureSource} from 'pixi.js'
import {expect, test} from 'vitest'

test('should bound texture lookup metadata when pooled batches see new sources', () => {
  const batch = new BatchTextureArray()
  for (const _iteration of Array.from({length: 100})) {
    const source = new TextureSource({height: 1, width: 1})
    batch.textures[0] = source
    batch.ids[source.uid] = 0
    batch.count = 1
    batch.clear()
    source.destroy()
  }
  expect(batch.count).toBe(0)
  expect(batch.textures[0]).toBeNull()
  expect(Object.keys(batch.ids)).toHaveLength(0)
})
