/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {useBufferingPreferences} from '../use-buffering-preferences'
afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

test('should default on and restore the user choice independently from model history', () => {
  const first = renderHook(useBufferingPreferences)
  expect(first.result.enabled()).toBe(true)
  first.result.setEnabled(false)
  first.cleanup()
  const second = renderHook(useBufferingPreferences)
  expect(second.result.enabled()).toBe(false)
  expect(localStorage.length).toBe(1)
})

test('should apply the in-memory switch and report an unavailable preference store', () => {
  const {result} = renderHook(useBufferingPreferences)
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Denied', 'SecurityError')
  })
  result.setEnabled(false)
  expect(result.enabled()).toBe(false)
  expect(result.error()).toBe('재생 버퍼 설정을 저장하지 못했습니다.')
})
