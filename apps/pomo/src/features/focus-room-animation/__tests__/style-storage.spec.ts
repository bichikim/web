/** @vitest-environment jsdom */

import {beforeEach, expect, it, vi} from 'vitest'

import {readPSceneStyle, writePSceneStyle} from '../style-storage'

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

it('should default to the original style when no valid preference exists', () => {
  expect(readPSceneStyle()).toBe('original')

  localStorage.setItem('pomo:focus-room-scene-style:v1', '"unknown"')
  expect(readPSceneStyle()).toBe('original')

  localStorage.setItem('pomo:focus-room-scene-style:v1', '{invalid')
  expect(readPSceneStyle()).toBe('original')
})

it('should persist and restore both scene styles', () => {
  writePSceneStyle('scribble')
  expect(readPSceneStyle()).toBe('scribble')

  writePSceneStyle('original')
  expect(readPSceneStyle()).toBe('original')
})

it('should keep the preference usable when browser storage is unavailable', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('storage unavailable')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('storage unavailable')
  })

  expect(readPSceneStyle()).toBe('original')
  expect(() => writePSceneStyle('scribble')).not.toThrow()
})
