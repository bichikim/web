/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {useRenderingPreferences} from '../use-rendering-preferences'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

test('should persist rendering choices independently and restore them in a new workspace', () => {
  const first = renderHook(useRenderingPreferences)
  expect(first.result.preferences()).toEqual({antialiasing: 'auto', renderer: 'auto'})
  first.result.setRenderer('webgpu')
  first.result.setAntialiasing('msaa')
  first.cleanup()
  const restored = renderHook(useRenderingPreferences)
  expect(restored.result.preferences()).toEqual({antialiasing: 'msaa', renderer: 'webgpu'})
  expect(localStorage.length).toBe(1)
})

test.each(['{', '{"renderer":"other","antialiasing":"msaa"}', 'null'])(
  'should restore automatic choices for corrupt or unsupported saved settings: %s',
  (stored) => {
    localStorage.setItem('poffo:rendering:v1', stored)
    const {result} = renderHook(useRenderingPreferences)
    expect(result.preferences()).toEqual({antialiasing: 'auto', renderer: 'auto'})
  },
)

test('should apply an in-memory choice and expose persistence failure when storage is unavailable', () => {
  const {result} = renderHook(useRenderingPreferences)
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Denied', 'SecurityError')
  })
  result.setAntialiasing('ssaa')
  expect(result.preferences().antialiasing).toBe('ssaa')
  expect(result.error()).toBe('렌더링 설정을 저장하지 못했습니다.')
  result.dismissError()
  expect(result.error()).toBeNull()
})
