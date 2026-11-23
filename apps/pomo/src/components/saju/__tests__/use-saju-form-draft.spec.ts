/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import type {SajuFormDraft} from '../../../features/saju/form-draft-storage'
import {useSajuFormDraft} from '../use-saju-form-draft'

it('should keep the day choices stable when unrelated draft fields change', () => {
  const {cleanup, result} = renderHook(() => useSajuFormDraft({initialDate: '1995-03-16'}))
  const choices = result.dayOptions()

  result.changeDay('17')
  expect(result.selectedDay()).toBe('17')
  expect(result.dayOptions()).toBe(choices)

  result.updateDraft({question: '제 성향은 어떤가요?'})
  expect(result.dayOptions()).toBe(choices)
  cleanup()
})

it('should receive remote changes and apply a local edit to the newest shared draft', () => {
  let stored: SajuFormDraft | null = null
  const changes = new EventTarget()
  const receive = () => changes.dispatchEvent(new Event('change'))
  const unsubscribe = vi.fn()
  const persistence = {
    delete: () => {
      stored = null
    },
    read: () => stored,
    subscribe: (callback: () => void) => {
      changes.addEventListener('change', callback)
      return () => {
        changes.removeEventListener('change', callback)
        unsubscribe()
      }
    },
    write: (draft: SajuFormDraft) => {
      stored = draft
    },
  }
  const {cleanup, result} = renderHook(() =>
    useSajuFormDraft({initialDate: '1995-03-16', persistence}),
  )
  stored = {...result.draft(), question: '다른 탭 질문'}
  receive()
  expect(result.question()).toBe('다른 탭 질문')
  stored = {...stored, question: '아직 이벤트가 오지 않은 질문'}
  result.updateDraft({gender: 'F'})
  expect(stored).toMatchObject({gender: 'F', question: '아직 이벤트가 오지 않은 질문'})
  stored = null
  receive()
  expect(result.question()).toBe('')
  cleanup()
  expect(unsubscribe).toHaveBeenCalledOnce()
})
