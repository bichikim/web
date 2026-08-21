/** @vitest-environment jsdom */

import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {readPSceneStyle, writePSceneStyle} from '../style-storage'

const storageMocks = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => Promise<string | null>>(),
  setItem: vi.fn<(key: string, value: string) => Promise<void>>(),
}))

vi.mock('@apps-in-toss/web-framework', () => ({
  Storage: storageMocks,
}))

beforeEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  localStorage.clear()
  storageMocks.getItem.mockReset()
  storageMocks.setItem.mockReset()
})

afterEach(() => {
  Reflect.deleteProperty(window, 'ReactNativeWebView')
})

it('should default to the original style on the web', async () => {
  vi.stubEnv('POMO_IS_APPS_IN_TOSS', '')

  expect(await readPSceneStyle()).toBe('original')

  localStorage.setItem('pomo:focus-room-scene-style:v1', '"unknown"')
  expect(await readPSceneStyle()).toBe('original')

  localStorage.setItem('pomo:focus-room-scene-style:v1', '{invalid')
  expect(await readPSceneStyle()).toBe('original')
})

it('should default to the scribble style in Apps in Toss', async () => {
  vi.stubEnv('POMO_IS_APPS_IN_TOSS', '1')

  expect(await readPSceneStyle()).toBe('scribble')

  localStorage.setItem('pomo:focus-room-scene-style:v1', '"unknown"')
  expect(await readPSceneStyle()).toBe('scribble')
})

it('should prefer a stored style over the runtime default', async () => {
  vi.stubEnv('POMO_IS_APPS_IN_TOSS', '1')
  localStorage.setItem('pomo:focus-room-scene-style:v1', '"original"')
  expect(await readPSceneStyle()).toBe('original')

  vi.stubEnv('POMO_IS_APPS_IN_TOSS', '')
  localStorage.setItem('pomo:focus-room-scene-style:v1', '"scribble"')
  expect(await readPSceneStyle()).toBe('scribble')
})

it('should persist and restore both scene styles', async () => {
  await writePSceneStyle('scribble')
  expect(await readPSceneStyle()).toBe('scribble')

  await writePSceneStyle('original')
  expect(await readPSceneStyle()).toBe('original')
})

it('should keep the preference usable when browser storage is unavailable', async () => {
  vi.stubEnv('POMO_IS_APPS_IN_TOSS', '')
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('storage unavailable')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('storage unavailable')
  })

  expect(await readPSceneStyle()).toBe('original')
  await expect(writePSceneStyle('scribble')).resolves.toBeUndefined()
})

it('should restore an Apps in Toss preference after browser storage is cleared', async () => {
  vi.stubEnv('POMO_IS_APPS_IN_TOSS', '1')
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  storageMocks.getItem.mockResolvedValue('"original"')

  expect(await readPSceneStyle()).toBe('original')
  expect(localStorage.getItem('pomo:focus-room-scene-style:v1')).toBe('"original"')
})

it('should preserve the latest choice while a native preference is loading', async () => {
  vi.stubEnv('POMO_IS_APPS_IN_TOSS', '1')
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  let completeRead: (value: string) => void = () => undefined
  storageMocks.getItem.mockReturnValue(
    new Promise((resolve) => {
      completeRead = resolve
    }),
  )
  storageMocks.setItem.mockResolvedValue()

  const pendingRead = readPSceneStyle()
  await writePSceneStyle('scribble')
  completeRead('"original"')

  expect(await pendingRead).toBe('scribble')
  expect(localStorage.getItem('pomo:focus-room-scene-style:v1')).toBe('"scribble"')
})

it('should preserve native write order during rapid preference changes', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  const nativeWrites: string[] = []
  storageMocks.setItem.mockImplementation(async (_key, value) => {
    nativeWrites.push(value)
  })

  await Promise.all([writePSceneStyle('scribble'), writePSceneStyle('original')])

  expect(nativeWrites).toEqual(['"scribble"', '"original"'])
})
