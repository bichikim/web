/** @vitest-environment jsdom */
import {fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test} from 'vitest'
import {EditorToast} from '../EditorToast'

test('should show only a supplied message and dismiss it with the close button', () => {
  const [message, setMessage] = createSignal<string>()
  const view = render(() => (
    <EditorToast message={message()} onDismiss={() => setMessage(undefined)} />
  ))
  expect(view.queryByRole('alert')).toBeNull()
  setMessage('자동 저장 실패 · JSON으로 내보내세요')
  expect(view.getByRole('alert')).toHaveTextContent('자동 저장 실패 · JSON으로 내보내세요')
  fireEvent.click(view.getByRole('button', {name: '알림 닫기'}))
  expect(view.queryByRole('alert')).toBeNull()
})

test('should preserve editing focus and restore it when Escape dismisses a focused toast', () => {
  const [message, setMessage] = createSignal<string>()
  const view = render(() => (
    <>
      <button>편집 계속</button>
      <EditorToast message={message()} onDismiss={() => setMessage(undefined)} />
    </>
  ))
  const editing = view.getByRole('button', {name: '편집 계속'})
  editing.focus()
  setMessage('자동 저장 실패')
  expect(editing).toHaveFocus()
  const close = view.getByRole('button', {name: '알림 닫기'})
  close.focus()
  fireEvent.keyDown(close, {key: 'Escape'})
  expect(view.queryByRole('alert')).toBeNull()
  expect(editing).toHaveFocus()
})
