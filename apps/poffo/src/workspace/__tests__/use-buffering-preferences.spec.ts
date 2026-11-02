/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {expect, test} from 'vitest'
import {useBufferingPreferences} from '../use-buffering-preferences'

const createStorage = (): Pick<Storage, 'getItem' | 'setItem'> => {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem(key, value) {
      values.set(key, value)
    },
  }
}

test('should default on and restore the user choice independently from model history', () => {
  const storage = createStorage()
  const first = renderHook(() => useBufferingPreferences(storage))
  expect(first.result.enabled()).toBe(true)
  first.result.setEnabled(false)
  first.cleanup()
  const second = renderHook(() => useBufferingPreferences(storage))
  expect(second.result.enabled()).toBe(false)
  expect(storage.getItem('poffo:buffering:v1')).toBe('false')
})

test('should apply the in-memory switch and report an unavailable preference store', () => {
  const storage = {
    getItem: () => null,
    setItem() {
      throw new DOMException('Denied', 'SecurityError')
    },
  }
  const {result} = renderHook(() => useBufferingPreferences(storage))
  result.setEnabled(false)
  expect(result.enabled()).toBe(false)
  expect(result.error()).toBe('재생 버퍼 설정을 저장하지 못했습니다.')
  result.dismissError()
  expect(result.error()).toBeNull()
})

test('should report a read failure while allowing a later write to the supplied store', () => {
  let stored: string | undefined
  const storage = {
    getItem() {
      throw new DOMException('Denied', 'SecurityError')
    },
    setItem(_key: string, value: string) {
      stored = value
    },
  }
  const {result} = renderHook(() => useBufferingPreferences(storage))
  expect(result.enabled()).toBe(true)
  expect(result.error()).toBe('재생 버퍼 설정을 불러오지 못했습니다.')
  result.setEnabled(false)
  expect(stored).toBe('false')
})

test('should keep independent preference stores isolated', () => {
  const first = renderHook(() => useBufferingPreferences(createStorage()))
  first.result.setEnabled(false)
  const second = renderHook(() => useBufferingPreferences(createStorage()))
  expect(second.result.enabled()).toBe(true)
  expect(first.result.enabled()).toBe(false)
})

test.each(['{invalid', '0', '"false"', '{"enabled":false}'])(
  'should keep the default when the stored preference is invalid: %s',
  (value) => {
    const storage = createStorage()
    storage.setItem('poffo:buffering:v1', value)
    const {result} = renderHook(() => useBufferingPreferences(storage))
    expect(result.enabled()).toBe(true)
    expect(result.error()).toBeNull()
  },
)
