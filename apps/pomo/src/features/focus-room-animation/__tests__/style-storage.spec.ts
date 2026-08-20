/** @vitest-environment jsdom */

import {beforeEach, expect, it, vi} from 'vitest'

import {readPSceneStyle, writePSceneStyle} from '../style-storage'

beforeEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  localStorage.clear()
})

it('should default to the original style on the web', () => {
  vi.stubEnv('POMO_IS_APPS_IN_TOSS', '')

  expect(readPSceneStyle()).toBe('original')

  localStorage.setItem('pomo:focus-room-scene-style:v1', '"unknown"')
  expect(readPSceneStyle()).toBe('original')

  localStorage.setItem('pomo:focus-room-scene-style:v1', '{invalid')
  expect(readPSceneStyle()).toBe('original')
})

it('should default to the scribble style in Apps in Toss', () => {
  vi.stubEnv('POMO_IS_APPS_IN_TOSS', '1')

  expect(readPSceneStyle()).toBe('scribble')

  localStorage.setItem('pomo:focus-room-scene-style:v1', '"unknown"')
  expect(readPSceneStyle()).toBe('scribble')
})

it('should prefer a stored style over the runtime default', () => {
  vi.stubEnv('POMO_IS_APPS_IN_TOSS', '1')
  localStorage.setItem('pomo:focus-room-scene-style:v1', '"original"')
  expect(readPSceneStyle()).toBe('original')

  vi.stubEnv('POMO_IS_APPS_IN_TOSS', '')
  localStorage.setItem('pomo:focus-room-scene-style:v1', '"scribble"')
  expect(readPSceneStyle()).toBe('scribble')
})

it('should persist and restore both scene styles', () => {
  writePSceneStyle('scribble')
  expect(readPSceneStyle()).toBe('scribble')

  writePSceneStyle('original')
  expect(readPSceneStyle()).toBe('original')
})

it('should keep the preference usable when browser storage is unavailable', () => {
  vi.stubEnv('POMO_IS_APPS_IN_TOSS', '')
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('storage unavailable')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('storage unavailable')
  })

  expect(readPSceneStyle()).toBe('original')
  expect(() => writePSceneStyle('scribble')).not.toThrow()
})
