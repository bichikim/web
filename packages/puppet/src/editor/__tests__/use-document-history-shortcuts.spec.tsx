/** @vitest-environment jsdom */

import {render} from 'solid-js/web'
import {afterEach, describe, expect, test, vi} from 'vitest'

import {useDocumentHistoryShortcuts} from '../use-document-history-shortcuts'

afterEach(() => {
  document.body.replaceChildren()
})

describe('useDocumentHistoryShortcuts', () => {
  test('should preserve native undo inside a shadow-root input', () => {
    const onUndo = vi.fn(() => true)
    const host = document.createElement('div')
    const shadowRoot = host.attachShadow({mode: 'open'})
    document.body.append(host)
    const dispose = render(() => {
      useDocumentHistoryShortcuts({onRedo: () => false, onUndo})
      return <input aria-label="이름" />
    }, shadowRoot)
    const input = shadowRoot.querySelector('input')!

    input.dispatchEvent(
      new KeyboardEvent('keydown', {bubbles: true, composed: true, ctrlKey: true, key: 'z'}),
    )

    expect(onUndo).not.toHaveBeenCalled()
    dispose()
  })

  test('should route shortcuts only to the active editor instance', () => {
    const firstUndo = vi.fn(() => true)
    const secondUndo = vi.fn(() => true)
    const firstHost = document.createElement('div')
    const secondHost = document.createElement('div')
    document.body.append(firstHost, secondHost)
    const disposeFirst = render(() => {
      const activate = useDocumentHistoryShortcuts({onRedo: () => false, onUndo: firstUndo})
      return <button onPointerDown={activate}>첫 번째 편집기</button>
    }, firstHost)
    const disposeSecond = render(() => {
      const activate = useDocumentHistoryShortcuts({onRedo: () => false, onUndo: secondUndo})
      return <button onPointerDown={activate}>두 번째 편집기</button>
    }, secondHost)

    window.dispatchEvent(new KeyboardEvent('keydown', {ctrlKey: true, key: 'z'}))
    expect(firstUndo).toHaveBeenCalledOnce()
    expect(secondUndo).not.toHaveBeenCalled()

    secondHost
      .querySelector('button')!
      .dispatchEvent(new MouseEvent('pointerdown', {bubbles: true}))
    window.dispatchEvent(new KeyboardEvent('keydown', {ctrlKey: true, key: 'z'}))
    expect(firstUndo).toHaveBeenCalledOnce()
    expect(secondUndo).toHaveBeenCalledOnce()

    disposeFirst()
    disposeSecond()
  })
})
