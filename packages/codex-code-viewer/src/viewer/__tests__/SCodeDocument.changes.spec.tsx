/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {SCodeDocument} from '../SCodeDocument'
import {createLineChanges} from '../create-line-changes'

const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView')
beforeEach(() =>
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  }),
)
afterEach(() => {
  cleanup()
  if (originalScroll === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScroll)
  }
})
it('should expand removed content at the missing boundary while retaining source rows on both sides', () => {
  const source = 'before\nafter'
  const hunks = createLineChanges('before\nremoved\nafter', source)
  render(() => (
    <SCodeDocument
      document={{
        lines: [
          [{kind: 'plain', navigation: null, offset: 0, text: 'before'}],
          [{kind: 'plain', navigation: null, offset: 7, text: 'after'}],
        ],
        location: {
          column: 1,
          line: 1,
          path: 'main.txt',
        },
        revision: 'one',
        source,
      }}
      changes={hunks}
      inspection={{active: 0, base: 'HEAD', hunks, path: 'main.txt', source}}
      onFollow={vi.fn()}
    />
  ))
  const panel = screen.getByRole('region', {name: '변경 사항'})
  const host = panel.parentElement!
  expect(host.previousElementSibling).toContainElement(
    screen.getByRole('button', {name: '1줄 선택'}),
  )
  expect(host.nextElementSibling).toContainElement(screen.getByRole('button', {name: '2줄 선택'}))
  expect(screen.queryByRole('dialog')).toBeNull()
})
