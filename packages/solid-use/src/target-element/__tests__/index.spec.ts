/**
 * @vitest-environment jsdom
 */
import {describe, expect, it} from 'vitest'
import {createRoot} from 'solid-js'
import {useTargetElement} from '..'

describe('useTargetElement', () => {
  it('returns an element found by the selector when a string is passed', () => {
    createRoot(() => {
      const div = document.createElement('div')

      div.id = 'test'
      document.body.append(div)

      const target = useTargetElement(() => '#test')

      expect(target()).toBe(div)
      div.remove()
    })
  })

  it('HTMLElement를 전달하면 그대로 반환합니다', () => {
    createRoot(() => {
      const div = document.createElement('div')
      const target = useTargetElement(() => div)

      expect(target()).toBe(div)
    })
  })

  it('null을 전달하면 null을 반환합니다', () => {
    createRoot(() => {
      const target = useTargetElement(() => null)
      expect(target()).toBeNull()
    })
  })

  it('존재하지 않는 선택자를 전달하면 null을 반환합니다', () => {
    createRoot(() => {
      const target = useTargetElement(() => '#non-existent')
      expect(target()).toBeNull()
    })
  })
})
