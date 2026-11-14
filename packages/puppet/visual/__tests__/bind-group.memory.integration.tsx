import {getTextureBatchBindGroup, TextureSource} from 'pixi.js'
import {expect, test} from 'vitest'
import {cdp} from 'vitest/browser'
import type {CDPSession} from '@vitest/browser-playwright'

const retireGroup = () => {
  const source = new TextureSource({height: 1, width: 1})
  const group = getTextureBatchBindGroup([source], 1, 2)
  const retained = new WeakRef(group)
  source.destroy()
  return retained
}

test('should release cached texture bind groups after their input texture is destroyed', async () => {
  const session: CDPSession = cdp()
  const retained = retireGroup()
  expect(retained.deref()).toBeDefined()
  await session.send('HeapProfiler.collectGarbage')
  expect(retained.deref()).toBeUndefined()
})

test('should preserve reuse and other live bind groups when one texture is destroyed', () => {
  const first = new TextureSource({height: 1, width: 1})
  const second = new TextureSource({height: 1, width: 1})
  const group = getTextureBatchBindGroup([second], 1, 2)
  getTextureBatchBindGroup([first, second], 2, 2)
  first.destroy()
  expect(getTextureBatchBindGroup([second], 1, 2)).toBe(group)
  expect(group.getResource(0)).toBe(second)
  second.destroy()
})
